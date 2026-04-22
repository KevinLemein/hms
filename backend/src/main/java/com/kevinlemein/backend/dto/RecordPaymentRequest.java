package com.kevinlemein.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecordPaymentRequest {

    @NotBlank(message = "Payment method is required")
    private String paymentMethod; // CASH, MPESA, CARD

    private String paymentReference; // M-Pesa transaction code or card reference
}