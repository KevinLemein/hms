package com.kevinlemein.backend.dto;

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
    private String dossage;

    @NotBlank(message = "Duration is required")
    private String duration;

    private String notes;
}