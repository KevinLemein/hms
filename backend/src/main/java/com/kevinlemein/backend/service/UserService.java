package com.kevinlemein.backend.service;

import com.kevinlemein.backend.dto.CreateUserRequest;
import com.kevinlemein.backend.dto.PagedResponse;
import com.kevinlemein.backend.dto.UserResponse;
import com.kevinlemein.backend.exception.DuplicateResourceException;
import com.kevinlemein.backend.exception.InvalidRequestException;
import com.kevinlemein.backend.exception.ResourceNotFoundException;
import com.kevinlemein.backend.model.*;
import com.kevinlemein.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
     * Receptionist can create: DOCTOR, RECEPTIONIST, PATIENT
     */

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

        if (creatorRole == Role.ROLE_ADMIN && requestedRole == Role.ROLE_PATIENT) {
            throw new InvalidRequestException("Admins cannot create patients.");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Email is already registered");
        }

        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicateResourceException("Username is already taken");
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

    public PagedResponse<UserResponse> getAllUsers(Pageable pageable) {
        Page<User> users = userRepository.findAll(pageable);
        return PagedResponse.from(users.map(this::mapToResponse));
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
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Role role;
        try{
            role =  Role.valueOf(newRole);
        }
        catch (IllegalArgumentException e){
            throw new InvalidRequestException("Invalid role " + newRole);
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
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

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