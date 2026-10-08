package com.kevinlemein.backend.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

// Note: doctorId is deliberately NOT a field here. It's derived server-side
// from the authenticated JWT via CurrentUserProvider (see
// PrescriptionController), same pattern already used in
// BillController.recordPayment -- a client shouldn't be able to submit an
// arbitrary doctorId and have it trusted.
@Data
public class CreatePrescriptionRequest {

    @NotNull(message = "Appointment ID is required")
    private Long appointmentId;

    @NotNull(message = "Drug ID is required")
    private Long drugId;

    @NotBlank(message = "Dosage is required")
    private String dossage;

    @NotBlank(message = "Duration is required")
    private String duration;

    private String notes;

    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    private Integer quantity;
}