package com.kevinlemein.backend.controller;

import com.kevinlemein.backend.dto.ApiResponse;
import com.kevinlemein.backend.dto.AuthResponse;
import com.kevinlemein.backend.dto.LoginRequest;
import com.kevinlemein.backend.dto.RegisterRequest;
import com.kevinlemein.backend.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

//    @PostMapping("/register")
//    public ResponseEntity<ApiResponse<AuthResponse>> register(
//            @Valid @RequestBody RegisterRequest request
//    ) {
//        try {
//            AuthResponse response = authService.register(request);
//            return ResponseEntity
//                    .status(HttpStatus.CREATED)
//                    .body(ApiResponse.success("User registered successfully", response));
//        } catch (RuntimeException e) {
//            return ResponseEntity
//                    .badRequest()
//                    .body(ApiResponse.error(e.getMessage()));
//        }
//    }

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
                    .body(ApiResponse.error("Invalid email or password"));
        }
    }
}