package com.kevinlemein.backend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.kevinlemein.backend.exception.ErrorCodes;
import com.kevinlemein.backend.dto.ApiResponse;
import com.kevinlemein.backend.dto.AuthResponse;
import com.kevinlemein.backend.dto.ChangePasswordRequest;
import com.kevinlemein.backend.security.CurrentUserProvider;
import com.kevinlemein.backend.dto.LoginRequest;
import com.kevinlemein.backend.service.AuthService;
import com.kevinlemein.backend.service.UserService;
import com.kevinlemein.backend.dto.UserResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Authentication", description = "Sign in, current user, password change")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final CurrentUserProvider currentUserProvider;
    private final UserService userService;

    /**
     * The signed-in user (id, role, names). Clients call it at start-up to
     * check that a stored token is still valid and to load the profile.
     * Requires authentication (see SecurityConfig).
     */
    @Operation(summary = "Current user", description = "Any signed-in user. Use at app start to validate a stored token (401 = sign in again).")
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> me() {
        return ResponseEntity.ok(ApiResponse.success("Current user", userService.getUser(currentUserProvider.getCurrentUserId())));
    }

    /** Requires authentication (see SecurityConfig: matched before the /api/auth/** permit-all). */
    @Operation(summary = "Change own password", description = "Any signed-in user. Wrong current password: 400 `INVALID_CURRENT_PASSWORD` (not 401). Existing tokens stay valid until they expire.")
    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(currentUserProvider.getCurrentUserId(), request);
        return ResponseEntity.ok(ApiResponse.success("Password changed", null));
    }

    @Operation(summary = "Sign in", description = "Public. Returns a JWT (send as `Authorization: Bearer <token>`) and `expiresAt`. Wrong email/password: 401 `INVALID_CREDENTIALS`. There are no refresh tokens: sign in again after `expiresAt`.")
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request
    ) {
        try {
            AuthResponse response = authService.login(request);
            return ResponseEntity
                    .ok(ApiResponse.success("Login successful", response));
        } catch (Exception e) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error(ErrorCodes.INVALID_CREDENTIALS, "Invalid email or password"));
        }
    }
}