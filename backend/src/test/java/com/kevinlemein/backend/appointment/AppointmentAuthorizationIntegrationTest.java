package com.kevinlemein.backend.appointment;

import com.kevinlemein.backend.model.*;
import com.kevinlemein.backend.support.IntegrationTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Doctors only see and act on their own appointments; status changes follow
 * the clinic workflow:
 *
 *   PENDING -> WAITING | CANCELLED | NO_SHOW
 *   WAITING -> IN_CONSULTATION | CANCELLED | NO_SHOW
 *   IN_CONSULTATION -> COMPLETED
 */
class AppointmentAuthorizationIntegrationTest extends IntegrationTestBase {

    private User doctorA;
    private User doctorB;
    private String tokenA;
    private String tokenB;
    private String receptionist;
    private Patient patient;
    private Patient otherPatient;

    @BeforeEach
    void setUp() throws Exception {
        doctorA = createDoctor("drkamau");
        doctorB = createDoctor("drotieno");
        tokenA = login(doctorA);
        tokenB = login(doctorB);
        receptionist = login(createUser(Role.ROLE_RECEPTIONIST, "recep"));
        patient = createPatient("zawadi");
        otherPatient = createPatient("jabari");
    }

    private ResultActions setStatus(String token, Appointment a, String body) throws Exception {
        return mockMvc.perform(patch("/api/appointments/" + a.getId() + "/status")
                .header("Authorization", bearer(token))
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private ResultActions setStatus(String token, Appointment a, AppointmentStatus s) throws Exception {
        return setStatus(token, a, "{\"status\":\"" + s + "\"}");
    }

    private AppointmentStatus reload(Appointment a) {
        return appointmentRepository.findById(a.getId()).orElseThrow().getAppointmentStatus();
    }

    // ---------- schedule visibility ----------

    @Test
    void doctorCanReadOwnScheduleButNotAnotherDoctors() throws Exception {
        createAppointment(patient, doctorA, AppointmentStatus.PENDING);

        mockMvc.perform(get("/api/appointments/doctor/" + doctorA.getId()).header("Authorization", bearer(tokenA)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/appointments/doctor/" + doctorA.getId()).header("Authorization", bearer(tokenB)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/appointments/doctor/" + doctorA.getId() + "/today").header("Authorization", bearer(tokenB)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/appointments/doctor/" + doctorA.getId()).header("Authorization", bearer(receptionist)))
                .andExpect(status().isOk());
    }

    @Test
    void doctorCannotListEveryDoctorsDay() throws Exception {
        mockMvc.perform(get("/api/appointments/today").header("Authorization", bearer(tokenA)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/appointments/today").header("Authorization", bearer(receptionist)))
                .andExpect(status().isOk());
    }

    @Test
    void singleAppointmentVisibility() throws Exception {
        Appointment a = createAppointment(patient, doctorA, AppointmentStatus.PENDING);
        String patientToken = login(patient.getUser());
        String otherPatientToken = login(otherPatient.getUser());

        mockMvc.perform(get("/api/appointments/" + a.getId()).header("Authorization", bearer(tokenA))).andExpect(status().isOk());
        mockMvc.perform(get("/api/appointments/" + a.getId()).header("Authorization", bearer(tokenB))).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/appointments/" + a.getId()).header("Authorization", bearer(patientToken))).andExpect(status().isOk());
        mockMvc.perform(get("/api/appointments/" + a.getId()).header("Authorization", bearer(otherPatientToken))).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/appointments/" + a.getId()).header("Authorization", bearer(receptionist))).andExpect(status().isOk());
    }

    // ---------- status changes: who ----------

    @Test
    void otherDoctorCannotChangeStatus() throws Exception {
        Appointment a = createAppointment(patient, doctorA, AppointmentStatus.WAITING);
        setStatus(tokenB, a, AppointmentStatus.IN_CONSULTATION).andExpect(status().isForbidden());
        assertThat(reload(a)).isEqualTo(AppointmentStatus.WAITING);
    }

    @Test
    void assignedDoctorRunsTheConsultation() throws Exception {
        Appointment a = createAppointment(patient, doctorA, AppointmentStatus.WAITING);
        setStatus(tokenA, a, AppointmentStatus.IN_CONSULTATION).andExpect(status().isOk());
        setStatus(tokenA, a, "{\"status\":\"COMPLETED\",\"notes\":\"Fictional follow-up in 2 weeks\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.appointmentStatus").value("COMPLETED"))
                .andExpect(jsonPath("$.data.notes").value("Fictional follow-up in 2 weeks"));
    }

    @Test
    void doctorCannotPerformFrontDeskTransitions() throws Exception {
        Appointment a = createAppointment(patient, doctorA, AppointmentStatus.PENDING);
        setStatus(tokenA, a, AppointmentStatus.WAITING).andExpect(status().isForbidden());
        setStatus(tokenA, a, AppointmentStatus.CANCELLED).andExpect(status().isForbidden());
        assertThat(reload(a)).isEqualTo(AppointmentStatus.PENDING);
    }

    @Test
    void receptionistWorkflowIsPreserved() throws Exception {
        Appointment a = createAppointment(patient, doctorA, AppointmentStatus.PENDING);
        setStatus(receptionist, a, AppointmentStatus.WAITING).andExpect(status().isOk());
        setStatus(receptionist, a, AppointmentStatus.IN_CONSULTATION).andExpect(status().isOk());
        setStatus(receptionist, a, AppointmentStatus.COMPLETED).andExpect(status().isOk());

        Appointment b = createAppointment(patient, doctorA, AppointmentStatus.WAITING);
        setStatus(receptionist, b, AppointmentStatus.NO_SHOW).andExpect(status().isOk());
    }

    // ---------- status changes: which ----------

    @Test
    void skippingStepsIsRejected() throws Exception {
        Appointment a = createAppointment(patient, doctorA, AppointmentStatus.PENDING);
        setStatus(receptionist, a, AppointmentStatus.COMPLETED).andExpect(status().isConflict());
        assertThat(reload(a)).isEqualTo(AppointmentStatus.PENDING);
    }

    @Test
    void terminalStatusesCannotBeReopened() throws Exception {
        for (AppointmentStatus terminal : new AppointmentStatus[]{
                AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW}) {
            Appointment a = createAppointment(patient, doctorA, terminal);
            setStatus(receptionist, a, AppointmentStatus.PENDING).andExpect(status().isConflict());
            assertThat(reload(a)).isEqualTo(terminal);
        }
    }

    @Test
    void missingOrUnknownStatusIs400() throws Exception {
        Appointment a = createAppointment(patient, doctorA, AppointmentStatus.PENDING);
        setStatus(receptionist, a, "{}").andExpect(status().isBadRequest());
        setStatus(receptionist, a, "{\"status\":\"FOO\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid status: FOO"));
    }

    // ---------- prescribing ----------

    @Test
    void doctorCanOnlyPrescribeOnOwnAppointment() throws Exception {
        Appointment a = createAppointment(patient, doctorA, AppointmentStatus.IN_CONSULTATION);
        Drug drug = createDrug("Paracetamol", "20.00", 100);
        String body = "{\"appointmentId\":" + a.getId() + ",\"drugId\":" + drug.getId()
                + ",\"dossage\":\"2 x 3\",\"duration\":\"3 days\",\"quantity\":18}";

        mockMvc.perform(post("/api/prescriptions").header("Authorization", bearer(tokenB))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden());
        assertThat(drugRepository.findById(drug.getId()).orElseThrow().getQuantity()).isEqualTo(100);

        mockMvc.perform(post("/api/prescriptions").header("Authorization", bearer(tokenA))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated());
        assertThat(drugRepository.findById(drug.getId()).orElseThrow().getQuantity()).isEqualTo(82);
    }

    @Test
    void doctorCannotEditOrDeleteAnotherDoctorsPrescription() throws Exception {
        Appointment a = createAppointment(patient, doctorA, AppointmentStatus.IN_CONSULTATION);
        Drug drug = createDrug("Paracetamol", "20.00", 100);
        String created = mockMvc.perform(post("/api/prescriptions").header("Authorization", bearer(tokenA))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"appointmentId\":" + a.getId() + ",\"drugId\":" + drug.getId()
                                + ",\"dossage\":\"2 x 3\",\"duration\":\"3 days\",\"quantity\":18}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long id = ((Number) json(created, "$.data.id")).longValue();

        mockMvc.perform(put("/api/prescriptions/" + id).header("Authorization", bearer(tokenB))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"dossage\":\"x\",\"duration\":\"y\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/prescriptions/" + id).header("Authorization", bearer(tokenB)))
                .andExpect(status().isForbidden());
        assertThat(drugRepository.findById(drug.getId()).orElseThrow().getQuantity()).isEqualTo(82);
    }
}
