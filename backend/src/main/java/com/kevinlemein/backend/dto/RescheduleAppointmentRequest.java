package com.kevinlemein.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RescheduleAppointmentRequest {

    @NotBlank(message = "Appointment date and time is required")
    @Schema(example = "2026-11-04T10:30:00")
    private String appointmentDateTime;

    @Schema(example = "Persistent cough")
    private String reason;
}
