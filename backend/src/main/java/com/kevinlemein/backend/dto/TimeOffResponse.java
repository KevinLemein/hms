package com.kevinlemein.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimeOffResponse {
    private Long id;
    private String startDate;
    private String endDate;
    private String reason;
}
