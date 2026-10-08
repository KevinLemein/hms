package com.kevinlemein.backend.controller;

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

@RestController
@RequestMapping("/api/bills")
@RequiredArgsConstructor
public class BillController {

    private final BillService billService;
    private final CurrentUserProvider currentUserProvider;

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_DOCTOR','ROLE_RECEPTIONIST','ROLE_PHARMACIST','ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<BillResponse>> createBill(@Valid @RequestBody CreateBillRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Bill created", billService.createBill(request)));
    }

    @PostMapping("/{billId}/items")
    @PreAuthorize("hasAnyAuthority('ROLE_DOCTOR','ROLE_RECEPTIONIST','ROLE_PHARMACIST','ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<BillResponse>> addItem(
            @PathVariable Long billId, @Valid @RequestBody AddLineItemRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Charge added", billService.addLineItem(billId, request)));
    }

    @PostMapping("/{billId}/payments")
    @PreAuthorize("hasAnyAuthority('ROLE_RECEPTIONIST','ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<BillResponse>> recordPayment(
            @PathVariable Long billId, @Valid @RequestBody RecordPaymentRequest request) {
        Long userId = currentUserProvider.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success("Payment recorded", billService.recordPayment(billId, request, userId)));
    }

    @PatchMapping("/{billId}/cancel")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<BillResponse>> cancelBill(
            @PathVariable Long billId, @RequestBody(required = false) String reason) {
        return ResponseEntity.ok(ApiResponse.success("Bill cancelled", billService.cancelBill(billId, reason)));
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_RECEPTIONIST','ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<PagedResponse<BillResponse>>> getAllBills(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Bills retrieved", billService.getAllBills(pageable)));
    }

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyAuthority('ROLE_RECEPTIONIST','ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<List<BillResponse>>> getBillsByStatus(@PathVariable String status) {
        return ResponseEntity.ok(ApiResponse.success("Bills retrieved", billService.getBillsByStatus(status)));
    }

    @GetMapping("/appointment/{appointmentId}")
    @PreAuthorize("hasAnyAuthority('ROLE_DOCTOR','ROLE_RECEPTIONIST','ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<BillResponse>> getBillByAppointment(@PathVariable Long appointmentId) {
        return ResponseEntity.ok(ApiResponse.success("Bill retrieved", billService.getBillByAppointment(appointmentId)));
    }

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAnyAuthority('ROLE_DOCTOR','ROLE_RECEPTIONIST','ROLE_ADMIN') or @patientSecurity.isOwnPatientId(#patientId)")
    public ResponseEntity<ApiResponse<List<BillResponse>>> getBillsByPatient(@PathVariable Long patientId) {
        return ResponseEntity.ok(ApiResponse.success("Bills retrieved", billService.getBillsByPatient(patientId)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_RECEPTIONIST','ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<BillResponse>> getBillById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Bill retrieved", billService.getBillById(id)));
    }
}