package com.kevinlemein.backend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.kevinlemein.backend.dto.ApiResponse;
import com.kevinlemein.backend.dto.AppointmentResponse;
import com.kevinlemein.backend.dto.BillResponse;
import com.kevinlemein.backend.dto.PrescriptionResponse;
import com.kevinlemein.backend.dto.PagedResponse;
import com.kevinlemein.backend.dto.PatientResponse;
import com.kevinlemein.backend.dto.RegisterPatientRequest;
import com.kevinlemein.backend.security.CurrentUserProvider;
import com.kevinlemein.backend.service.AppointmentService;
import com.kevinlemein.backend.service.BillService;
import com.kevinlemein.backend.service.PatientService;
import com.kevinlemein.backend.service.PrescriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Patients", description = "Patient records; `/me` endpoints for the signed-in patient")
@RestController
@RequestMapping("/api/patients")
@RequiredArgsConstructor
public class PatientController {

    private final PatientService patientService;
    private final AppointmentService appointmentService;
    private final PrescriptionService prescriptionService;
    private final BillService billService;
    private final CurrentUserProvider currentUserProvider;

    /**
     * Register a new patient (receptionist or admin)
     */
    @Operation(summary = "Register a patient", description = "Receptionist, admin. Creates the patient's sign-in account; the response contains `generatedPassword` once.")
    @PostMapping("/register")
    @PreAuthorize("hasAnyAuthority('ROLE_RECEPTIONIST', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<PatientResponse>> registerPatient(
            @Valid @RequestBody RegisterPatientRequest request
    ) {
        PatientResponse response = patientService.registerPatient(request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Patient registered successfully", response));
    }

    /**
     * Get all patients (paginated — defaults to 20 per page)
     */
    @Operation(summary = "List patients (paged)", description = "Receptionist, admin, doctor. Query: `page` (0-based), `size`, `sort`.")
    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_RECEPTIONIST', 'ROLE_ADMIN', 'ROLE_DOCTOR')")
    public ResponseEntity<ApiResponse<PagedResponse<PatientResponse>>> getAllPatients(
            @PageableDefault(size = 20) Pageable pageable
    ) {
        PagedResponse<PatientResponse> patients = patientService.getAllPatients(pageable);
        return ResponseEntity.ok(ApiResponse.success("Patients retrieved", patients));
    }

    // ---------- Patient self-service (/me) ----------
    // The patient is resolved from the token; no client-supplied ids, so a
    // patient can never reach another patient's records through these routes.

    @Operation(summary = "My profile", description = "Patient only. Resolved from the token; never takes an id.")
    @GetMapping("/me")
    @PreAuthorize("hasAuthority('ROLE_PATIENT')")
    public ResponseEntity<ApiResponse<PatientResponse>> getMyProfile() {
        return ResponseEntity.ok(ApiResponse.success("Patient retrieved", currentPatient()));
    }

    @Operation(summary = "My appointments", description = "Patient only. Newest first.")
    @GetMapping("/me/appointments")
    @PreAuthorize("hasAuthority('ROLE_PATIENT')")
    public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getMyAppointments() {
        return ResponseEntity.ok(ApiResponse.success("Patient appointments",
                appointmentService.getByPatient(currentPatient().getId())));
    }

    @Operation(summary = "My prescriptions", description = "Patient only. Includes drug name and prescribing doctor. Newest first.")
    @GetMapping("/me/prescriptions")
    @PreAuthorize("hasAuthority('ROLE_PATIENT')")
    public ResponseEntity<ApiResponse<List<PrescriptionResponse>>> getMyPrescriptions() {
        return ResponseEntity.ok(ApiResponse.success("Prescriptions retrieved",
                prescriptionService.getPrescriptionsForPatient(currentPatient().getId())));
    }

    @Operation(summary = "My bills", description = "Patient only. Line items, payments, balance.")
    @GetMapping("/me/bills")
    @PreAuthorize("hasAuthority('ROLE_PATIENT')")
    public ResponseEntity<ApiResponse<List<BillResponse>>> getMyBills() {
        return ResponseEntity.ok(ApiResponse.success("Bills retrieved",
                billService.getBillsByPatient(currentPatient().getId())));
    }

    private PatientResponse currentPatient() {
        return patientService.getPatientByUserId(currentUserProvider.getCurrentUserId());
    }

    /**
     * Get patient by ID
     */
    @Operation(summary = "Patient by id", description = "Receptionist, admin, doctor.")
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_RECEPTIONIST', 'ROLE_ADMIN', 'ROLE_DOCTOR')")
    public ResponseEntity<ApiResponse<PatientResponse>> getPatientById(@PathVariable Long id) {
        PatientResponse response = patientService.getPatientById(id);
        return ResponseEntity.ok(ApiResponse.success("Patient retrieved", response));
    }

    /**
     * Get patient by user ID (for patient dashboard)
     */
    @Operation(summary = "Patient by user id", description = "Staff, or the patient themself. Prefer `/api/patients/me` in patient apps.")
    @GetMapping("/by-user/{userId}")
    @PreAuthorize("hasAnyAuthority('ROLE_RECEPTIONIST', 'ROLE_ADMIN', 'ROLE_DOCTOR') " +
            "or @patientSecurity.isOwnUserId(#userId)")
    public ResponseEntity<ApiResponse<PatientResponse>> getPatientByUserId(@PathVariable Long userId) {
        PatientResponse response = patientService.getPatientByUserId(userId);
        return ResponseEntity.ok(ApiResponse.success("Patient retrieved", response));
    }

    /**
     * Search patients by name, email, or phone
     */
    @Operation(summary = "Search patients", description = "Receptionist, admin, doctor. Matches name, email or phone. Not paged.")
    @GetMapping("/search")
    @PreAuthorize("hasAnyAuthority('ROLE_RECEPTIONIST', 'ROLE_ADMIN', 'ROLE_DOCTOR')")
    public ResponseEntity<ApiResponse<List<PatientResponse>>> searchPatients(
            @RequestParam String query
    ) {
        List<PatientResponse> patients = patientService.searchPatients(query);
        return ResponseEntity.ok(ApiResponse.success("Search results", patients));
    }
}