package com.kevinlemein.backend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.kevinlemein.backend.dto.*;
import com.kevinlemein.backend.security.CurrentUserProvider;
import com.kevinlemein.backend.service.PrescriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Prescriptions", description = "Prescribing (which also dispenses and bills) and reading prescriptions")
@RestController
@RequestMapping("/api/prescriptions")
@RequiredArgsConstructor
public class PrescriptionController {

    private final PrescriptionService prescriptionService;
    private final CurrentUserProvider currentUserProvider;

    @Operation(summary = "Prescribe (dispense and bill)", description = "Doctor, on their own appointment. Deducts stock and adds the drug to the visit's bill, priced by the server from the drug catalogue (no price in the request). An identical retry returns the existing prescription with **200** (201 when created). Conflicts (409): `INSUFFICIENT_STOCK`, `DRUG_NOT_PRICED`, `ALREADY_PRESCRIBED`, `APPOINTMENT_NOT_ACTIVE`, `BILL_CANCELLED`.")
    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_DOCTOR')")
    public ResponseEntity<ApiResponse<PrescriptionResponse>> createPrescription(
            @Valid @RequestBody CreatePrescriptionRequest request
    ) {
        // This is users.id, not doctors.id -- PrescriptionService resolves
        // the doctors.id lookup internally (see its Javadoc for why).
        Long authenticatedUserId = currentUserProvider.getCurrentUserId();
        var result = prescriptionService.createPrescription(request, authenticatedUserId);
        // An identical retry replays the original (200) instead of dispensing again.
        return result.created()
                ? ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Prescription created", result.prescription()))
                : ResponseEntity.ok(ApiResponse.success("Prescription already recorded", result.prescription()));
    }

    /** Every prescription in the clinic: front desk only. Doctors use /mine. */
    @Operation(summary = "All prescriptions", description = "Receptionist, admin.")
    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_RECEPTIONIST', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<List<PrescriptionResponse>>> getAllPrescriptions() {
        return ResponseEntity.ok(ApiResponse.success("Prescriptions retrieved", prescriptionService.getAllPrescriptions()));
    }

    /** Prescriptions issued by the calling doctor, newest first. */
    @Operation(summary = "Prescriptions I issued", description = "Doctor. Newest first.")
    @GetMapping("/mine")
    @PreAuthorize("hasAuthority('ROLE_DOCTOR')")
    public ResponseEntity<ApiResponse<List<PrescriptionResponse>>> getMyPrescriptions() {
        return ResponseEntity.ok(ApiResponse.success("Prescriptions retrieved",
                prescriptionService.getPrescriptionsIssuedBy(currentUserProvider.getCurrentUserId())));
    }

    @Operation(summary = "One prescription", description = "Receptionist, admin, or the prescribing doctor.")
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_RECEPTIONIST', 'ROLE_ADMIN') or @prescriptionSecurity.isAuthor(#id)")
    public ResponseEntity<ApiResponse<PrescriptionResponse>> getPrescriptionById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Prescription retrieved", prescriptionService.getPrescriptionById(id)));
    }

    /** doctorId is a doctors.id (doctor profile), not a users.id. */
    @Operation(summary = "Prescriptions by doctor profile", description = "Receptionist, admin, or that doctor. `doctorId` is the doctor *profile* id (not the user id).")
    @GetMapping("/doctor/{doctorId}")
    @PreAuthorize("hasAnyAuthority('ROLE_RECEPTIONIST', 'ROLE_ADMIN') or @prescriptionSecurity.isOwnDoctorProfile(#doctorId)")
    public ResponseEntity<ApiResponse<List<PrescriptionResponse>>> getPrescriptionsByDoctor(@PathVariable Long doctorId) {
        return ResponseEntity.ok(ApiResponse.success("Prescriptions retrieved", prescriptionService.getPrescriptionsByDoctor(doctorId)));
    }

    /** For the front desk, the appointment's doctor, or its patient. */
    @Operation(summary = "Prescriptions for an appointment", description = "Receptionist, admin, the appointment's doctor, or its patient.")
    @GetMapping("/appointment/{appointmentId}")
    @PreAuthorize("hasAnyAuthority('ROLE_RECEPTIONIST', 'ROLE_ADMIN') or @appointmentSecurity.isParticipant(#appointmentId)")
    public ResponseEntity<ApiResponse<List<PrescriptionResponse>>> getPrescriptionsByAppointment(@PathVariable Long appointmentId) {
        return ResponseEntity.ok(ApiResponse.success("Prescriptions retrieved", prescriptionService.getPrescriptionsByAppointment(appointmentId)));
    }

    @Operation(summary = "Edit dosage, duration or notes", description = "The prescribing doctor. Drug and quantity can't be changed (delete and re-prescribe).")
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_DOCTOR')")
    public ResponseEntity<ApiResponse<PrescriptionResponse>> updatePrescription(
            @PathVariable Long id,
            @Valid @RequestBody UpdatePrescriptionRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success("Prescription updated", prescriptionService.updatePrescription(id, request, currentUserProvider.getCurrentUser())));
    }

    @Operation(summary = "Delete a prescription", description = "The prescribing doctor, or admin. Restores stock and removes its charge; refused (409 `BILL_HAS_PAYMENTS`) once the bill has payments.")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_DOCTOR', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deletePrescription(@PathVariable Long id) {
        prescriptionService.deletePrescription(id, currentUserProvider.getCurrentUser());
        return ResponseEntity.ok(ApiResponse.success("Prescription deleted", null));
    }
}