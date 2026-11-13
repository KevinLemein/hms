package com.kevinlemein.backend.controller;

import com.kevinlemein.backend.dto.*;
import com.kevinlemein.backend.service.DoctorScheduleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Doctor schedules", description = "A doctor's weekly working hours and time off, which decide the bookable slots")
@RestController
@RequestMapping("/api/appointments/doctor/{doctorId}")
@RequiredArgsConstructor
public class DoctorScheduleController {

    private static final String MANAGE =
            "hasAnyAuthority('ROLE_RECEPTIONIST', 'ROLE_ADMIN') " +
            "or (hasAuthority('ROLE_DOCTOR') and @appointmentSecurity.isCurrentUser(#doctorId))";

    private final DoctorScheduleService scheduleService;

    @Operation(summary = "A doctor's weekly schedule", description = "Receptionist, admin, or that doctor (`doctorId` is the doctor's user id). `custom=false` means no schedule is saved and the clinic default hours apply.")
    @GetMapping("/schedule")
    @PreAuthorize(MANAGE)
    public ResponseEntity<ApiResponse<DoctorScheduleResponse>> getSchedule(@PathVariable Long doctorId) {
        return ResponseEntity.ok(ApiResponse.success("Schedule retrieved", scheduleService.getSchedule(doctorId)));
    }

    @Operation(summary = "Replace a doctor's weekly schedule", description = "Receptionist, admin, or that doctor. Replaces all blocks; an empty list restores the clinic default hours. Blocks on the same day must not overlap. Existing appointments are not moved.")
    @PutMapping("/schedule")
    @PreAuthorize(MANAGE)
    public ResponseEntity<ApiResponse<DoctorScheduleResponse>> replaceSchedule(
            @PathVariable Long doctorId,
            @Valid @RequestBody UpdateScheduleRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success("Schedule saved", scheduleService.replaceSchedule(doctorId, request)));
    }

    @Operation(summary = "A doctor's upcoming time off", description = "Receptionist, admin, or that doctor. Time off that has not ended yet.")
    @GetMapping("/time-off")
    @PreAuthorize(MANAGE)
    public ResponseEntity<ApiResponse<List<TimeOffResponse>>> getTimeOff(@PathVariable Long doctorId) {
        return ResponseEntity.ok(ApiResponse.success("Time off retrieved", scheduleService.getUpcomingTimeOff(doctorId)));
    }

    @Operation(summary = "Add time off", description = "Receptionist, admin, or that doctor. Whole days, inclusive; the doctor cannot be booked on them. Existing appointments are not cancelled.")
    @PostMapping("/time-off")
    @PreAuthorize(MANAGE)
    public ResponseEntity<ApiResponse<TimeOffResponse>> addTimeOff(
            @PathVariable Long doctorId,
            @Valid @RequestBody TimeOffRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Time off added", scheduleService.addTimeOff(doctorId, request)));
    }

    @Operation(summary = "Remove time off", description = "Receptionist, admin, or that doctor.")
    @DeleteMapping("/time-off/{timeOffId}")
    @PreAuthorize(MANAGE)
    public ResponseEntity<ApiResponse<Void>> deleteTimeOff(@PathVariable Long doctorId, @PathVariable Long timeOffId) {
        scheduleService.deleteTimeOff(doctorId, timeOffId);
        return ResponseEntity.ok(ApiResponse.success("Time off removed", null));
    }
}
