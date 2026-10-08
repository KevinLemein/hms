package com.kevinlemein.backend.repository;

import com.kevinlemein.backend.model.Prescription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PrescriptionRepository extends JpaRepository<Prescription, Long> {

    List<Prescription> findByAppointmentId(Long appointmentId);

    List<Prescription> findByDoctorId(Long doctorId);
}