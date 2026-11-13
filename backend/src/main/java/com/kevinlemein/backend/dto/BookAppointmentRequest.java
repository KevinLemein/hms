package com.kevinlemein.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.Builder;
import lombok.AllArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor

public class BookAppointmentRequest {

    @Schema(example = "12", description = "Required for receptionists. Patients book for themselves: omit it, or send their own patient id.")
    private Long patientId;

    @NotNull(message = "Doctor ID is required")
    @Schema(example = "4")
    private Long doctorId;

    @NotBlank(message = "Appointment date and time is required")
    @Schema(example = "2026-11-03T09:30:00")
    private String appointmentDateTime;

    @Schema(example = "Persistent cough")
    private String reason;
}
