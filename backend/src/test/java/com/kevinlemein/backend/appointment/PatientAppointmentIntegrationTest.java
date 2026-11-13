package com.kevinlemein.backend.appointment;

import com.kevinlemein.backend.model.*;
import com.kevinlemein.backend.support.IntegrationTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Patients managing their own appointments: booking, slots, cancelling, rescheduling. */
class PatientAppointmentIntegrationTest extends IntegrationTestBase {

    private String receptionist;
    private String patientToken;
    private String otherPatientToken;
    private Patient patient;
    private Patient otherPatient;
    private User doctor;

    @BeforeEach
    void setUp() throws Exception {
        receptionist = login(createUser(Role.ROLE_RECEPTIONIST, "recep"));
        patient = createPatient("zawadi");
        otherPatient = createPatient("jabari");
        patientToken = login(patient.getUser());
        otherPatientToken = login(otherPatient.getUser());
        doctor = createDoctor("drkamau");
    }

    private ResultActions bookAs(String token, String patientIdJson, String slot) throws Exception {
        return mockMvc.perform(post("/api/appointments").header("Authorization", bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{" + patientIdJson + "\"doctorId\":" + doctor.getId()
                        + ",\"appointmentDateTime\":\"" + slot + "\",\"reason\":\"Fictional checkup\"}"));
    }

    private ResultActions reschedule(String token, Appointment a, String slot) throws Exception {
        return mockMvc.perform(put("/api/appointments/" + a.getId()).header("Authorization", bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"appointmentDateTime\":\"" + slot + "\",\"reason\":\"New reason\"}"));
    }

    private ResultActions setStatus(String token, Appointment a, String status) throws Exception {
        return mockMvc.perform(patch("/api/appointments/" + a.getId() + "/status").header("Authorization", bearer(token))
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"" + status + "\"}"));
    }

    @Test
    void patientBooksForThemselfAndIsBilled() throws Exception {
        bookAs(patientToken, "", futureSlot(3, 10))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.patientId").value(patient.getId().intValue()))
                .andExpect(jsonPath("$.data.appointmentStatus").value("PENDING"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM bills", Integer.class)).isEqualTo(1);

        bookAs(patientToken, "\"patientId\":" + patient.getId() + ",", futureSlot(3, 11)).andExpect(status().isCreated());
    }

    @Test
    void patientCannotBookForAnotherPatient() throws Exception {
        bookAs(patientToken, "\"patientId\":" + otherPatient.getId() + ",", futureSlot(3, 10)).andExpect(status().isForbidden());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM appointments", Integer.class)).isZero();
    }

    @Test
    void receptionistStillNeedsAPatientId() throws Exception {
        bookAs(receptionist, "", futureSlot(3, 10)).andExpect(status().isBadRequest());
        bookAs(receptionist, "\"patientId\":" + patient.getId() + ",", futureSlot(3, 10)).andExpect(status().isCreated());
    }

    @Test
    void patientSeesEnabledDoctorsWithoutPrivateDetails() throws Exception {
        User disabled = createDoctor("drdisabled");
        jdbc.update("UPDATE users SET enabled = false WHERE id = ?", disabled.getId());

        mockMvc.perform(get("/api/appointments/doctors").header("Authorization", bearer(patientToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].id").value(doctor.getId().intValue()))
                .andExpect(jsonPath("$.data[0].email").doesNotExist());
    }

    @Test
    void slotsExcludeTakenTimesUnlessThatAppointmentIsBeingMoved() throws Exception {
        LocalDate day = LocalDate.now().plusDays(3);
        String body = bookAs(patientToken, "", futureSlot(3, 10)).andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long id = ((Number) json(body, "$.data.id")).longValue();

        mockMvc.perform(get("/api/appointments/doctor/" + doctor.getId() + "/slots").param("date", day.toString())
                        .header("Authorization", bearer(otherPatientToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(17))
                .andExpect(jsonPath("$.data[0]").value("08:00"))
                .andExpect(jsonPath("$.data[?(@ == '10:00')]").isEmpty());

        mockMvc.perform(get("/api/appointments/doctor/" + doctor.getId() + "/slots").param("date", day.toString())
                        .param("ignoreAppointmentId", String.valueOf(id)).header("Authorization", bearer(patientToken)))
                .andExpect(jsonPath("$.data.length()").value(18));
    }

    @Test
    void patientCancelsOwnAppointmentOnly() throws Exception {
        Appointment mine = createAppointment(patient, doctor, AppointmentStatus.PENDING);

        setStatus(otherPatientToken, mine, "CANCELLED").andExpect(status().isForbidden());
        setStatus(patientToken, mine, "WAITING").andExpect(status().isForbidden());
        setStatus(patientToken, mine, "CANCELLED")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.appointmentStatus").value("CANCELLED"));
        setStatus(patientToken, mine, "CANCELLED").andExpect(status().isConflict());
    }

    @Test
    void patientReschedulesOwnPendingAppointment() throws Exception {
        Appointment mine = createAppointment(patient, doctor, AppointmentStatus.PENDING);
        String newSlot = futureSlot(5, 11);

        reschedule(otherPatientToken, mine, newSlot).andExpect(status().isForbidden());
        reschedule(patientToken, mine, newSlot)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.appointmentDateTime").value(newSlot))
                .andExpect(jsonPath("$.data.reason").value("New reason"));
    }

    @Test
    void rescheduleIntoATakenSlotOrFromAFinishedAppointmentIsRejected() throws Exception {
        bookAs(otherPatientToken, "", futureSlot(5, 11)).andExpect(status().isCreated());
        Appointment mine = createAppointment(patient, doctor, AppointmentStatus.PENDING);
        reschedule(patientToken, mine, futureSlot(5, 11)).andExpect(status().isConflict());

        Appointment cancelled = createAppointment(patient, doctor, AppointmentStatus.CANCELLED);
        reschedule(patientToken, cancelled, futureSlot(6, 11)).andExpect(status().isConflict());
        reschedule(patientToken, mine, "2020-01-01T10:00:00").andExpect(status().isBadRequest());
    }
}
