package com.kevinlemein.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimeOffRequest {

    @NotBlank(message = "Start date is required")
    @Schema(example = "2026-12-24", description = "yyyy-MM-dd")
    private String startDate;

    @NotBlank(message = "End date is required")
    @Schema(example = "2026-12-26", description = "yyyy-MM-dd, inclusive; not before the start date")
    private String endDate;

    @Size(max = 255, message = "Reason must be at most 255 characters")
    @Schema(example = "Annual leave")
    private String reason;
}
