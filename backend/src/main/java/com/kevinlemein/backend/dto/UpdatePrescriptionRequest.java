package com.kevinlemein.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Deliberately does NOT allow changing drugId or quantity after creation --
 * doing so would require reversing and reapplying the stock decrement,
 * which adds real complexity for a rarely-needed edit case. If you need to
 * correct the drug or quantity on a prescription, delete it and create a
 * new one instead (that properly reverses/reapplies stock -- see
 * PrescriptionService.deletePrescription).
 */
@Data
public class UpdatePrescriptionRequest {

    @NotBlank(message = "Dosage is required")
    @Schema(example = "1 capsule")
    private String dossage;

    @NotBlank(message = "Duration is required")
    @Schema(example = "twice a day for 7 days")
    private String duration;

    @Schema(example = "Take after meals")
    private String notes;
}