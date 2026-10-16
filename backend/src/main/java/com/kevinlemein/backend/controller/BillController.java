package com.kevinlemein.backend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.kevinlemein.backend.dto.*;
import com.kevinlemein.backend.service.BillService;
import com.kevinlemein.backend.security.CurrentUserProvider; // adjust to however you currently resolve the logged-in user id
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Billing", description = "Bills, staff-entered charges and payments")
@RestController
@RequestMapping("/api/bills")
@RequiredArgsConstructor
public class BillController {

    private final BillService billService;
    private final CurrentUserProvider currentUserProvider;

    @Operation(summary = "Create a bill", description = "Doctor, receptionist, admin. Returns the existing bill if the appointment already has one.")
    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_DOCTOR','ROLE_RECEPTIONIST','ROLE_PHARMACIST','ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<BillResponse>> createBill(@Valid @RequestBody CreateBillRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Bill created", billService.createBill(request)));
    }

    @Operation(summary = "Add a staff-entered charge", description = "Doctor, receptionist, admin. `source` MANUAL or LAB only; consultation and medication charges are created by the server. Repeating the same (source, sourceReferenceId) is a no-op.")
    @PostMapping("/{billId}/items")
    @PreAuthorize("hasAnyAuthority('ROLE_DOCTOR','ROLE_RECEPTIONIST','ROLE_PHARMACIST','ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<BillResponse>> addItem(
            @PathVariable Long billId, @Valid @RequestBody AddLineItemRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Charge added", billService.addLineItem(billId, request)));
    }

    @Operation(summary = "Record a payment", description = "Receptionist, admin. `reference` required for MPESA and CARD; a reference already recorded: 409 `DUPLICATE_PAYMENT_REFERENCE`; more than the balance: 400.")
    @PostMapping("/{billId}/payments")
    @PreAuthorize("hasAnyAuthority('ROLE_RECEPTIONIST','ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<BillResponse>> recordPayment(
            @PathVariable Long billId, @Valid @RequestBody RecordPaymentRequest request) {
        Long userId = currentUserProvider.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success("Payment recorded", billService.recordPayment(billId, request, userId)));
    }

    @Operation(summary = "Cancel a bill", description = "Admin. Not allowed once payments exist. Body: optional plain-text reason.")
    @PatchMapping("/{billId}/cancel")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<BillResponse>> cancelBill(
            @PathVariable Long billId, @RequestBody(required = false) String reason) {
        return ResponseEntity.ok(ApiResponse.success("Bill cancelled", billService.cancelBill(billId, reason)));
    }

    @Operation(summary = "List bills (paged)", description = "Receptionist, admin. Newest first. Query: `page`, `size`.")
    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_RECEPTIONIST','ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<PagedResponse<BillResponse>>> getAllBills(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Bills retrieved", billService.getAllBills(pageable)));
    }

    @Operation(summary = "Bills by status", description = "Receptionist, admin. Status: OPEN, PARTIALLY_PAID, PAID, CANCELLED. Not paged.")
    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyAuthority('ROLE_RECEPTIONIST','ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<List<BillResponse>>> getBillsByStatus(@PathVariable String status) {
        return ResponseEntity.ok(ApiResponse.success("Bills retrieved", billService.getBillsByStatus(status)));
    }

    @Operation(summary = "Bill for an appointment", description = "Doctor, receptionist, admin.")
    @GetMapping("/appointment/{appointmentId}")
    @PreAuthorize("hasAnyAuthority('ROLE_DOCTOR','ROLE_RECEPTIONIST','ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<BillResponse>> getBillByAppointment(@PathVariable Long appointmentId) {
        return ResponseEntity.ok(ApiResponse.success("Bill retrieved", billService.getBillByAppointment(appointmentId)));
    }

    @Operation(summary = "A patient's bills", description = "Staff, or the patient themself. Prefer `/api/patients/me/bills` in patient apps.")
    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAnyAuthority('ROLE_DOCTOR','ROLE_RECEPTIONIST','ROLE_ADMIN') or @patientSecurity.isOwnPatientId(#patientId)")
    public ResponseEntity<ApiResponse<List<BillResponse>>> getBillsByPatient(@PathVariable Long patientId) {
        return ResponseEntity.ok(ApiResponse.success("Bills retrieved", billService.getBillsByPatient(patientId)));
    }

    @Operation(summary = "One bill", description = "Receptionist, admin.")
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_RECEPTIONIST','ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<BillResponse>> getBillById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Bill retrieved", billService.getBillById(id)));
    }
}