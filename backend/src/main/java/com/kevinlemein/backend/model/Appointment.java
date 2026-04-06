package com.kevinlemein.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "appointments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder

public class Appointment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id" , nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id" , nullable = false)
    private User doctor;

    @Column (nullable = false)
    private LocalDateTime appointmentDateTime;

    @Enumerated (EnumType.STRING)
    @Column(nullable = false)
    private AppointmentStatus appointmentStatus;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();

        if(appointmentStatus == null){
            appointmentStatus = AppointmentStatus.PENDING;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

}
