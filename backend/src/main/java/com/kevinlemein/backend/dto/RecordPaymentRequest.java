package com.kevinlemein.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import com.kevinlemein.backend.model.PaymentMethod;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class RecordPaymentRequest {
    @NotNull @DecimalMin(value = "0.01", message = "Amount must be positive")
    @Schema(example = "500.00")
    private BigDecimal amount;

    @NotNull(message = "Payment method is required")
    @Schema(example = "MPESA")
    private PaymentMethod method;

    @Schema(example = "SHK7Y2M4XR")
    private String reference; // required for MPESA/CARD, validated in service
}