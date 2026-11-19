package com.kevinlemein.backend.medication;

import com.kevinlemein.backend.model.*;
import com.kevinlemein.backend.repository.PrescriptionRepository;
import com.kevinlemein.backend.support.IntegrationTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Doctors read only prescriptions they issued or that belong to their own
 * appointments. Previously GET /api/prescriptions returned every doctor's
 * prescriptions to any doctor.
 */
class PrescriptionReadScopingIntegrationTest extends IntegrationTestBase {

    @Autowired PrescriptionRepository prescriptionRepository;

    private String tokenA;
    private String tokenB;
    private String receptionist;
    private String patientToken;
    private String otherPatientToken;
    private Doctor profileA;
    private Appointment apptA;
    private Prescription rxA;
    private Prescription rxB;

    @BeforeEach
    void setUp() throws Exception {
        User doctorA = createDoctor("drkamau");
        User doctorB = createDoctor("drotieno");
        tokenA = login(doctorA);
        tokenB = login(doctorB);
        receptionist = login(createUser(Role.ROLE_RECEPTIONIST, "recep"));
        Patient patient = createPatient("zawadi");
        Patient other = createPatient("jabari");
        patientToken = login(patient.getUser());
        otherPatientToken = login(other.getUser());
        Drug drug = createDrug("Amoxicillin", "120.00", 50);

        profileA = doctorRepository.findByUserId(doctorA.getId()).orElseThrow();
        Doctor profileB = doctorRepository.findByUserId(doctorB.getId()).orElseThrow();
        apptA = createAppointment(patient, doctorA, AppointmentStatus.COMPLETED);
        Appointment apptB = createAppointment(other, doctorB, AppointmentStatus.COMPLETED);
        rxA = prescriptionRepository.save(Prescription.builder().appointmentId(apptA.getId()).doctorId(profileA.getId())
                .drugId(drug.getId()).dossage("1").duration("5 days").quantity(5).build());
        rxB = prescriptionRepository.save(Prescription.builder().appointmentId(apptB.getId()).doctorId(profileB.getId())
                .drugId(drug.getId()).dossage("1").duration("5 days").quantity(5).build());
    }

    private org.springframework.test.web.servlet.ResultActions getAs(String token, String path) throws Exception {
        return mockMvc.perform(get(path).header("Authorization", bearer(token)));
    }

    @Test
    void fullListIsFrontDeskOnly() throws Exception {
        getAs(tokenA, "/api/prescriptions").andExpect(status().isForbidden());
        getAs(receptionist, "/api/prescriptions").andExpect(status().isOk()).andExpect(jsonPath("$.data", hasSize(2)));
    }

    @Test
    void mineReturnsOnlyTheCallersPrescriptions() throws Exception {
        getAs(tokenA, "/api/prescriptions/mine").andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].id", contains(rxA.getId().intValue())));
        getAs(tokenB, "/api/prescriptions/mine").andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].id", contains(rxB.getId().intValue())));
        getAs(receptionist, "/api/prescriptions/mine").andExpect(status().isForbidden());
    }

    @Test
    void singlePrescriptionOnlyForItsDoctorOrFrontDesk() throws Exception {
        getAs(tokenA, "/api/prescriptions/" + rxA.getId()).andExpect(status().isOk());
        getAs(tokenB, "/api/prescriptions/" + rxA.getId()).andExpect(status().isForbidden());
        getAs(receptionist, "/api/prescriptions/" + rxA.getId()).andExpect(status().isOk());
    }

    @Test
    void byDoctorProfileOnlyForThatDoctorOrFrontDesk() throws Exception {
        getAs(tokenA, "/api/prescriptions/doctor/" + profileA.getId()).andExpect(status().isOk());
        getAs(tokenB, "/api/prescriptions/doctor/" + profileA.getId()).andExpect(status().isForbidden());
        getAs(receptionist, "/api/prescriptions/doctor/" + profileA.getId()).andExpect(status().isOk());
    }

    @Test
    void byAppointmentOnlyForItsParticipantsOrFrontDesk() throws Exception {
        String path = "/api/prescriptions/appointment/" + apptA.getId();
        getAs(tokenA, path).andExpect(status().isOk()).andExpect(jsonPath("$.data", hasSize(1)));
        getAs(patientToken, path).andExpect(status().isOk());
        getAs(tokenB, path).andExpect(status().isForbidden());
        getAs(otherPatientToken, path).andExpect(status().isForbidden());
        getAs(receptionist, path).andExpect(status().isOk());
    }
}
