package com.kevinlemein.backend.controller;

import com.kevinlemein.backend.dto.ApiResponse;
import com.kevinlemein.backend.dto.CreateUserRequest;
import com.kevinlemein.backend.dto.UserResponse;
import com.kevinlemein.backend.model.Role;
import com.kevinlemein.backend.service.UserService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")

public class AdminController {

    private final UserService userService;

    /**
     * Create a user with a specific role (Admin can create any role)
     */

    @PostMapping("/users")
    public ResponseEntity<ApiResponse<UserResponse>> createUser(
            @Valid @RequestBody CreateUserRequest request
    ) {
        try {
            UserResponse response = userService.createUser(request, Role.ROLE_ADMIN);
            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(ApiResponse.success("User created successfully", response));
        } catch (RuntimeException e) {
            return ResponseEntity
                    .badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Get all users
     */
    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getAllUsers() {
        List<UserResponse> users = userService.getAllUsers();
        return ResponseEntity.ok(ApiResponse.success("Users retrieved", users));
    }

    /**
     * Get users by role
     */
    @GetMapping("/users/role/{role}")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getUsersByRole(@PathVariable String role) {
        try {
            Role r = Role.valueOf(role);
            List<UserResponse> users = userService.getUsersByRole(r);
            return ResponseEntity.ok(ApiResponse.success("Users retrieved", users));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid role: " + role));
        }
    }

    /**
     * Update a user's role
     */
    @PatchMapping("/users/{id}/role")
    public ResponseEntity<ApiResponse<UserResponse>> updateUserRole(
            @PathVariable Long id,
            @RequestBody Map<String, String> body
    ) {
        try {
            String newRole = body.get("role");
            UserResponse response = userService.updateUserRole(id, newRole);
            return ResponseEntity.ok(ApiResponse.success("Role updated successfully", response));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Enable/disable a user
     */
    @PatchMapping("/users/{id}/toggle-status")
    public ResponseEntity<ApiResponse<UserResponse>> toggleUserStatus(@PathVariable Long id) {
        try {
            UserResponse response = userService.toggleUserStatus(id);
            return ResponseEntity.ok(ApiResponse.success("User status updated", response));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}
