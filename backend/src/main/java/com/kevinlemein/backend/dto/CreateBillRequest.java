package com.kevinlemein.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateBillRequest {
    @NotNull(message = "Patient ID is required")
    @Schema(example = "12")
    private Long patientId;

    @Schema(example = "31")
    private Long appointmentId; // optional — walk-in charges may have none
}