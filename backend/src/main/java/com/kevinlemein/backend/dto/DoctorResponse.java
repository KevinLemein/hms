package com.kevinlemein.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** A doctor as shown on booking forms. `id` is the doctor's user id, the value booking expects. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DoctorResponse {
    private Long id;
    private String firstName;
    private String lastName;
}
