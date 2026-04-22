package com.kevinlemein.backend.repository;

import com.kevinlemein.backend.model.Bill;
import com.kevinlemein.backend.model.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BillRepository extends JpaRepository<Bill, Long> {

    @Query("SELECT b FROM Bill b WHERE b.appointment.id = :appointmentId")
    Optional<Bill> findByAppointmentId(@Param("appointmentId") Long appointmentId);

    @Query("SELECT b FROM Bill b WHERE b.patient.id = :patientId ORDER BY b.createdAt DESC")
    List<Bill> findByPatientId(@Param("patientId") Long patientId);

    @Query("SELECT b FROM Bill b WHERE b.paymentStatus = :status ORDER BY b.createdAt DESC")
    List<Bill> findByPaymentStatus(@Param("status") PaymentStatus status);

    @Query("SELECT b FROM Bill b ORDER BY b.createdAt DESC")
    List<Bill> findAllOrderByCreatedAtDesc();
}