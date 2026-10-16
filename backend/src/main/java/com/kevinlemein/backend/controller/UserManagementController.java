package com.kevinlemein.backend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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

@Tag(name = "Reception staff tools", description = "Endpoints used by the reception desk")
@RestController
@RequestMapping("/api/receptionist")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_RECEPTIONIST')")
public class UserManagementController {

    private final UserService userService;

    /**
     * Receptionist creates a doctor or another receptionist
     */
    @Operation(summary = "Create a doctor or receptionist account", description = "Receptionist.")
    @PostMapping("/users")
    public ResponseEntity<ApiResponse<UserResponse>> createUser(
            @Valid @RequestBody CreateUserRequest request
    ) {
        UserResponse response = userService.createUser(request, Role.ROLE_RECEPTIONIST);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("User created successfully", response));
    }

    /**
     * Receptionist can view doctors
     */
    @Operation(summary = "List doctors", description = "Receptionist. For booking forms.")
    @GetMapping("/doctors")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getDoctors() {
        List<UserResponse> doctors = userService.getUsersByRole(Role.ROLE_DOCTOR);
        return ResponseEntity.ok(ApiResponse.success("Doctors retrieved", doctors));
    }
}