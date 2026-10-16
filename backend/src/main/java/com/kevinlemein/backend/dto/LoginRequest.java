package com.kevinlemein.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequest {

    @NotBlank(message = "Email is required")
    @Schema(example = "zawadi.njeri@example.test")
    private String email;

    @NotBlank(message = "Password is required")
    @Schema(example = "Example#Pass2026")
    private String password;
}