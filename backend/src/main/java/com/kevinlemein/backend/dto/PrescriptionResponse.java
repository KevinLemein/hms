package com.kevinlemein.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
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

    // The DRUG_DISPENSE charge created for this prescription (server-priced
    // from drugs.cost). Filled by create; null elsewhere.
    private Long billId;
    private BigDecimal chargeAmount;

    // Display fields, filled only by the patient's own list
    // (GET /api/patients/me/prescriptions); null elsewhere.
    private String drugName;
    private Integer drugMilligrams;
    private String prescribedByFirstName;
    private String prescribedByLastName;
    private LocalDateTime appointmentDateTime;
}