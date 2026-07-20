package com.kevinlemein.backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateBillRequest {
    @NotNull(message = "Patient ID is required")
    private Long patientId;

    private Long appointmentId; // optional — walk-in charges may have none
}