package com.kevinlemein.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "drugs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Drug {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "manufacturer_id")
    private Long manufacturerId;

    private Integer milligrams;

    private String category;

    @Column(precision = 10, scale = 2)
    private BigDecimal cost;

    // Current stock on hand. Decremented transactionally whenever a
    // prescription is created for this drug -- see PrescriptionService.
    @Column(nullable = false)
    private Integer quantity;
}