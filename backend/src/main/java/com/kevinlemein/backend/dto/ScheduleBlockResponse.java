package com.kevinlemein.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleBlockResponse {
    private int dayOfWeek;
    private String startTime;
    private String endTime;
    private int slotMinutes;
}
