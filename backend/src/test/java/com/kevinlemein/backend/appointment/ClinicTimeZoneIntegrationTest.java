package com.kevinlemein.backend.appointment;

import com.kevinlemein.backend.model.*;
import com.kevinlemein.backend.support.IntegrationTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * "Today" and "in the past" are clinic (Africa/Nairobi) concepts, not the
 * server's: the production container runs in UTC, three hours behind.
 *
 * The clock is fixed at 2026-10-16T22:30Z = 2026-10-17 01:30 in Nairobi,
 * where the UTC date and the clinic date differ.
 */
class ClinicTimeZoneIntegrationTest extends IntegrationTestBase {

    static final Instant NOW = Instant.parse("2026-10-16T22:30:00Z");

    @TestConfiguration
    static class FixedClock {
        @Bean
        @Primary
        Clock fixedClinicClock() {
            return Clock.fixed(NOW, ZoneId.of("Africa/Nairobi"));
        }
    }

    private String receptionist;
    private Patient patient;
    private User doctor;

    @BeforeEach
    void setUp() throws Exception {
        receptionist = login(createUser(Role.ROLE_RECEPTIONIST, "recep"));
        patient = createPatient("zawadi");
        doctor = createDoctor("drkamau");
    }

    private Appointment at(String localDateTime) {
        return appointmentRepository.save(Appointment.builder()
                .patient(patient).doctor(doctor)
                .appointmentDateTime(LocalDateTime.parse(localDateTime))
                .appointmentStatus(AppointmentStatus.PENDING).build());
    }

    @Test
    void todayIsTheClinicsDate() throws Exception {
        at("2026-10-16T20:00:00"); // yesterday in Nairobi (still "today" in UTC)
        Appointment today = at("2026-10-17T09:00:00");

        mockMvc.perform(get("/api/appointments/today").header("Authorization", bearer(receptionist)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[*].id", contains(today.getId().intValue())));
    }

    @Test
    void pastIsJudgedInClinicTime() throws Exception {
        String body = "{\"patientId\":" + patient.getId() + ",\"doctorId\":" + doctor.getId() + ",\"appointmentDateTime\":\"%s\"}";

        // 01:00 Nairobi is 30 minutes ago at the clinic (but 3.5 hours ahead in UTC terms).
        mockMvc.perform(post("/api/appointments").header("Authorization", bearer(receptionist))
                        .contentType(MediaType.APPLICATION_JSON).content(body.formatted("2026-10-17T01:00:00")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Cannot book appointments in the past"));

        mockMvc.perform(post("/api/appointments").header("Authorization", bearer(receptionist))
                        .contentType(MediaType.APPLICATION_JSON).content(body.formatted("2026-10-17T02:00:00")))
                .andExpect(status().isCreated());
    }
}
