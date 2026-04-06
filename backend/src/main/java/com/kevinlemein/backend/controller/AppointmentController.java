package com.kevinlemein.backend.controller;

import com.kevinlemein.backend.dto.ApiResponse;
import com.kevinlemein.backend.dto.AppointmentResponse;
import com.kevinlemein.backend.dto.BookAppointmentRequest;
import com.kevinlemein.backend.service.AppointmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;

    /**
     * Book a new appointment (receptionist only)
     */
    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_RECEPTIONIST')")
    public ResponseEntity<ApiResponse<AppointmentResponse>> bookAppointment(
            @Valid @RequestBody BookAppointmentRequest request
    ) {
        try {
            AppointmentResponse response = appointmentService.bookAppointment(request);
            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Appointment booked successfully", response));
        } catch (RuntimeException e) {
            return ResponseEntity
                    .badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Update appointment status (doctor or receptionist)
     */
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyAuthority('ROLE_DOCTOR', 'ROLE_RECEPTIONIST', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<AppointmentResponse>> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body
    ) {
        try {
            String status = body.get("status");
            String notes = body.get("notes");
            AppointmentResponse response = appointmentService.updateStatus(id, status, notes);
            return ResponseEntity.ok(ApiResponse.success("Status updated", response));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Get all appointments (admin/receptionist)
     */
    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_RECEPTIONIST', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getAllAppointments() {
        return ResponseEntity.ok(ApiResponse.success("Appointments retrieved",
                appointmentService.getAllAppointments()));
    }

    /**
     * Get today's appointments (admin/receptionist)
     */
    @GetMapping("/today")
    @PreAuthorize("hasAnyAuthority('ROLE_DOCTOR', 'ROLE_RECEPTIONIST', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getTodayAppointments() {
        return ResponseEntity.ok(ApiResponse.success("Today's appointments",
                appointmentService.getTodayAppointments()));
    }

    /**
     * Get appointments by doctor
     */
    @GetMapping("/doctor/{doctorId}")
    @PreAuthorize("hasAnyAuthority('ROLE_DOCTOR', 'ROLE_RECEPTIONIST', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getByDoctor(@PathVariable Long doctorId) {
        return ResponseEntity.ok(ApiResponse.success("Doctor appointments",
                appointmentService.getByDoctor(doctorId)));
    }

    /**
     * Get today's appointments for a specific doctor
     */
    @GetMapping("/doctor/{doctorId}/today")
    @PreAuthorize("hasAnyAuthority('ROLE_DOCTOR', 'ROLE_RECEPTIONIST', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getTodayByDoctor(@PathVariable Long doctorId) {
        return ResponseEntity.ok(ApiResponse.success("Today's appointments",
                appointmentService.getTodayByDoctor(doctorId)));
    }

    /**
     * Get appointments by patient
     */
    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAnyAuthority('ROLE_DOCTOR', 'ROLE_RECEPTIONIST', 'ROLE_ADMIN', 'ROLE_PATIENT')")
    public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getByPatient(@PathVariable Long patientId) {
        return ResponseEntity.ok(ApiResponse.success("Patient appointments",
                appointmentService.getByPatient(patientId)));
    }

    /**
     * Get single appointment
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_DOCTOR', 'ROLE_RECEPTIONIST', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<AppointmentResponse>> getById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(ApiResponse.success("Appointment retrieved",
                    appointmentService.getById(id)));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}