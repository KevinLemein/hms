package com.kevinlemein.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalTime;

/**
 * One block of a doctor's weekly working hours, e.g. Monday 08:00-12:00 with
 * 30-minute slots. A doctor may have several blocks on the same day (a lunch
 * break is simply a gap). A doctor with no blocks at all uses the clinic-wide
 * default hours.
 */
@Entity
@Table(name = "doctor_schedules", indexes = @Index(name = "idx_doctor_schedules_doctor", columnList = "doctor_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DoctorSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id", nullable = false)
    private User doctor;

    /** ISO day of week: 1 = Monday ... 7 = Sunday. */
    @Column(name = "day_of_week", nullable = false)
    private int dayOfWeek;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "slot_minutes", nullable = false)
    private int slotMinutes;
}
