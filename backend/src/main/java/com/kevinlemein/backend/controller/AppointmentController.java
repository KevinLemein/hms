package com.kevinlemein.backend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.kevinlemein.backend.dto.ApiResponse;
import com.kevinlemein.backend.dto.AppointmentResponse;
import com.kevinlemein.backend.dto.BookAppointmentRequest;
import com.kevinlemein.backend.dto.DoctorResponse;
import com.kevinlemein.backend.dto.RescheduleAppointmentRequest;
import com.kevinlemein.backend.dto.UpdateAppointmentStatusRequest;
import com.kevinlemein.backend.model.Role;
import com.kevinlemein.backend.model.User;
import com.kevinlemein.backend.security.CurrentUserProvider;
import com.kevinlemein.backend.service.AppointmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@Tag(name = "Appointments", description = "Booking, queue and status changes")
@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;
    private final CurrentUserProvider currentUserProvider;

    /**
     * Book a new appointment (receptionist, or a patient for themself)
     */
    @Operation(summary = "Book an appointment", description = "Receptionist (any patient, `patientId` required) or patient (themself; `patientId` omitted or their own). Also creates the visit's bill with the consultation fee, in one transaction. Taken slot: 409 `SLOT_UNAVAILABLE`. Times are clinic local time (Africa/Nairobi), `yyyy-MM-ddTHH:mm:ss`.")
    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_RECEPTIONIST', 'ROLE_PATIENT')")
    public ResponseEntity<ApiResponse<AppointmentResponse>> bookAppointment(
            @Valid @RequestBody BookAppointmentRequest request
    ) {
        User actor = currentUserProvider.getCurrentUser();
        AppointmentResponse response = actor.getRole() == Role.ROLE_PATIENT
                ? appointmentService.bookAppointmentAsPatient(request, actor)
                : appointmentService.bookAppointment(request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Appointment booked successfully", response));
    }

    /**
     * Doctors a booking can be made with
     */
    @Operation(summary = "Doctors for booking", description = "Any signed-in user. Enabled doctors only; `id` is the value to send as `doctorId`.")
    @GetMapping("/doctors")
    @PreAuthorize("hasAnyAuthority('ROLE_PATIENT', 'ROLE_RECEPTIONIST', 'ROLE_ADMIN', 'ROLE_DOCTOR')")
    public ResponseEntity<ApiResponse<List<DoctorResponse>>> getDoctors() {
        return ResponseEntity.ok(ApiResponse.success("Doctors retrieved", appointmentService.getBookableDoctors()));
    }

    /**
     * Free start times for a doctor on a day
     */
    @Operation(summary = "A doctor's free slots", description = "Any signed-in user. Start times (`HH:mm`, clinic local time) not yet taken or past. Pass `ignoreAppointmentId` when rescheduling so that appointment's own slot counts as free.")
    @GetMapping("/doctor/{doctorId}/slots")
    @PreAuthorize("hasAnyAuthority('ROLE_PATIENT', 'ROLE_RECEPTIONIST', 'ROLE_ADMIN', 'ROLE_DOCTOR')")
    public ResponseEntity<ApiResponse<List<String>>> getAvailableSlots(
            @PathVariable Long doctorId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Long ignoreAppointmentId
    ) {
        return ResponseEntity.ok(ApiResponse.success("Available slots",
                appointmentService.getAvailableSlots(doctorId, date, ignoreAppointmentId)));
    }

    /**
     * Reschedule a pending or waiting appointment
     */
    @Operation(summary = "Reschedule an appointment", description = "Receptionist, admin, or the appointment's patient. Only PENDING or WAITING appointments (else 409 `INVALID_STATE_TRANSITION`); the doctor stays the same. Taken slot: 409 `SLOT_UNAVAILABLE`.")
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_RECEPTIONIST', 'ROLE_ADMIN') " +
            "or (hasAuthority('ROLE_PATIENT') and @appointmentSecurity.isParticipant(#id))")
    public ResponseEntity<ApiResponse<AppointmentResponse>> reschedule(
            @PathVariable Long id,
            @Valid @RequestBody RescheduleAppointmentRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success("Appointment rescheduled",
                appointmentService.rescheduleAppointment(id, request, currentUserProvider.getCurrentUser())));
    }

    /**
     * Update appointment status (doctor, receptionist, or the patient cancelling). Which transitions
     * each role may perform is enforced in AppointmentService.updateStatus.
     */
    @Operation(summary = "Change appointment status", description = "Receptionist/admin: any allowed transition. Doctor: own appointments, to IN_CONSULTATION or COMPLETED only. Patient: own appointments, to CANCELLED only. Lifecycle: PENDING -> WAITING | CANCELLED | NO_SHOW; WAITING -> IN_CONSULTATION | CANCELLED | NO_SHOW; IN_CONSULTATION -> COMPLETED. Invalid transition: 409 `INVALID_STATE_TRANSITION`.")
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyAuthority('ROLE_DOCTOR', 'ROLE_RECEPTIONIST', 'ROLE_ADMIN') " +
            "or (hasAuthority('ROLE_PATIENT') and @appointmentSecurity.isParticipant(#id))")
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