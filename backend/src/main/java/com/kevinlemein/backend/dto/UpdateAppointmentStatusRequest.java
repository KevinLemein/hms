package com.kevinlemein.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Body of PATCH /api/appointments/{id}/status. Same JSON shape the web app
 * already sends ({ status, notes }); previously bound as an untyped Map.
 * status is a string (case-insensitive) so an unknown value gets a clear
 * 400 message instead of a generic body-parse error.
 */
@Data
public class UpdateAppointmentStatusRequest {

    @NotBlank(message = "Status is required")
    @Schema(example = "WAITING")
    private String status;

    @Schema(example = "Checked in at reception")
    private String notes;
}
