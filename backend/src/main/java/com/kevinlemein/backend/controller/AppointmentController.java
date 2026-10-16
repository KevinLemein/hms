package com.kevinlemein.backend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.kevinlemein.backend.dto.ApiResponse;
import com.kevinlemein.backend.dto.AppointmentResponse;
import com.kevinlemein.backend.dto.BookAppointmentRequest;
import com.kevinlemein.backend.dto.UpdateAppointmentStatusRequest;
import com.kevinlemein.backend.security.CurrentUserProvider;
import com.kevinlemein.backend.service.AppointmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Appointments", description = "Booking, queue and status changes")
@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;
    private final CurrentUserProvider currentUserProvider;

    /**
     * Book a new appointment (receptionist only)
     */
    @Operation(summary = "Book an appointment", description = "Receptionist. Also creates the visit's bill with the consultation fee, in one transaction. Taken slot: 409 `SLOT_UNAVAILABLE`. Times are clinic local time (Africa/Nairobi), `yyyy-MM-ddTHH:mm:ss`.")
    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_RECEPTIONIST')")
    public ResponseEntity<ApiResponse<AppointmentResponse>> bookAppointment(
            @Valid @RequestBody BookAppointmentRequest request
    ) {
        AppointmentResponse response = appointmentService.bookAppointment(request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Appointment booked successfully", response));
    }

    /**
     * Update appointment status (doctor or receptionist). Which transitions
     * each role may perform is enforced in AppointmentService.updateStatus.
     */
    @Operation(summary = "Change appointment status", description = "Receptionist/admin: any allowed transition. Doctor: own appointments, to IN_CONSULTATION or COMPLETED only. Lifecycle: PENDING -> WAITING | CANCELLED | NO_SHOW; WAITING -> IN_CONSULTATION | CANCELLED | NO_SHOW; IN_CONSULTATION -> COMPLETED. Invalid transition: 409 `INVALID_STATE_TRANSITION`.")
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyAuthority('ROLE_DOCTOR', 'ROLE_RECEPTIONIST', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<AppointmentResponse>> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateAppointmentStatusRequest body
    ) {
        AppointmentResponse response = appointmentService.updateStatus(
                id, body.getStatus(), body.getNotes(), currentUserProvider.getCurrentUser());
        return ResponseEntity.ok(ApiResponse.success("Status updated", response));
    }

    /**
     * Get all appointments (admin/receptionist)
     */
    @Operation(summary = "All appointments", description = "Receptionist, admin. Not paged.")
    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_RECEPTIONIST', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getAllAppointments() {
        return ResponseEntity.ok(ApiResponse.success("Appointments retrieved",
                appointmentService.getAllAppointments()));
    }

    /**
     * Get today's appointments for all doctors (admin/receptionist).
     * Doctors use /doctor/{doctorId}/today for their own day.
     */
    @Operation(summary = "Today's appointments (all doctors)", description = "Receptionist, admin. 'Today' is the clinic's date.")
    @GetMapping("/today")
    @PreAuthorize("hasAnyAuthority('ROLE_RECEPTIONIST', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getTodayAppointments() {
        return ResponseEntity.ok(ApiResponse.success("Today's appointments",
                appointmentService.getTodayAppointments()));
    }

    /**
     * Get appointments by doctor (doctorId is the doctor's users.id).
     * Doctors may only read their own schedule.
     */
    @Operation(summary = "A doctor's appointments", description = "Receptionist, admin, or that doctor (`doctorId` is the doctor's user id).")
    @GetMapping("/doctor/{doctorId}")
    @PreAuthorize("hasAnyAuthority('ROLE_RECEPTIONIST', 'ROLE_ADMIN') " +
            "or (hasAuthority('ROLE_DOCTOR') and @appointmentSecurity.isCurrentUser(#doctorId))")
    public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getByDoctor(@PathVariable Long doctorId) {
        return ResponseEntity.ok(ApiResponse.success("Doctor appointments",
                appointmentService.getByDoctor(doctorId)));
    }

    /**
     * Get today's appointments for a specific doctor
     */
    @Operation(summary = "A doctor's appointments today", description = "Receptionist, admin, or that doctor.")
    @GetMapping("/doctor/{doctorId}/today")
    @PreAuthorize("hasAnyAuthority('ROLE_RECEPTIONIST', 'ROLE_ADMIN') " +
            "or (hasAuthority('ROLE_DOCTOR') and @appointmentSecurity.isCurrentUser(#doctorId))")
    public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getTodayByDoctor(@PathVariable Long doctorId) {
        return ResponseEntity.ok(ApiResponse.success("Today's appointments",
                appointmentService.getTodayByDoctor(doctorId)));
    }

    /**
     * Get appointments by patient
     */
    @Operation(summary = "A patient's appointments", description = "Staff, or the patient themself. Prefer `/api/patients/me/appointments` in patient apps.")
    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAnyAuthority('ROLE_DOCTOR', 'ROLE_RECEPTIONIST', 'ROLE_ADMIN') " +
            "or @patientSecurity.isOwnPatientId(#patientId)")
    public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getByPatient(@PathVariable Long patientId) {
        return ResponseEntity.ok(ApiResponse.success("Patient appointments",
                appointmentService.getByPatient(patientId)));
    }

    /**
     * Get single appointment: front desk, the assigned doctor, or the patient.
     */
    @Operation(summary = "One appointment", description = "Receptionist, admin, the appointment's doctor, or its patient.")
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_RECEPTIONIST', 'ROLE_ADMIN') " +
            "or @appointmentSecurity.isParticipant(#id)")
    public ResponseEntity<ApiResponse<AppointmentResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Appointment retrieved",
                appointmentService.getById(id)));
    }
}