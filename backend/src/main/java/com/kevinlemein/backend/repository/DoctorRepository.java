package com.kevinlemein.backend.repository;

import com.kevinlemein.backend.model.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DoctorRepository extends JpaRepository<Doctor, Long> {

    // The critical lookup: resolves an authenticated user's users.id into
    // the doctors.id that prescriptions.doctor_id actually needs to
    // reference. Without this, code was inserting users.id directly into a
    // column with a foreign key to doctors.id -- wrong id entirely, which
    // is exactly what caused the FK violation.
    Optional<Doctor> findByUserId(Long userId);
}