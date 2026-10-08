package com.kevinlemein.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class BillResponse {
    private Long id;
    private Long appointmentId;
    private Long patientId;
    private String patientFirstName;
    private String patientLastName;
    private String patientPhone;
    private String status;
    private BigDecimal totalAmount;
    private BigDecimal amountPaid;
    private BigDecimal balance;
    private List<LineItemResponse> lineItems;
    private List<PaymentResponse> payments;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}