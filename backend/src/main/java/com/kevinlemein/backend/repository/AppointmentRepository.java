package com.kevinlemein.backend.repository;

import com.kevinlemein.backend.model.Appointment;
import com.kevinlemein.backend.model.AppointmentStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    List<Appointment> findByDoctorIdOrderByAppointmentDateTimeAsc(Long doctorId);

    List<Appointment> findByPatientIdOrderByAppointmentDateTimeDesc(Long patientId);

    List<Appointment> findByAppointmentStatus(AppointmentStatus appointmentStatus);

    /** Row-locks the appointment for the rest of the transaction (SELECT ... FOR UPDATE). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Appointment a WHERE a.id = :id")
    Optional<Appointment> findByIdForUpdate(@Param("id") Long id);

    @Query("SELECT a FROM Appointment a WHERE a.doctor.id = :doctorId " +
            "AND a.appointmentDateTime BETWEEN :start AND :end " +
            "ORDER BY a.appointmentDateTime ASC")
    List<Appointment> findByDoctorAndDateRange(
            @Param("doctorId") Long doctorId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    @Query("SELECT a FROM Appointment a " +
            "WHERE a.appointmentDateTime BETWEEN :start AND :end " +
            "ORDER BY a.appointmentDateTime ASC")
    List<Appointment> findByDateRange(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    @Query("SELECT COUNT(a) FROM Appointment a WHERE a.doctor.id = :doctorId " +
            "AND a.appointmentDateTime BETWEEN :start AND :end " +
            "AND a. appointmentStatus NOT IN ('CANCELLED', 'NO_SHOW')")
    long countActiveDoctorAppointments(
            @Param("doctorId") Long doctorId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );


}
