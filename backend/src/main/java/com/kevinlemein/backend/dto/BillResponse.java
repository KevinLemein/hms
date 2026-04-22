package com.kevinlemein.backend.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BillResponse {

    private Long id;
    private Long appointmentId;
    private Long patientId;
    private String patientFirstName;
    private String patientLastName;
    private String patientPhone;
    private BigDecimal totalAmount;
    private String paymentStatus;
    private String paymentMethod;
    private String paymentReference;
    private List<BillItemResponse> items;
    private LocalDateTime createdAt;
    private LocalDateTime paidAt;
}