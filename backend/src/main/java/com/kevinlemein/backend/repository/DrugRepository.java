package com.kevinlemein.backend.repository;

import com.kevinlemein.backend.model.Drug;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DrugRepository extends JpaRepository<Drug, Long> {

    /**
     * Loads a drug with a row lock (SELECT ... FOR UPDATE) for the rest of
     * the transaction. Every stock change goes through this, so the stock
     * check and the update can't interleave with another request's.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT d FROM Drug d WHERE d.id = :id")
    Optional<Drug> findByIdForUpdate(@Param("id") Long id);
}
