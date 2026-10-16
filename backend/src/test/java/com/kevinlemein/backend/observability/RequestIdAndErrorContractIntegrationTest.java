package com.kevinlemein.backend.observability;

import com.kevinlemein.backend.model.AppointmentStatus;
import com.kevinlemein.backend.model.Role;
import com.kevinlemein.backend.support.IntegrationTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Every response carries an X-Request-Id; every error body carries a stable
 * machine-readable `code` and the same `requestId`, so a client (web or
 * mobile) can branch on the code and support staff can find the request in
 * the server logs.
 */
class RequestIdAndErrorContractIntegrationTest extends IntegrationTestBase {

    private static final String UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

    private String receptionist;

    @BeforeEach
    void setUp() throws Exception {
        receptionist = login(createUser(Role.ROLE_RECEPTIONIST, "recep"));
    }

    private void assertErrorContract(MvcResult result, String code) throws Exception {
        String header = result.getResponse().getHeader("X-Request-Id");
        String body = result.getResponse().getContentAsString();
        assertThat(header).isNotBlank();
        assertThat((String) json(body, "$.code")).isEqualTo(code);
        assertThat((String) json(body, "$.requestId")).isEqualTo(header);
        assertThat((Boolean) json(body, "$.success")).isFalse();
    }

    @Test
    void successfulResponsesGetAGeneratedRequestIdAndNoErrorCode() throws Exception {
        mockMvc.perform(get("/api/patients").header("Authorization", bearer(receptionist)))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Request-Id", matchesPattern(UUID)))
                .andExpect(jsonPath("$.code").doesNotExist());
    }

    @Test
    void aWellFormedIncomingRequestIdIsKept() throws Exception {
        mockMvc.perform(get("/api/patients").header("Authorization", bearer(receptionist)).header("X-Request-Id", "mobile-3f2a_9B.1"))
                .andExpect(header().string("X-Request-Id", "mobile-3f2a_9B.1"));
    }

    @Test
    void aMalformedIncomingRequestIdIsReplaced() throws Exception {
        mockMvc.perform(get("/api/patients").header("Authorization", bearer(receptionist)).header("X-Request-Id", "bad id\r\ninjected: yes"))
                .andExpect(header().string("X-Request-Id", matchesPattern(UUID)));
        mockMvc.perform(get("/api/patients").header("Authorization", bearer(receptionist)).header("X-Request-Id", "x".repeat(65)))
                .andExpect(header().string("X-Request-Id", matchesPattern(UUID)));
    }

    @Test
    void unauthenticated() throws Exception {
        assertErrorContract(mockMvc.perform(get("/api/patients")).andExpect(status().isUnauthorized()).andReturn(), "UNAUTHENTICATED");
    }

    @Test
    void forbiddenByUrlRuleAndByMethodSecurity() throws Exception {
        String patient = login(createPatient("zawadi").getUser());
        assertErrorContract(mockMvc.perform(get("/api/admin/users").header("Authorization", bearer(patient)))
                .andExpect(status().isForbidden()).andReturn(), "FORBIDDEN");
        assertErrorContract(mockMvc.perform(get("/api/patients").header("Authorization", bearer(patient)))
                .andExpect(status().isForbidden()).andReturn(), "FORBIDDEN");
    }

    @Test
    void validationFailed() throws Exception {
        assertErrorContract(mockMvc.perform(post("/api/patients/register").header("Authorization", bearer(receptionist))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest()).andReturn(), "VALIDATION_FAILED");
    }

    @Test
    void malformedRequest() throws Exception {
        assertErrorContract(mockMvc.perform(post("/api/appointments").header("Authorization", bearer(receptionist))
                        .contentType(MediaType.APPLICATION_JSON).content("{nope"))
                .andExpect(status().isBadRequest()).andReturn(), "MALFORMED_REQUEST");
    }

    @Test
    void badRequestNotFoundConflictAndInvalidState() throws Exception {
        assertErrorContract(mockMvc.perform(get("/api/patients/abc").header("Authorization", bearer(receptionist)))
                .andExpect(status().isBadRequest()).andReturn(), "BAD_REQUEST");
        assertErrorContract(mockMvc.perform(get("/api/patients/9999").header("Authorization", bearer(receptionist)))
                .andExpect(status().isNotFound()).andReturn(), "NOT_FOUND");
        assertErrorContract(mockMvc.perform(get("/api/no-such-route").header("Authorization", bearer(receptionist)))
                .andExpect(status().isNotFound()).andReturn(), "NOT_FOUND");

        var appt = createAppointment(createPatient("jabari"), createDoctor("drkamau"), AppointmentStatus.COMPLETED);
        assertErrorContract(mockMvc.perform(patch("/api/appointments/" + appt.getId() + "/status").header("Authorization", bearer(receptionist))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"PENDING\"}"))
                .andExpect(status().isConflict()).andReturn(), "INVALID_STATE_TRANSITION");

        String body = "{\"firstName\":\"Neema\",\"lastName\":\"Wairimu\",\"email\":\"neema@example.test\",\"phoneNumber\":\"0700000003\","
                + "\"dateOfBirth\":\"1995-02-02\",\"gender\":\"FEMALE\",\"address\":\"Nakuru\"}";
        mockMvc.perform(post("/api/patients/register").header("Authorization", bearer(receptionist))
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isCreated());
        assertErrorContract(mockMvc.perform(post("/api/patients/register").header("Authorization", bearer(receptionist))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isConflict()).andReturn(), "DUPLICATE_ACCOUNT");
    }
}
