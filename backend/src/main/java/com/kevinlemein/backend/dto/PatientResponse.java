package com.kevinlemein.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatientResponse {

    private Long id;
    private Long userId;
    private String firstName;
    private String lastName;
    private String email;
    private String username;
    private String phoneNumber;
    private LocalDate dateOfBirth;
    private String gender;
    private String address;
    private String emergencyContactName;
    private String emergencyContactPhone;
    private String allergies;
    private boolean enabled;
    private LocalDateTime createdAt;

    // Only populated on creation — never returned again
    private String generatedPassword;
}