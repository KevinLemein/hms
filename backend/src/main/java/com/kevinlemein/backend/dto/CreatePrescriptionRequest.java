package com.kevinlemein.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
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
    @Schema(example = "31")
    private Long appointmentId;

    @NotNull(message = "Drug ID is required")
    @Schema(example = "7")
    private Long drugId;

    @NotBlank(message = "Dosage is required")
    @Schema(example = "1 capsule")
    private String dossage;

    @NotBlank(message = "Duration is required")
    @Schema(example = "3 times a day for 5 days")
    private String duration;

    @Schema(example = "Take after meals")
    private String notes;

    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    @Schema(example = "15")
    private Integer quantity;
}