package com.kevinlemein.backend.service;

import com.kevinlemein.backend.dto.CreateUserRequest;
import com.kevinlemein.backend.dto.UserResponse;
import com.kevinlemein.backend.model.*;
import com.kevinlemein.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor

public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * Create a user with a specific role.
     * Admin can create: ADMIN, DOCTOR, RECEPTIONIST
     * Receptionist can create: DOCTOR, RECEPTIONIST PATIENT
     */

    public UserResponse createUser(CreateUserRequest request, Role creatorRole) {

        Role requestedRole;

        try{
            requestedRole = Role.valueOf(request.getRole());

        }
        catch (IllegalArgumentException e){
            throw new RuntimeException("Invalid role " + request.getRole());
        }

        if (creatorRole == Role.ROLE_RECEPTIONIST) {
            if (requestedRole == Role.ROLE_ADMIN) {
                throw new RuntimeException( "Receptionists cant create admins");
            }

        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email is already registered");
        }

        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username is already taken");
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
        return mapToResponse(savedUser);


    }

    /**
     * Get all users
     */

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
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

    public UserResponse updateUserRole (Long userId, String newRole) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Role role;
        try{
            role =  Role.valueOf(newRole);
        }
        catch (IllegalArgumentException e){
            throw new RuntimeException("Invalid role " + newRole);
        }

        user.setRole(role);
        User updatedUser = userRepository.save(user);
        return mapToResponse(updatedUser);
    }

    /**
     * Toggle user enabled/disabled
     */

    public UserResponse toggleUserStatus(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setEnabled(!user.isEnabled());
        User updatedUser = userRepository.save(user);
        return mapToResponse(updatedUser);
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
