package com.kevinlemein.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "prescriptions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Prescription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Kept as plain foreign-key ids (not JPA @ManyToOne relationships) to
    // match the existing table structure exactly and because the frontend
    // already does its own client-side joins against separately-fetched
    // appointments/drugs lists rather than expecting nested objects here.
    @Column(name = "appointment_id", nullable = false)
    private Long appointmentId;

    @Column(name = "doctor_id", nullable = false)
    private Long doctorId;

    @Column(name = "drug_id", nullable = false)
    private Long drugId;

    // Column is genuinely named "dossage" in the existing table (matches
    // what the frontend has always sent) -- not renaming it to avoid a
    // migration; just noting it's not a typo introduced here.
    @Column(nullable = false)
    private String dossage;

    @Column(nullable = false)
    private String duration;

    private String notes;

    // Quantity of the drug dispensed for this prescription. This is what
    // gets subtracted from Drug.quantity when the prescription is created.
    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "created_on", nullable = false, updatable = false)
    private LocalDateTime createdOn;

    @PrePersist
    protected void onCreate() {
        if (createdOn == null) createdOn = LocalDateTime.now();
    }
}