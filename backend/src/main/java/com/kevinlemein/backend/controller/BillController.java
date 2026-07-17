package com.kevinlemein.backend.controller;

import com.kevinlemein.backend.dto.*;
import com.kevinlemein.backend.service.BillService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
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
        BillResponse response = billService.createFromPrescription(request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Bill created/updated from prescription", response));
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
        BillResponse response = billService.addItem(billId, request);
        return ResponseEntity.ok(ApiResponse.success("Item added to bill", response));
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
        BillResponse response = billService.recordPayment(billId, request);
        return ResponseEntity.ok(ApiResponse.success("Payment recorded", response));
    }

    /**
     * Get all bills (paginated — defaults to 20 per page, sorted newest first)
     */
    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_RECEPTIONIST', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<PagedResponse<BillResponse>>> getAllBills(
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(ApiResponse.success("Bills retrieved", billService.getAllBills(pageable)));
    }

    /**
     * Get bills by status (PENDING, PAID)
     */
    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyAuthority('ROLE_RECEPTIONIST', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<List<BillResponse>>> getBillsByStatus(@PathVariable String status) {
        return ResponseEntity.ok(ApiResponse.success("Bills retrieved", billService.getBillsByStatus(status)));
    }

    /**
     * Get bill by appointment ID
     */
    @GetMapping("/appointment/{appointmentId}")
    @PreAuthorize("hasAnyAuthority('ROLE_DOCTOR', 'ROLE_RECEPTIONIST', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<BillResponse>> getBillByAppointment(@PathVariable Long appointmentId) {
        return ResponseEntity.ok(ApiResponse.success("Bill retrieved", billService.getBillByAppointment(appointmentId)));
    }

    /**
     * Get bills by patient
     */
    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAnyAuthority('ROLE_DOCTOR', 'ROLE_RECEPTIONIST', 'ROLE_ADMIN') " +
            "or @patientSecurity.isOwnPatientId(#patientId)")
    public ResponseEntity<ApiResponse<List<BillResponse>>> getBillsByPatient(@PathVariable Long patientId) {
        return ResponseEntity.ok(ApiResponse.success("Bills retrieved", billService.getBillsByPatient(patientId)));
    }

    /**
     * Get single bill by ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_RECEPTIONIST', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<BillResponse>> getBillById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Bill retrieved", billService.getBillById(id)));
    }
}