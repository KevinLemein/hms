package com.kevinlemein.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import com.kevinlemein.backend.model.LineItemSource;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class AddLineItemRequest {
    @NotBlank(message = "Description is required")
    @Schema(example = "Lab test - blood")
    private String description;

    @NotNull @Min(1)
    @Schema(example = "1")
    private Integer quantity;

    @NotNull @DecimalMin(value = "0.01", message = "Unit price must be positive")
    @Schema(example = "1500.00")
    private BigDecimal unitPrice;

    @NotNull(message = "Source is required")
    @Schema(example = "LAB")
    private LineItemSource source;

    // Required (and unique) for CONSULTATION/DRUG_DISPENSE/LAB.
    // MANUAL charges (e.g. receptionist adding a walk-in fee) may omit it.
    @Schema(example = "9001")
    private Long sourceReferenceId;
}