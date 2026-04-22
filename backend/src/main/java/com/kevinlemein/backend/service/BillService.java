package com.kevinlemein.backend.service;

import com.kevinlemein.backend.dto.*;
import com.kevinlemein.backend.model.*;
import com.kevinlemein.backend.repository.BillRepository;
import com.kevinlemein.backend.repository.AppointmentRepository;
import com.kevinlemein.backend.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BillService {

    private final BillRepository billRepository;
    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;

    /**
     * Create or update a bill from a prescription.
     * Called by the frontend after a prescription is created via the .NET API.
     * If a bill already exists for the appointment, the new item is added to it.
     */
    @Transactional
    public BillResponse createFromPrescription(CreateBillFromPrescriptionRequest request) {

        Appointment appointment = appointmentRepository.findById(request.getAppointmentId())
                .orElseThrow(() -> new RuntimeException("Appointment not found"));

        Patient patient = appointment.getPatient();
        if (patient == null) {
            throw new RuntimeException("Patient not found for this appointment");
        }

        // Find existing bill or create new one
        Bill bill = billRepository.findByAppointmentId(request.getAppointmentId())
                .orElseGet(() -> {
                    Bill newBill = Bill.builder()
                            .appointment(appointment)
                            .patient(patient)
                            .totalAmount(BigDecimal.ZERO)
                            .paymentStatus(PaymentStatus.PENDING)
                            .build();
                    return billRepository.save(newBill);
                });

        // Add prescription as a bill item
        BillDrugs item = BillDrugs.builder()
                .description(request.getDrugName())
                .quantity(request.getQuantity())
                .unitPrice(request.getUnitPrice())
                .totalPrice(request.getUnitPrice().multiply(BigDecimal.valueOf(request.getQuantity())))
                .drugId(request.getDrugId())
                .prescriptionId(request.getPrescriptionId())
                .build();

        bill.addItem(item);
        Bill saved = billRepository.save(bill);
        return mapToResponse(saved);
    }

    /**
     * Add an extra charge to an existing bill (receptionist adds consultation fee, lab fee, etc.)
     */
    @Transactional
    public BillResponse addItem(Long billId, AddBillItemRequest request) {

        Bill bill = billRepository.findById(billId)
                .orElseThrow(() -> new RuntimeException("Bill not found"));

        if (bill.getPaymentStatus() == PaymentStatus.PAID) {
            throw new RuntimeException("Cannot add items to a paid bill");
        }

        BillDrugs item = BillDrugs.builder()
                .description(request.getDescription())
                .quantity(request.getQuantity())
                .unitPrice(request.getUnitPrice())
                .totalPrice(request.getUnitPrice().multiply(BigDecimal.valueOf(request.getQuantity())))
                .build();

        bill.addItem(item);
        Bill saved = billRepository.save(bill);
        return mapToResponse(saved);
    }

    /**
     * Record a payment for a bill
     */
    @Transactional
    public BillResponse recordPayment(Long billId, RecordPaymentRequest request) {

        Bill bill = billRepository.findById(billId)
                .orElseThrow(() -> new RuntimeException("Bill not found"));

        if (bill.getPaymentStatus() == PaymentStatus.PAID) {
            throw new RuntimeException("Bill is already paid");
        }

        PaymentMethod method;
        try {
            method = PaymentMethod.valueOf(request.getPaymentMethod().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid payment method: " + request.getPaymentMethod());
        }

        // Validate M-Pesa reference
        if (method == PaymentMethod.MPESA && (request.getPaymentReference() == null || request.getPaymentReference().isBlank())) {
            throw new RuntimeException("M-Pesa transaction code is required");
        }

        bill.setPaymentMethod(method);
        bill.setPaymentReference(request.getPaymentReference());
        bill.setPaymentStatus(PaymentStatus.PAID);
        bill.setPaidAt(LocalDateTime.now());

        Bill saved = billRepository.save(bill);
        return mapToResponse(saved);
    }

    /**
     * Get all bills
     */
    public List<BillResponse> getAllBills() {
        return billRepository.findAllOrderByCreatedAtDesc()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get bills by payment status
     */
    public List<BillResponse> getBillsByStatus(String status) {
        PaymentStatus paymentStatus;
        try {
            paymentStatus = PaymentStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid status: " + status);
        }
        return billRepository.findByPaymentStatus(paymentStatus)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get bills by patient
     */
    public List<BillResponse> getBillsByPatient(Long patientId) {
        return billRepository.findByPatientId(patientId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get bill by appointment
     */
    public BillResponse getBillByAppointment(Long appointmentId) {
        Bill bill = billRepository.findByAppointmentId(appointmentId)
                .orElseThrow(() -> new RuntimeException("No bill found for this appointment"));
        return mapToResponse(bill);
    }

    /**
     * Get bill by ID
     */
    public BillResponse getBillById(Long id) {
        Bill bill = billRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bill not found"));
        return mapToResponse(bill);
    }

    private BillResponse mapToResponse(Bill bill) {
        Patient patient = bill.getPatient();
        User patientUser = patient.getUser();

        return BillResponse.builder()
                .id(bill.getId())
                .appointmentId(bill.getAppointment() != null ? bill.getAppointment().getId() : null)
                .patientId(patient.getId())
                .patientFirstName(patientUser.getFirstName())
                .patientLastName(patientUser.getLastName())
                .patientPhone(patient.getPhoneNumber())
                .totalAmount(bill.getTotalAmount())
                .paymentStatus(bill.getPaymentStatus().name())
                .paymentMethod(bill.getPaymentMethod() != null ? bill.getPaymentMethod().name() : null)
                .paymentReference(bill.getPaymentReference())
                .items(bill.getItems().stream().map(this::mapItemToResponse).collect(Collectors.toList()))
                .createdAt(bill.getCreatedAt())
                .paidAt(bill.getPaidAt())
                .build();
    }

    private BillItemResponse mapItemToResponse(BillDrugs item) {
        return BillItemResponse.builder()
                .id(item.getId())
                .description(item.getDescription())
                .quantity(item.getQuantity())
                .unitPrice(item.getUnitPrice())
                .totalPrice(item.getTotalPrice())
                .drugId(item.getDrugId())
                .prescriptionId(item.getPrescriptionId())
                .build();
    }
}