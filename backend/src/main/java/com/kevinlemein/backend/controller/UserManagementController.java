//package com.kevinlemein.backend.controller;
//
//import com.kevinlemein.backend.dto.ApiResponse;
//import com.kevinlemein.backend.dto.CreateUserRequest;
//import com.kevinlemein.backend.dto.UserResponse;
//import com.kevinlemein.backend.model.Role;
//import com.kevinlemein.backend.service.UserService;
//
//import jakarta.validation.Valid;
//import lombok.RequiredArgsConstructor;
//import org.springframework.http.HttpStatus;
//import org.springframework.http.ResponseEntity;
//import org.springframework.security.access.prepost.PreAuthorize;
//import org.springframework.web.bind.annotation.*;
//
//import java.util.List;
//
//@RestController
//@RequestMapping("/api/receptionist")
//@RequiredArgsConstructor
//@PreAuthorize("hasAuthority('ROLE_RECEPTIONIST')")
//
//
//public class UserManagementController {
//
//    private final UserService userService;
//
//    /**
//     * Receptionist creates a doctor or another receptionist
//     */
//
//    @PostMapping("/users")
//    public ResponseEntity<ApiResponse<UserResponse>> createUser(@Valid @RequestBody CreateUserRequest request) {
//
//        try{
//            UserResponse response = userService.createUser(request, Role.ROLE_RECEPTIONIST);
//            return ResponseEntity
//                    .status(HttpStatus.CREATED)
//                    .body(ApiResponse.success("User created successfully", response));
//        }
//
//        catch (RuntimeException e){
//            return ResponseEntity
//                    .badRequest()
//                    .body(ApiResponse.error(e.getMessage()));
//        }
//    }
//
//    @GetMapping("/doctors")
//    public ResponseEntity<ApiResponse<List<UserResponse>>> getDoctors() {
//        List<UserResponse> users = userService.getUsersByRole(Role.ROLE_DOCTOR);
//        return ResponseEntity.ok(ApiResponse.success("Doctors retrieved", doctors));
//    }
//}

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

@RestController
@RequestMapping("/api/receptionist")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_RECEPTIONIST')")
public class UserManagementController {

    private final UserService userService;

    /**
     * Receptionist creates a doctor or another receptionist
     */
    @PostMapping("/users")
    public ResponseEntity<ApiResponse<UserResponse>> createUser(
            @Valid @RequestBody CreateUserRequest request
    ) {
        try {
            UserResponse response = userService.createUser(request, Role.ROLE_RECEPTIONIST);
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
     * Receptionist can view doctors
     */
    @GetMapping("/doctors")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getDoctors() {
        List<UserResponse> doctors = userService.getUsersByRole(Role.ROLE_DOCTOR);
        return ResponseEntity.ok(ApiResponse.success("Doctors retrieved", doctors));
    }
}