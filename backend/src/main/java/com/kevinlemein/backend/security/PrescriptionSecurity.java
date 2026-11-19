package com.kevinlemein.backend.security;

import com.kevinlemein.backend.model.Doctor;
import com.kevinlemein.backend.repository.DoctorRepository;
import com.kevinlemein.backend.repository.PrescriptionRepository;
import com.kevinlemein.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Object-level checks for prescription reads, used from @PreAuthorize as
 * "@prescriptionSecurity.x(...)". prescriptions.doctor_id is a doctors.id
 * (not users.id), so the caller is resolved to their doctor profile first.
 */
@Component("prescriptionSecurity")
@RequiredArgsConstructor
public class PrescriptionSecurity {

    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;
    private final PrescriptionRepository prescriptionRepository;

    /** True if doctorProfileId is the calling doctor's own doctors.id. */
    public boolean isOwnDoctorProfile(Long doctorProfileId) {
        return doctorProfileId != null && currentDoctorProfileId().map(doctorProfileId::equals).orElse(false);
    }

    /** True if the caller is the doctor who issued this prescription. */
    public boolean isAuthor(Long prescriptionId) {
        Optional<Long> mine = currentDoctorProfileId();
        if (prescriptionId == null || mine.isEmpty()) return false;
        return prescriptionRepository.findById(prescriptionId)
                .map(p -> p.getDoctorId().equals(mine.get()))
                .orElse(false);
    }

    private Optional<Long> currentDoctorProfileId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return Optional.empty();
        return userRepository.findByEmail(auth.getName())
                .flatMap(u -> doctorRepository.findByUserId(u.getId()))
                .map(Doctor::getId);
    }
}
