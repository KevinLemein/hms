package com.kevinlemein.backend.service;

import com.kevinlemein.backend.dto.*;
import com.kevinlemein.backend.exception.InvalidRequestException;
import com.kevinlemein.backend.exception.ResourceNotFoundException;
import com.kevinlemein.backend.model.*;
import com.kevinlemein.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BillService {

    private final BillRepository billRepository;
    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;

    @Transactional
    public BillResponse createBill(CreateBillRequest request) {
        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));

        Appointment appointment = null;
        if (request.getAppointmentId() != null) {
            appointment = appointmentRepository.findById(request.getAppointmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Appointment not found"));

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

    /**
     * Add a charge to a bill. Idempotent by (source, sourceReferenceId) at the DB level —
     * calling this twice for the same dispensing record or consultation is a no-op,
     * not a duplicate charge, even under concurrent requests.
     */
    @Transactional
    public BillResponse addLineItem(Long billId, AddLineItemRequest request) {
        Bill bill = billRepository.findById(billId)
                .orElseThrow(() -> new ResourceNotFoundException("Bill not found"));

        if (bill.getStatus() == BillStatus.CANCELLED) {
            throw new InvalidRequestException("Cannot add charges to a cancelled bill");
        }
        if (bill.getStatus() == BillStatus.PAID) {
            throw new InvalidRequestException("Cannot add charges to a fully paid bill — create a new bill instead");
        }

        BillLineItem item = BillLineItem.builder()
                .bill(bill)
                .description(request.getDescription())
                .quantity(request.getQuantity())
                .unitPrice(request.getUnitPrice())
                .source(request.getSource())
                .sourceReferenceId(request.getSourceReferenceId())
                .build();

        bill.getLineItems().add(item);
        bill.recalculateStatus();

        try {
            billRepository.save(bill);
            billRepository.flush(); // force the unique-constraint check now, inside this try block
        } catch (DataIntegrityViolationException e) {
            // Someone already billed this exact source+reference (race condition or retry).
            // Not an error from the caller's perspective — return current state.
            return mapToResponse(billRepository.findById(billId).orElseThrow());
        }

        return mapToResponse(bill);
    }

    @Transactional
    public BillResponse recordPayment(Long billId, RecordPaymentRequest request, Long recordedByUserId) {
        Bill bill = billRepository.findById(billId)
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
        if (request.getAmount().compareTo(bill.getBalance()) > 0) {
            throw new InvalidRequestException(
                    "Payment amount (%.2f) exceeds outstanding balance (%.2f)"
                            .formatted(request.getAmount(), bill.getBalance()));
        }

        Payment payment = Payment.builder()
                .bill(bill)
                .amount(request.getAmount())
                .method(request.getMethod())
                .reference(request.getReference())
                .recordedByUserId(recordedByUserId)
                .build();

        bill.getPayments().add(payment);
        bill.recalculateStatus();

        return mapToResponse(billRepository.save(bill));
    }

    @Transactional
    public BillResponse cancelBill(Long billId, String reason) {
        Bill bill = billRepository.findById(billId)
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
                .reference(p.getReference()).paidAt(p.getPaidAt())
                .build();
    }
}