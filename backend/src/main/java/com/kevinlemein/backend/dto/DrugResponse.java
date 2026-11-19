package com.kevinlemein.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class DrugResponse {
    private Long id;
    private String name;
    private Long manufacturerId;
    private Integer milligrams;
    private String category;
    private BigDecimal cost;
    private Integer quantity;
}