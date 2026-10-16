package com.kevinlemein.backend.repository;

import com.kevinlemein.backend.model.BillLineItem;
import com.kevinlemein.backend.model.LineItemSource;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BillLineItemRepository extends JpaRepository<BillLineItem, Long> {
    boolean existsBySourceAndSourceReferenceId(LineItemSource source, Long sourceReferenceId);

    Optional<BillLineItem> findBySourceAndSourceReferenceId(LineItemSource source, Long sourceReferenceId);
}
