package com.kevinlemein.backend.repository;

import com.kevinlemein.backend.model.Appointment;
import com.kevinlemein.backend.model.AppointmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    List<Appointment> findByDoctorIdOrderByAppointmentDateTimeAsc(Long doctorId);

    List<Appointment> findByPatientIdOrderByAppointmentDateTimeDesc(Long patientId);

    List<Appointment> findByStatus(AppointmentStatus appointmentStatus);

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
