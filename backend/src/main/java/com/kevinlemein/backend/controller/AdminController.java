package com.kevinlemein.backend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.kevinlemein.backend.dto.ApiResponse;
import com.kevinlemein.backend.dto.CreateUserRequest;
import com.kevinlemein.backend.dto.PagedResponse;
import com.kevinlemein.backend.dto.UserResponse;
import com.kevinlemein.backend.exception.InvalidRequestException;
import com.kevinlemein.backend.model.Role;
import com.kevinlemein.backend.security.CurrentUserProvider;
import com.kevinlemein.backend.service.UserService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "Administration", description = "Staff accounts and roles")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")

public class AdminController {

    private final UserService userService;
    private final CurrentUserProvider currentUserProvider;

    /**
     * Create a user with a specific role (Admin can create any role)
     */

    @Operation(summary = "Create a staff account", description = "Admin. Roles: ADMIN, DOCTOR, RECEPTIONIST (patients are registered via patient registration).")
    @PostMapping("/users")
    public ResponseEntity<ApiResponse<UserResponse>> createUser(
            @Valid @RequestBody CreateUserRequest request
    ) {
        UserResponse response = userService.createUser(request, Role.ROLE_ADMIN);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("User created successfully", response));
    }

    /**
     * Get all users (paginated — defaults to 20 per page)
     */
    @Operation(summary = "List users (paged)", description = "Admin. Query: `page`, `size`, `sort`.")
    @GetMapping("/users")
    public ResponseEntity<ApiResponse<PagedResponse<UserResponse>>> getAllUsers(
            @PageableDefault(size = 20) Pageable pageable
    ) {
        PagedResponse<UserResponse> users = userService.getAllUsers(pageable);
        return ResponseEntity.ok(ApiResponse.success("Users retrieved", users));
    }

    /**
     * Get users by role
     */
    @Operation(summary = "Users by role", description = "Admin. Not paged.")
    @GetMapping("/users/role/{role}")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getUsersByRole(@PathVariable String role) {
        Role r;
        try {
            r = Role.valueOf(role);
        } catch (IllegalArgumentException e) {
            throw new InvalidRequestException("Invalid role: " + role);
        }
        List<UserResponse> users = userService.getUsersByRole(r);
        return ResponseEntity.ok(ApiResponse.success("Users retrieved", users));
    }

    /**
     * Update a user's role
     */
    @Operation(summary = "Change a user's role", description = "Admin. Staff roles only; not your own account (409 `ADMIN_SELF_CHANGE`).")
    @PatchMapping("/users/{id}/role")
    public ResponseEntity<ApiResponse<UserResponse>> updateUserRole(
            @PathVariable Long id,
            @RequestBody Map<String, String> body
    ) {
        String newRole = body.get("role");
        UserResponse response = userService.updateUserRole(id, newRole, currentUserProvider.getCurrentUserId());
        return ResponseEntity.ok(ApiResponse.success("Role updated successfully", response));
    }

    /**
     * Enable/disable a user
     */
    @Operation(summary = "Enable or disable an account", description = "Admin. Not your own account (409 `ADMIN_SELF_CHANGE`). A disabled account's tokens stop working immediately.")
    @PatchMapping("/users/{id}/toggle-status")
    public ResponseEntity<ApiResponse<UserResponse>> toggleUserStatus(@PathVariable Long id) {
        UserResponse response = userService.toggleUserStatus(id, currentUserProvider.getCurrentUserId());
        return ResponseEntity.ok(ApiResponse.success("User status updated", response));
    }
}