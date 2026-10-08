package com.kevinlemein.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "doctors")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Doctor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Links back to the User account this doctor profile belongs to.
    // Kept as a plain Long (not @OneToOne User) to match how the rest of
    // this codebase treats these ids -- see Prescription/Bill for the same
    // pattern and reasoning.
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "speciality_id")
    private Long specialityId;

    @Column(name = "is_available")
    @Builder.Default
    private Boolean isAvailable = true;

    @Column(name = "created_on", updatable = false)
    private LocalDateTime createdOn;

    @Column(name = "created_by_id")
    private Long createdById;

    @PrePersist
    protected void onCreate() {
        if (createdOn == null) createdOn = LocalDateTime.now();
    }
}