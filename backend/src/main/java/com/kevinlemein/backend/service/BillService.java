package com.kevinlemein.backend.service;

import com.kevinlemein.backend.exception.ErrorCodes;
import com.kevinlemein.backend.dto.*;
import com.kevinlemein.backend.exception.ConflictException;
import com.kevinlemein.backend.exception.DuplicateResourceException;
import com.kevinlemein.backend.exception.InvalidRequestException;
import com.kevinlemein.backend.exception.ResourceNotFoundException;
import com.kevinlemein.backend.model.*;
import com.kevinlemein.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BillService {

    private final BillRepository billRepository;
    private final BillLineItemRepository billLineItemRepository;
    private final PaymentRepository paymentRepository;
    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;

    @Transactional
    public BillResponse createBill(CreateBillRequest request) {
        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));

        Appointment appointment = null;
        if (request.getAppointmentId() != null) {
            // Locked so two concurrent requests for the same appointment can't
            // both see "no bill yet" and create two.
            appointment = appointmentRepository.findByIdForUpdate(request.getAppointmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Appointment not found"));

            if (!appointment.getPatient().getId().equals(patient.getId())) {
                throw new InvalidRequestException("Appointment does not belong to this patient");
            }

            // One bill per appointment — return the existing one instead of creating a duplicate.
            var existing = billRepository.findByAppointmentId(request.getAppointmentId());
            if (existing.isPresent()) {
                return mapToResponse(existing.get());
            }
        }

        Bill bill = Bill.builder()
                .patient(patient)
                .appointment(appointment)
                .status(BillStatus.OPEN)
                .build();

        return mapToResponse(billRepository.save(bill));
    }

    /** Charge sources only the server may create, priced from server-side data. */
    private static final Set<LineItemSource> SERVER_OWNED_SOURCES =
            EnumSet.of(LineItemSource.CONSULTATION, LineItemSource.DRUG_DISPENSE);

    /**
     * Staff-entered charge (POST /api/bills/{id}/items): MANUAL and LAB only.
     * Consultation fees are charged at booking and drug charges at
     * prescribing, both priced by the server; accepting them here would let
     * a client set their price.
     */
    @Transactional
    public BillResponse addLineItem(Long billId, AddLineItemRequest request) {
        if (SERVER_OWNED_SOURCES.contains(request.getSource())) {
            throw new InvalidRequestException(request.getSource() + " charges are created automatically and cannot be added manually");
        }
        return addSystemLineItem(billId, request);
    }

    /**
     * Add a charge to a bill (any source; for server-side callers). Idempotent
     * by (source, sourceReferenceId): repeating the same consultation/
     * dispensing/lab charge returns the bill unchanged instead of charging
     * twice. The bill row is locked, so retries against the same bill are
     * serialized; a race across different bills still hits the
     * uq_line_item_source constraint and is rejected (409).
     */
    @Transactional
    public BillResponse addSystemLineItem(Long billId, AddLineItemRequest request) {
        Bill bill = billRepository.findByIdForUpdate(billId)
                .orElseThrow(() -> new ResourceNotFoundException("Bill not found"));

        if (bill.getStatus() == BillStatus.CANCELLED) {
            throw new InvalidRequestException("Cannot add charges to a cancelled bill");
        }
        if (bill.getStatus() == BillStatus.PAID) {
            throw new InvalidRequestException("Cannot add charges to a fully paid bill — create a new bill instead");
        }

        if (request.getSourceReferenceId() != null
                && billLineItemRepository.existsBySourceAndSourceReferenceId(request.getSource(), request.getSourceReferenceId())) {
            // Already charged (retry or duplicate submission) — not an error, nothing to add.
            return mapToResponse(bill);
        }

        BillLineItem item = BillLineItem.builder()
                .description(request.getDescription())
                .quantity(request.getQuantity())
                .unitPrice(request.getUnitPrice())
                .source(request.getSource())
                .sourceReferenceId(request.getSourceReferenceId())
                .build();

        bill.addLineItem(item);

        return mapToResponse(billRepository.saveAndFlush(bill));
    }

    /**
     * Charges a dispensed prescription to its appointment's bill, priced from
     * drugs.cost (the caller has already validated the price and holds the
     * drug row lock). Must run inside the caller's transaction so the charge,
     * the prescription and the stock deduction commit or roll back together.
     *
     * Creates the appointment's bill if it has none. A PAID bill is reopened
     * (status recalculates to PARTIALLY_PAID) because medication dispensed
     * after the consultation fee was paid is a genuine new amount owed.
     * A CANCELLED bill can't take charges -> 409, which rolls back the
     * whole dispensing operation.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public BillLineItem chargeDispensedDrug(Appointment appointment, Prescription prescription, Drug drug) {
        // Look up only the id first: loading the entity unlocked and then
        // "re-locking" it would hand back the same (possibly stale) instance.
        Bill bill = billRepository.findIdByAppointmentId(appointment.getId())
                .flatMap(billRepository::findByIdForUpdate)
                .orElseGet(() -> billRepository.save(Bill.builder()
                        .patient(appointment.getPatient())
                        .appointment(appointment)
                        .status(BillStatus.OPEN)
                        .build()));

        if (bill.getStatus() == BillStatus.CANCELLED) {
            throw new ConflictException(ErrorCodes.BILL_CANCELLED, "The bill for this appointment is cancelled; medication cannot be charged to it");
        }

        BillLineItem item = BillLineItem.builder()
                .description(drug.getMilligrams() != null
                        ? "%s (%d mg)".formatted(drug.getName(), drug.getMilligrams())
                        : drug.getName())
                .quantity(prescription.getQuantity())
                .unitPrice(drug.getCost())
                .source(LineItemSource.DRUG_DISPENSE)
                .sourceReferenceId(prescription.getId())
                .build();

        bill.addLineItem(item);
        billRepository.saveAndFlush(bill);
        return item;
    }

    /** The DRUG_DISPENSE charge for a prescription, if one exists. */
    public Optional<BillLineItem> findDispensingCharge(Long prescriptionId) {
        return billLineItemRepository.findBySourceAndSourceReferenceId(LineItemSource.DRUG_DISPENSE, prescriptionId);
    }

    /**
     * Removes a prescription's DRUG_DISPENSE charge when the prescription is
     * deleted (inside the caller's transaction). Refused once any payment is
     * recorded on the bill: taking money back needs a refund flow, which
     * doesn't exist, so the charge (and the prescription) must stay.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void removeDispensingCharge(Long prescriptionId) {
        Optional<BillLineItem> charge = findDispensingCharge(prescriptionId);
        if (charge.isEmpty()) {
            return;
        }
        Bill bill = billRepository.findByIdForUpdate(charge.get().getBill().getId()).orElseThrow();
        if (bill.getAmountPaid().compareTo(BigDecimal.ZERO) > 0) {
            throw new ConflictException(ErrorCodes.BILL_HAS_PAYMENTS, "This prescription has been charged to a bill with payments recorded and cannot be deleted");
        }
        bill.getLineItems().removeIf(i -> i.getId().equals(charge.get().getId()));
        bill.recalculateStatus();
        billRepository.saveAndFlush(bill);
    }

    @Transactional
    public BillResponse recordPayment(Long billId, RecordPaymentRequest request, Long recordedByUserId) {
        // Locked so concurrent payments are checked against the balance one at a time.
        Bill bill = billRepository.findByIdForUpdate(billId)
                .orElseThrow(() -> new ResourceNotFoundException("Bill not found"));

        if (bill.getStatus() == BillStatus.CANCELLED) {
            throw new InvalidRequestException("Cannot record payment on a cancelled bill");
        }
        if (bill.getStatus() == BillStatus.PAID) {
            throw new InvalidRequestException("Bill is already fully paid");
        }
        if ((request.getMethod() == PaymentMethod.MPESA || request.getMethod() == PaymentMethod.CARD)
                && (request.getReference() == null || request.getReference().isBlank())) {
            throw new InvalidRequestException(request.getMethod() + " payments require a transaction reference");
        }
        // A transaction code identifies one real-world payment; recording it
        // twice (on this or any other bill) would double-count the money.
        if (request.getReference() != null && !request.getReference().isBlank()
                && paymentRepository.existsByMethodAndReferenceIgnoreCase(request.getMethod(), request.getReference().trim())) {
            throw new DuplicateResourceException(ErrorCodes.DUPLICATE_PAYMENT_REFERENCE, "This " + request.getMethod() + " reference has already been recorded");
        }
        if (request.getAmount().compareTo(bill.getBalance()) > 0) {
            throw new InvalidRequestException(
                    "Payment amount (%.2f) exceeds outstanding balance (%.2f)"
                            .formatted(request.getAmount(), bill.getBalance()));
        }

        Payment payment = Payment.builder()
                .bill(bill)
                .amount(request.getAmount())
                .method(request.getMethod())
                .reference(request.getReference() == null ? null : request.getReference().trim())
                .recordedByUserId(recordedByUserId)
                .build();

        bill.getPayments().add(payment);
        bill.recalculateStatus();

        return mapToResponse(billRepository.save(bill));
    }

    @Transactional
    public BillResponse cancelBill(Long billId, String reason) {
        Bill bill = billRepository.findByIdForUpdate(billId)
                .orElseThrow(() -> new ResourceNotFoundException("Bill not found"));

        if (bill.getAmountPaid().compareTo(BigDecimal.ZERO) > 0) {
            throw new InvalidRequestException("Cannot cancel a bill that already has payments recorded — refund instead");
        }

        bill.setStatus(BillStatus.CANCELLED);
        bill.setCancelReason(reason);
        return mapToResponse(billRepository.save(bill));
    }

    public PagedResponse<BillResponse> getAllBills(Pageable pageable) {
        Page<Bill> bills = billRepository.findAllByOrderByCreatedAtDesc(pageable);
        return PagedResponse.from(bills.map(this::mapToResponse));
    }

    public List<BillResponse> getBillsByStatus(String status) {
        BillStatus billStatus;
        try {
            billStatus = BillStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new InvalidRequestException("Invalid status: " + status);
        }
        return billRepository.findByStatus(billStatus).stream()
                .map(this::mapToResponse).collect(Collectors.toList());
    }

    public List<BillResponse> getBillsByPatient(Long patientId) {
        return billRepository.findByPatientId(patientId).stream()
                .map(this::mapToResponse).collect(Collectors.toList());
    }

    public BillResponse getBillByAppointment(Long appointmentId) {
        Bill bill = billRepository.findByAppointmentId(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("No bill found for this appointment"));
        return mapToResponse(bill);
    }

    public BillResponse getBillById(Long id) {
        return mapToResponse(billRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bill not found")));
    }

    private BillResponse mapToResponse(Bill bill) {
        Patient patient = bill.getPatient();
        User user = patient.getUser();

        return BillResponse.builder()
                .id(bill.getId())
                .appointmentId(bill.getAppointment() != null ? bill.getAppointment().getId() : null)
                .patientId(patient.getId())
                .patientFirstName(user.getFirstName())
                .patientLastName(user.getLastName())
                .patientPhone(patient.getPhoneNumber())
                .status(bill.getStatus().name())
                .totalAmount(bill.getTotalAmount())
                .amountPaid(bill.getAmountPaid())
                .balance(bill.getBalance())
                .lineItems(bill.getLineItems().stream().map(this::mapItem).collect(Collectors.toList()))
                .payments(bill.getPayments().stream().map(this::mapPayment).collect(Collectors.toList()))
                .createdAt(bill.getCreatedAt())
                .updatedAt(bill.getUpdatedAt())
                .build();
    }

    private LineItemResponse mapItem(BillLineItem i) {
        return LineItemResponse.builder()
                .id(i.getId()).description(i.getDescription()).quantity(i.getQuantity())
                .unitPrice(i.getUnitPrice()).totalPrice(i.getTotalPrice())
                .source(i.getSource().name()).sourceReferenceId(i.getSourceReferenceId())
                .createdAt(i.getCreatedAt())
                .build();
    }

    private PaymentResponse mapPayment(Payment p) {
        return PaymentResponse.builder()
                .id(p.getId()).amount(p.getAmount()).method(p.getMethod().name())
                .reference(p.getReference()).recordedByUserId(p.getRecordedByUserId()).paidAt(p.getPaidAt())
                .build();
    }
}