package com.kevinlemein.backend.repository;

import com.kevinlemein.backend.model.Payment;
import com.kevinlemein.backend.model.PaymentMethod;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    boolean existsByMethodAndReferenceIgnoreCase(PaymentMethod method, String reference);
}
