package com.kevinlemein.backend.repository;

import com.kevinlemein.backend.model.Bill;
import com.kevinlemein.backend.model.BillStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BillRepository extends JpaRepository<Bill, Long> {
    Optional<Bill> findByAppointmentId(Long appointmentId);

    @Query("SELECT b.id FROM Bill b WHERE b.appointment.id = :appointmentId")
    Optional<Long> findIdByAppointmentId(@Param("appointmentId") Long appointmentId);
    List<Bill> findByPatientId(Long patientId);
    List<Bill> findByStatus(BillStatus status);
    Page<Bill> findAllByOrderByCreatedAtDesc(Pageable pageable);

    /**
     * Loads a bill with a row lock (SELECT ... FOR UPDATE) for the rest of the
     * transaction, so charges and payments against the same bill are applied
     * one at a time and balance checks can't race each other.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM Bill b WHERE b.id = :id")
    Optional<Bill> findByIdForUpdate(@Param("id") Long id);
}
