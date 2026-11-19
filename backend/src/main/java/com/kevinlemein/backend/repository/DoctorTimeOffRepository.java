package com.kevinlemein.backend.repository;

import com.kevinlemein.backend.model.DoctorTimeOff;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface DoctorTimeOffRepository extends JpaRepository<DoctorTimeOff, Long> {

    /** Time off that has not ended yet, soonest first. */
    List<DoctorTimeOff> findByDoctorIdAndEndDateGreaterThanEqualOrderByStartDateAsc(Long doctorId, LocalDate from);

    boolean existsByDoctorIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(Long doctorId, LocalDate date, LocalDate sameDate);
}
