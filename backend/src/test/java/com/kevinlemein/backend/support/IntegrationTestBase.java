package com.kevinlemein.backend.support;

import com.jayway.jsonpath.JsonPath;
import com.kevinlemein.backend.model.*;
import com.kevinlemein.backend.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Base for integration tests: full Spring context, MockMvc, and a disposable
 * PostgreSQL container shared by every test class in the run. Each test
 * starts from empty tables and builds its own fictional data.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class IntegrationTestBase {

    protected static final String PASSWORD = "Test#Pass2026";

    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

    static {
        POSTGRES.start();
    }

    @Autowired protected MockMvc mockMvc;
    @Autowired protected JdbcTemplate jdbc;
    @Autowired protected PasswordEncoder passwordEncoder;
    @Autowired protected UserRepository userRepository;
    @Autowired protected PatientRepository patientRepository;
    @Autowired protected DoctorRepository doctorRepository;
    @Autowired protected DrugRepository drugRepository;
    @Autowired protected AppointmentRepository appointmentRepository;

    @BeforeEach
    void cleanDatabase() {
        jdbc.execute("TRUNCATE TABLE payments, bill_line_items, bills, prescriptions, appointments, "
                + "drugs, patients, doctors, users RESTART IDENTITY CASCADE");
    }

    // ---------- fixtures ----------

    protected User createUser(Role role, String username) {
        return userRepository.save(User.builder()
                .username(username)
                .email(username + "@example.test")
                .password(passwordEncoder.encode(PASSWORD))
                .firstName("Test")
                .lastName(username)
                .role(role)
                .enabled(true)
                .build());
    }

    /** A ROLE_DOCTOR user plus its doctors row (needed for prescribing). */
    protected User createDoctor(String username) {
        User user = createUser(Role.ROLE_DOCTOR, username);
        doctorRepository.save(Doctor.builder().userId(user.getId()).specialityId(1L).createdById(user.getId()).build());
        return user;
    }

    protected Patient createPatient(String username) {
        User user = createUser(Role.ROLE_PATIENT, username);
        return patientRepository.save(Patient.builder()
                .user(user)
                .phoneNumber("0700000000")
                .dateOfBirth(LocalDate.of(1990, 1, 1))
                .gender(Gender.FEMALE)
                .address("Nairobi")
                .build());
    }

    protected Drug createDrug(String name, String cost, int quantity) {
        return drugRepository.save(Drug.builder()
                .name(name).milligrams(500).category("Test").cost(new BigDecimal(cost)).quantity(quantity)
                .build());
    }

    /** Inserts an appointment directly (bypassing booking/billing) for authorization tests. */
    protected Appointment createAppointment(Patient patient, User doctor, AppointmentStatus status) {
        return appointmentRepository.save(Appointment.builder()
                .patient(patient)
                .doctor(doctor)
                .appointmentDateTime(LocalDateTime.now().plusDays(2).withNano(0))
                .appointmentStatus(status)
                .reason("Fictional test visit")
                .build());
    }

    protected String futureSlot(int daysAhead, int hour) {
        return LocalDate.now().plusDays(daysAhead).atTime(hour, 0).toString() + ":00";
    }

    // ---------- HTTP helpers ----------

    protected String login(User user) throws Exception {
        String body = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + user.getEmail() + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.data.token");
    }

    protected static String bearer(String token) {
        return "Bearer " + token;
    }

    protected static <T> T json(String body, String path) {
        return JsonPath.read(body, path);
    }
}
