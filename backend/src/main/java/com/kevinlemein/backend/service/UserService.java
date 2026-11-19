package com.kevinlemein.backend.service;

import com.kevinlemein.backend.exception.ErrorCodes;
import com.kevinlemein.backend.dto.CreateUserRequest;
import com.kevinlemein.backend.dto.PagedResponse;
import com.kevinlemein.backend.dto.UserResponse;
import com.kevinlemein.backend.exception.ConflictException;
import com.kevinlemein.backend.exception.DuplicateResourceException;
import com.kevinlemein.backend.exception.InvalidRequestException;
import com.kevinlemein.backend.exception.ResourceNotFoundException;
import com.kevinlemein.backend.model.*;
import com.kevinlemein.backend.repository.DoctorRepository;
import com.kevinlemein.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor

public class UserService {

    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;
    private final PasswordEncoder passwordEncoder;

    // Placeholder default (General Practitioner) used when a doctor is
    // created without a speciality specified -- CreateUserRequest doesn't
    // currently collect one (the Create User form was never built to ask
    // for it). If you add a speciality dropdown to that form later, wire
    // it through CreateUserRequest instead of relying on this default.
    private static final Long DEFAULT_SPECIALITY_ID = 1L;

    /**
     * Create a user with a specific role.
     * Admin can create: ADMIN, DOCTOR, RECEPTIONIST
     * Receptionist can create: DOCTOR, RECEPTIONIST
     * (Patients are created only by patient registration.)
     *
     * If the requested role is DOCTOR, a corresponding row is also created
     * in `doctors` in the same transaction -- prescriptions.doctor_id has a
     * foreign key to doctors.id (not users.id), so a User alone isn't
     * enough for that account to actually be able to prescribe anything.
     */
    @Transactional
    public UserResponse createUser(CreateUserRequest request, Role creatorRole) {

        Role requestedRole;

        try{
            requestedRole = Role.valueOf(request.getRole().toUpperCase());

        }
        catch (IllegalArgumentException e){
            throw new InvalidRequestException("Invalid role " + request.getRole());
        }

        if (creatorRole == Role.ROLE_RECEPTIONIST && requestedRole == Role.ROLE_ADMIN) {
            throw new InvalidRequestException("Receptionists can't create admins");
        }

        // Patient accounts need a patient record; they are created only via
        // POST /api/patients/register, never as bare user accounts.
        if (requestedRole == Role.ROLE_PATIENT) {
            throw new InvalidRequestException("Patients are registered through patient registration, not as staff accounts.");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException(ErrorCodes.DUPLICATE_ACCOUNT, "Email is already registered");
        }

        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicateResourceException(ErrorCodes.DUPLICATE_ACCOUNT, "Username is already taken");
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .role(requestedRole)
                .enabled(true)
                .build();

        User savedUser = userRepository.save(user);

        if (requestedRole == Role.ROLE_DOCTOR) {
            Doctor doctor = Doctor.builder()
                    .userId(savedUser.getId())
                    .specialityId(DEFAULT_SPECIALITY_ID)
                    .isAvailable(true)
                    // No creator user id is threaded through this method
                    // today (only creatorRole, an enum) -- using the new
                    // doctor's own id as a harmless placeholder. Thread the
                    // actual admin/receptionist user id through here if you
                    // want this to be accurate later.
                    .createdById(savedUser.getId())
                    .build();
            doctorRepository.save(doctor);
        }

        return mapToResponse(savedUser);
    }

    /**
     * Get all users
     */

    public PagedResponse<UserResponse> getAllUsers(Pageable pageable) {
        Page<User> users = userRepository.findAll(pageable);
        return PagedResponse.from(users.map(this::mapToResponse));
    }

    /** One user by id (used by GET /api/auth/me). */
    public UserResponse getUser(Long userId) {
        return mapToResponse(userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found")));
    }

    /**
     * Get users filtered by role
     */

    public List<UserResponse> getUsersByRole(Role role) {
        return userRepository.findByRole(role)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Update the user's role
     */

    /**
     * Change a user's role. Rules:
     * - an admin can't change their own role (prevents locking the last
     *   admin out; the actor is always an active admin);
     * - only staff roles can be assigned, and only to staff accounts: a
     *   patient account needs a patient record, which only reception
     *   registration creates;
     * - becoming a doctor creates the doctor profile prescribing requires.
     */
    @Transactional
    public UserResponse updateUserRole(Long userId, String newRole, Long actorUserId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (newRole == null || newRole.isBlank()) {
            throw new InvalidRequestException("Role is required");
        }

        Role role;
        try{
            role =  Role.valueOf(newRole);
        }
        catch (IllegalArgumentException e){
            throw new InvalidRequestException("Invalid role " + newRole);
        }

        if (user.getId().equals(actorUserId)) {
            throw new ConflictException(ErrorCodes.ADMIN_SELF_CHANGE, "You can't change your own role");
        }
        if (role == Role.ROLE_PATIENT || user.getRole() == Role.ROLE_PATIENT) {
            throw new InvalidRequestException("Roles can only be changed between staff roles; patients are registered by reception");
        }

        user.setRole(role);
        User updatedUser = userRepository.save(user);
        if (role == Role.ROLE_DOCTOR) {
            ensureDoctorProfile(updatedUser, actorUserId);
        }
        return mapToResponse(updatedUser);
    }

    /**
     * Toggle user enabled/disabled
     */

    /** Enable/disable an account. An admin can't disable their own account. */
    @Transactional
    public UserResponse toggleUserStatus(Long userId, Long actorUserId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (user.getId().equals(actorUserId)) {
            throw new ConflictException(ErrorCodes.ADMIN_SELF_CHANGE, "You can't disable your own account");
        }

        user.setEnabled(!user.isEnabled());
        User updatedUser = userRepository.save(user);
        return mapToResponse(updatedUser);
    }

    /** Creates the doctors row for a doctor account if it doesn't exist yet (idempotent). */
    private void ensureDoctorProfile(User doctorUser, Long createdById) {
        if (doctorRepository.findByUserId(doctorUser.getId()).isPresent()) {
            return;
        }
        doctorRepository.save(Doctor.builder()
                .userId(doctorUser.getId())
                .specialityId(DEFAULT_SPECIALITY_ID)
                .isAvailable(true)
                .createdById(createdById)
                .build());
    }


    private UserResponse mapToResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole().name())
                .enabled(user.isEnabled())
                .createdAt(user.getCreatedAt())
                .build();

    }
}