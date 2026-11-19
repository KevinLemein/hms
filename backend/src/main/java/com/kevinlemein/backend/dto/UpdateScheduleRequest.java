package com.kevinlemein.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateScheduleRequest {

    @NotNull(message = "Schedule blocks are required")
    @Size(max = 35, message = "Too many schedule blocks")
    @Valid
    @Schema(description = "The doctor's whole weekly schedule; replaces what was saved. An empty list means 'use the clinic default hours'.")
    private List<ScheduleBlockRequest> blocks;
}
