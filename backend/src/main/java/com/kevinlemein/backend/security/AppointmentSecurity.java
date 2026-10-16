package com.kevinlemein.backend.security;

import com.kevinlemein.backend.model.Role;
import com.kevinlemein.backend.model.User;
import com.kevinlemein.backend.repository.AppointmentRepository;
import com.kevinlemein.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Object-level authorization for appointment endpoints, used from
 * @PreAuthorize as "@appointmentSecurity.x(...)".
 *
 * A doctor role only proves the caller is *a* doctor; these checks make sure
 * it is *the* doctor on the appointment (or the patient it belongs to).
 * Front-desk staff (receptionist/admin) are authorized by role and never
 * reach these methods.
 */
@Component("appointmentSecurity")
@RequiredArgsConstructor
public class AppointmentSecurity {

    private final UserRepository userRepository;
    private final AppointmentRepository appointmentRepository;

    /** True if the caller is the user with this users.id (e.g. a doctor reading their own schedule). */
    public boolean isCurrentUser(Long userId) {
        return userId != null && currentUser().map(u -> u.getId().equals(userId)).orElse(false);
    }

    /** True if the caller is the assigned doctor or the patient of this appointment. */
    public boolean isParticipant(Long appointmentId) {
        if (appointmentId == null) return false;
        Optional<User> user = currentUser();
        if (user.isEmpty()) return false;
        return appointmentRepository.findById(appointmentId)
                .map(a -> {
                    User u = user.get();
                    if (u.getRole() == Role.ROLE_DOCTOR) {
                        return a.getDoctor().getId().equals(u.getId());
                    }
                    if (u.getRole() == Role.ROLE_PATIENT) {
                        return a.getPatient().getUser().getId().equals(u.getId());
                    }
                    return false;
                })
                // Unknown id: deny (403), so ids can't be probed for existence.
                .orElse(false);
    }

    private Optional<User> currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return Optional.empty();
        }
        return userRepository.findByEmail(auth.getName());
    }
}
