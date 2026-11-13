package com.kevinlemein.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleBlockRequest {

    @NotNull(message = "Day of week is required")
    @Min(value = 1, message = "Day of week must be 1 (Monday) to 7 (Sunday)")
    @Max(value = 7, message = "Day of week must be 1 (Monday) to 7 (Sunday)")
    @Schema(example = "1", description = "ISO day of week: 1 = Monday ... 7 = Sunday")
    private Integer dayOfWeek;

    @NotBlank(message = "Start time is required")
    @Schema(example = "08:00", description = "HH:mm, clinic local time")
    private String startTime;

    @NotBlank(message = "End time is required")
    @Schema(example = "12:00", description = "HH:mm, clinic local time; must be after the start time")
    private String endTime;

    @NotNull(message = "Slot length is required")
    @Min(value = 5, message = "Slot length must be at least 5 minutes")
    @Max(value = 240, message = "Slot length must be at most 240 minutes")
    @Schema(example = "30")
    private Integer slotMinutes;
}
