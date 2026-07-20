package com.kevinlemein.backend.dto;

import com.kevinlemein.backend.model.LineItemSource;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class AddLineItemRequest {
    @NotBlank(message = "Description is required")
    private String description;

    @NotNull @Min(1)
    private Integer quantity;

    @NotNull @DecimalMin(value = "0.01", message = "Unit price must be positive")
    private BigDecimal unitPrice;

    @NotNull(message = "Source is required")
    private LineItemSource source;

    // Required (and unique) for CONSULTATION/DRUG_DISPENSE/LAB.
    // MANUAL charges (e.g. receptionist adding a walk-in fee) may omit it.
    private Long sourceReferenceId;
}