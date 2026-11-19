package com.kevinlemein.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
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
    @Schema(example = "Zawadi")
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Schema(example = "Njeri")
    private String lastName;

    @NotBlank(message = "Email is required")
    @Email(message = "Please provide a valid email address")
    @Schema(example = "zawadi.njeri@example.test")
    private String email;

    @NotBlank(message = "Phone number is required")
    @Schema(example = "0700100200")
    private String phoneNumber;

    @NotBlank(message = "Date of birth is required")
    @Schema(example = "1990-04-12")
    private String dateOfBirth; 

    @NotNull(message = "Gender is required")
    @Schema(example = "FEMALE")
    private String gender;

    @NotBlank(message = "Address is required")
    @Schema(example = "Westlands, Nairobi")
    private String address;

    @Schema(example = "Baraka Njeri")
    private String emergencyContactName;

    @Schema(example = "0700300400")
    private String emergencyContactPhone;

    @Schema(example = "Penicillin")
    private String allergies;

}
