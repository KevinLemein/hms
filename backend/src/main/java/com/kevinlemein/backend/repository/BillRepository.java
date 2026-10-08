package com.kevinlemein.backend.repository;

import com.kevinlemein.backend.model.Bill;
import com.kevinlemein.backend.model.BillStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BillRepository extends JpaRepository<Bill, Long> {
    Optional<Bill> findByAppointmentId(Long appointmentId);
    List<Bill> findByPatientId(Long patientId);
    List<Bill> findByStatus(BillStatus status);
    Page<Bill> findAllByOrderByCreatedAtDesc(Pageable pageable);
}