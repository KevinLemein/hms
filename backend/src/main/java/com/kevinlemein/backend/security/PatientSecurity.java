package com.kevinlemein.backend.security;

import com.kevinlemein.backend.model.User;
import com.kevinlemein.backend.repository.PatientRepository;
import com.kevinlemein.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Object-level authorization for patient-scoped endpoints.
 *
 * @PreAuthorize with hasAnyAuthority(...) only proves the caller HAS a role;
 * it never checks whether the specific record they're asking for belongs to
 * them. A ROLE_PATIENT principal could otherwise pass any patientId/userId
 * in the URL and read someone else's appointments, bills, or profile (IDOR).
 *
 * This bean is referenced from @PreAuthorize as "@patientSecurity.isX(...)"
 * and is only ever consulted for the ROLE_PATIENT branch of the check —
 * staff roles (doctor/receptionist/admin) are still authorized via the
 * existing hasAnyAuthority(...) clause and never reach this bean.
 */
@Component("patientSecurity")
@RequiredArgsConstructor
public class PatientSecurity {

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;

    /**
     * True if the currently authenticated user's own userId matches the
     * userId being requested (e.g. GET /api/patients/by-user/{userId}).
     */
    public boolean isOwnUserId(Long userId) {
        if (userId == null) {
            return false;
        }
        return currentUser()
                .map(user -> user.getId().equals(userId))
                .orElse(false);
    }

    /**
     * True if the currently authenticated user's own patientId matches the
     * patientId being requested (e.g. GET /api/appointments/patient/{patientId},
     * GET /api/bills/patient/{patientId}).
     */
    public boolean isOwnPatientId(Long patientId) {
        if (patientId == null) {
            return false;
        }
        return currentUser()
                .flatMap(user -> patientRepository.findByUserId(user.getId()))
                .map(patient -> patient.getId().equals(patientId))
                .orElse(false);
    }

    private java.util.Optional<User> currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return java.util.Optional.empty();
        }
        // Principal name is the email — see CustomUserDetailsService / JwtService subject.
        String email = auth.getName();
        return userRepository.findByEmail(email);
    }
}