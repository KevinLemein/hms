package com.kevinlemein.backend.appointment;

import com.kevinlemein.backend.model.Role;
import com.kevinlemein.backend.model.User;
import com.kevinlemein.backend.support.IntegrationTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import java.time.DayOfWeek;
import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Doctors' weekly working hours and time off, and how they shape slots and booking. */
class DoctorScheduleIntegrationTest extends IntegrationTestBase {

    private String receptionist;
    private String doctorToken;
    private String otherDoctorToken;
    private String patientToken;
    private User doctor;
    private User otherDoctor;
    private Long patientId;
    private LocalDate monday;

    @BeforeEach
    void setUp() throws Exception {
        receptionist = login(createUser(Role.ROLE_RECEPTIONIST, "recep"));
        doctor = createDoctor("drkamau");
        otherDoctor = createDoctor("droduya");
        doctorToken = login(doctor);
        otherDoctorToken = login(otherDoctor);
        var patient = createPatient("zawadi");
        patientId = patient.getId();
        patientToken = login(patient.getUser());
        monday = LocalDate.now().plusDays(3);
        while (monday.getDayOfWeek() != DayOfWeek.MONDAY) {
            monday = monday.plusDays(1);
        }
    }

    private String schedulePath(User d) {
        return "/api/appointments/doctor/" + d.getId() + "/schedule";
    }

    private ResultActions saveSchedule(String token, User d, String blocksJson) throws Exception {
        return mockMvc.perform(put(schedulePath(d)).header("Authorization", bearer(token))
                .contentType(MediaType.APPLICATION_JSON).content("{\"blocks\":" + blocksJson + "}"));
    }

    private ResultActions slots(User d, LocalDate day) throws Exception {
        return mockMvc.perform(get("/api/appointments/doctor/" + d.getId() + "/slots").param("date", day.toString())
                .header("Authorization", bearer(patientToken)));
    }

    private ResultActions book(String slot) throws Exception {
        return mockMvc.perform(post("/api/appointments").header("Authorization", bearer(patientToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"doctorId\":" + doctor.getId() + ",\"appointmentDateTime\":\"" + slot + "\"}"));
    }

    private static final String MONDAY_MORNING =
            "[{\"dayOfWeek\":1,\"startTime\":\"09:00\",\"endTime\":\"11:00\",\"slotMinutes\":60}]";

    @Test
    void withoutASavedScheduleTheClinicDefaultHoursApply() throws Exception {
        mockMvc.perform(get(schedulePath(doctor)).header("Authorization", bearer(doctorToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.custom").value(false))
                .andExpect(jsonPath("$.data.blocks.length()").value(7));
        slots(doctor, monday).andExpect(jsonPath("$.data.length()").value(18));
    }

    @Test
    void doctorManagesOwnScheduleButNotAnothers() throws Exception {
        saveSchedule(doctorToken, doctor, MONDAY_MORNING)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.custom").value(true))
                .andExpect(jsonPath("$.data.blocks[0].startTime").value("09:00"));

        saveSchedule(otherDoctorToken, doctor, MONDAY_MORNING).andExpect(status().isForbidden());
        saveSchedule(patientToken, doctor, MONDAY_MORNING).andExpect(status().isForbidden());
        saveSchedule(receptionist, otherDoctor, MONDAY_MORNING).andExpect(status().isOk());

        saveSchedule(doctorToken, doctor, "[]")
                .andExpect(jsonPath("$.data.custom").value(false));
    }

    @Test
    void slotsAndBookingFollowTheSavedSchedule() throws Exception {
        saveSchedule(doctorToken, doctor, MONDAY_MORNING).andExpect(status().isOk());

        slots(doctor, monday)
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0]").value("09:00"))
                .andExpect(jsonPath("$.data[1]").value("10:00"));
        slots(doctor, monday.plusDays(1)).andExpect(jsonPath("$.data.length()").value(0));

        book(monday.atTime(14, 0) + ":00").andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SLOT_UNAVAILABLE"));
        book(monday.atTime(9, 30) + ":00").andExpect(status().isConflict());
        book(monday.atTime(10, 0) + ":00").andExpect(status().isCreated());
        slots(doctor, monday).andExpect(jsonPath("$.data.length()").value(1));
    }

    @Test
    void timeOffBlocksTheDayUntilRemoved() throws Exception {
        String path = "/api/appointments/doctor/" + doctor.getId() + "/time-off";
        String body = mockMvc.perform(post(path).header("Authorization", bearer(doctorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"startDate\":\"" + monday + "\",\"endDate\":\"" + monday.plusDays(1)
                                + "\",\"reason\":\"Fictional leave\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long id = ((Number) json(body, "$.data.id")).longValue();

        slots(doctor, monday).andExpect(jsonPath("$.data.length()").value(0));
        slots(doctor, monday.plusDays(2)).andExpect(jsonPath("$.data.length()").value(18));
        book(monday.atTime(10, 0) + ":00").andExpect(status().isConflict());
        mockMvc.perform(get(path).header("Authorization", bearer(receptionist)))
                .andExpect(jsonPath("$.data.length()").value(1));

        mockMvc.perform(delete(path + "/" + id).header("Authorization", bearer(otherDoctorToken)))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete(path + "/" + id).header("Authorization", bearer(doctorToken)))
                .andExpect(status().isOk());
        book(monday.atTime(10, 0) + ":00").andExpect(status().isCreated());
    }

    @Test
    void invalidSchedulesAndTimeOffAreRejected() throws Exception {
        saveSchedule(doctorToken, doctor, "[{\"dayOfWeek\":1,\"startTime\":\"09:00\",\"endTime\":\"11:00\",\"slotMinutes\":60},"
                + "{\"dayOfWeek\":1,\"startTime\":\"10:30\",\"endTime\":\"12:00\",\"slotMinutes\":30}]")
                .andExpect(status().isBadRequest());
        saveSchedule(doctorToken, doctor, "[{\"dayOfWeek\":1,\"startTime\":\"11:00\",\"endTime\":\"09:00\",\"slotMinutes\":30}]")
                .andExpect(status().isBadRequest());
        saveSchedule(doctorToken, doctor, "[{\"dayOfWeek\":8,\"startTime\":\"09:00\",\"endTime\":\"11:00\",\"slotMinutes\":30}]")
                .andExpect(status().isBadRequest());
        saveSchedule(doctorToken, doctor, "[{\"dayOfWeek\":1,\"startTime\":\"9am\",\"endTime\":\"11:00\",\"slotMinutes\":30}]")
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/appointments/doctor/" + doctor.getId() + "/time-off")
                        .header("Authorization", bearer(doctorToken)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"startDate\":\"" + monday.plusDays(2) + "\",\"endDate\":\"" + monday + "\"}"))
                .andExpect(status().isBadRequest());
    }
}
