package com.kevinlemein.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DoctorScheduleResponse {

    @Schema(description = "False when the doctor has no saved blocks and the clinic default hours apply.")
    private boolean custom;

    @Schema(description = "The saved blocks, or the clinic default hours (every day) when `custom` is false.")
    private List<ScheduleBlockResponse> blocks;
}
