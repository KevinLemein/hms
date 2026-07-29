package com.kevinlemein.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class PrescriptionResponse {
    private Long id;
    private Long appointmentId;
    private Long doctorId;
    private Long drugId;
    private String dossage;
    private String duration;
    private String notes;
    private Integer quantity;
    private LocalDateTime createdOn;
}