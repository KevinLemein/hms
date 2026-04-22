package com.kevinlemein.backend.controller;

import com.kevinlemein.backend.dto.*;
import com.kevinlemein.backend.service.BillService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bills")
@RequiredArgsConstructor
public class BillController {

    private final BillService billService;

    /**
     * Create or update bill from a prescription
     * Called by the frontend after a prescription is created via the .NET API
     */
    @PostMapping("/from-prescription")
    @PreAuthorize("hasAnyAuthority('ROLE_DOCTOR', 'ROLE_RECEPTIONIST', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<BillResponse>> createFromPrescription(
            @Valid @RequestBody CreateBillFromPrescriptionRequest request
    ) {
        try {
            BillResponse response = billService.createFromPrescription(request);
            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Bill created/updated from prescription", response));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Add extra charge to an existing bill (receptionist adds consultation fee, etc.)
     */
    @PostMapping("/{billId}/items")
    @PreAuthorize("hasAnyAuthority('ROLE_RECEPTIONIST', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<BillResponse>> addItem(
            @PathVariable Long billId,
            @Valid @RequestBody AddBillItemRequest request
    ) {
        try {
            BillResponse response = billService.addItem(billId, request);
            return ResponseEntity.ok(ApiResponse.success("Item added to bill", response));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Record payment for a bill
     */
    @PatchMapping("/{billId}/pay")
    @PreAuthorize("hasAnyAuthority('ROLE_RECEPTIONIST', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<BillResponse>> recordPayment(
            @PathVariable Long billId,
            @Valid @RequestBody RecordPaymentRequest request
    ) {
        try {
            BillResponse response = billService.recordPayment(billId, request);
            return ResponseEntity.ok(ApiResponse.success("Payment recorded", response));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Get all bills
     */
    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_RECEPTIONIST', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<List<BillResponse>>> getAllBills() {
        return ResponseEntity.ok(ApiResponse.success("Bills retrieved", billService.getAllBills()));
    }

    /**
     * Get bills by status (PENDING, PAID)
     */
    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyAuthority('ROLE_RECEPTIONIST', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<List<BillResponse>>> getBillsByStatus(@PathVariable String status) {
        try {
            return ResponseEntity.ok(ApiResponse.success("Bills retrieved", billService.getBillsByStatus(status)));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Get bill by appointment ID
     */
    @GetMapping("/appointment/{appointmentId}")
    @PreAuthorize("hasAnyAuthority('ROLE_DOCTOR', 'ROLE_RECEPTIONIST', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<BillResponse>> getBillByAppointment(@PathVariable Long appointmentId) {
        try {
            return ResponseEntity.ok(ApiResponse.success("Bill retrieved", billService.getBillByAppointment(appointmentId)));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Get bills by patient
     */
    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAnyAuthority('ROLE_DOCTOR', 'ROLE_RECEPTIONIST', 'ROLE_ADMIN', 'ROLE_PATIENT')")
    public ResponseEntity<ApiResponse<List<BillResponse>>> getBillsByPatient(@PathVariable Long patientId) {
        return ResponseEntity.ok(ApiResponse.success("Bills retrieved", billService.getBillsByPatient(patientId)));
    }

    /**
     * Get single bill by ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_RECEPTIONIST', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<BillResponse>> getBillById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(ApiResponse.success("Bill retrieved", billService.getBillById(id)));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}