package com.kevinlemein.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor

public class AppointmentResponse {

    private Long id;

    //patient stuff
    private Long patientId;
    private String patientFirstName;
    private String patientLastName;
    private String patientEmail;
    private String patientPhone;

    //doctor stuff
    private Long doctorId;
    private String doctorFirstName;
    private String doctorLastName;

    private LocalDateTime appointmentDateTime;
    private String reason;
    private String appointmentStatus;
    private String notes;
    private LocalDateTime createdAt;

}
