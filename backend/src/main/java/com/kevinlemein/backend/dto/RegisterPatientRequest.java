package com.kevinlemein.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta .validation.constraints.NotNull;
import jakarta .validation.constraints.Email;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterPatientRequest {

    // User fields
    @NotBlank(message = "First name is required")
    private String firstName;

    @NotBlank(message = "Last name is required")
    private String lastName;

    @NotBlank(message = "Email is required")
    @Email(message = "Please provide a valid email address")
    private String email;

    // Patient-specific fields
    @NotBlank(message = "Phone number is required")
    private String phoneNumber;

    @NotBlank(message = "Date of birth is required")
    private String dateOfBirth; // ISO format: "1990-05-15"

    @NotNull(message = "Gender is required")
    private String gender;

    @NotBlank(message = "Address is required")
    private String address;

    private String emergencyContactName;

    private String emergencyContactPhone;

    private String allergies;

}
