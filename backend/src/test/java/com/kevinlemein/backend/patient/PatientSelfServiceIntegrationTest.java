package com.kevinlemein.backend.patient;

import com.kevinlemein.backend.model.*;
import com.kevinlemein.backend.repository.BillRepository;
import com.kevinlemein.backend.repository.PrescriptionRepository;
import com.kevinlemein.backend.support.IntegrationTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * /api/patients/me/** resolves the patient from the token — a patient can
 * only ever see their own records and never supplies an id.
 */
class PatientSelfServiceIntegrationTest extends IntegrationTestBase {

    @Autowired PrescriptionRepository prescriptionRepository;
    @Autowired BillRepository billRepository;

    private Patient me;
    private Patient other;
    private String myToken;
    private Appointment myAppointment;

    @BeforeEach
    void setUp() throws Exception {
        me = createPatient("zawadi");
        other = createPatient("jabari");
        myToken = login(me.getUser());
        User doctor = createDoctor("drkamau");
        Doctor doctorProfile = doctorRepository.findByUserId(doctor.getId()).orElseThrow();
        Drug drug = createDrug("Amoxicillin", "120.00", 50);

        myAppointment = createAppointment(me, doctor, AppointmentStatus.COMPLETED);
        Appointment otherAppointment = createAppointment(other, doctor, AppointmentStatus.COMPLETED);

        for (Appointment a : new Appointment[]{myAppointment, otherAppointment}) {
            prescriptionRepository.save(Prescription.builder()
                    .appointmentId(a.getId()).doctorId(doctorProfile.getId()).drugId(drug.getId())
                    .dossage("1 x 3").duration("5 days").quantity(15).build());
            billRepository.save(Bill.builder().patient(a.getPatient()).appointment(a).build());
        }
    }

    @Test
    void meReturnsOwnProfile() throws Exception {
        mockMvc.perform(get("/api/patients/me").header("Authorization", bearer(myToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(me.getId().intValue()))
                .andExpect(jsonPath("$.data.email").value("zawadi@example.test"));
    }

    @Test
    void meAppointmentsOnlyContainsOwn() throws Exception {
        mockMvc.perform(get("/api/patients/me/appointments").header("Authorization", bearer(myToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].patientId").value(me.getId().intValue()));
    }

    @Test
    void mePrescriptionsOnlyContainsOwnWithDrugAndDoctorNames() throws Exception {
        mockMvc.perform(get("/api/patients/me/prescriptions").header("Authorization", bearer(myToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].appointmentId").value(myAppointment.getId().intValue()))
                .andExpect(jsonPath("$.data[0].drugName").value("Amoxicillin"))
                .andExpect(jsonPath("$.data[0].prescribedByLastName").value("drkamau"));
    }

    @Test
    void meBillsOnlyContainsOwn() throws Exception {
        mockMvc.perform(get("/api/patients/me/bills").header("Authorization", bearer(myToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].patientId").value(me.getId().intValue()));
    }

    @Test
    void staffCannotUseMeEndpoints() throws Exception {
        String recep = login(createUser(Role.ROLE_RECEPTIONIST, "recep"));
        mockMvc.perform(get("/api/patients/me").header("Authorization", bearer(recep)))
                .andExpect(status().isForbidden());
    }

    @Test
    void meRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/patients/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void patientCannotReadAnotherPatientById() throws Exception {
        mockMvc.perform(get("/api/appointments/patient/" + other.getId()).header("Authorization", bearer(myToken)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/bills/patient/" + other.getId()).header("Authorization", bearer(myToken)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/patients/by-user/" + other.getUser().getId()).header("Authorization", bearer(myToken)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/patients/" + other.getId()).header("Authorization", bearer(myToken)))
                .andExpect(status().isForbidden());
    }

    @Test
    void loginResponseIncludesNames() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/auth/login")
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"zawadi@example.test\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.firstName").value("Test"))
                .andExpect(jsonPath("$.data.lastName").value("zawadi"));
    }
}
