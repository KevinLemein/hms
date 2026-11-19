package com.kevinlemein.backend.repository;

import com.kevinlemein.backend.model.DoctorSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DoctorScheduleRepository extends JpaRepository<DoctorSchedule, Long> {

    List<DoctorSchedule> findByDoctorIdOrderByDayOfWeekAscStartTimeAsc(Long doctorId);

    List<DoctorSchedule> findByDoctorIdAndDayOfWeekOrderByStartTimeAsc(Long doctorId, int dayOfWeek);

    boolean existsByDoctorId(Long doctorId);

    @Modifying
    @Query("DELETE FROM DoctorSchedule s WHERE s.doctor.id = :doctorId")
    void deleteAllForDoctor(@Param("doctorId") Long doctorId);
}
