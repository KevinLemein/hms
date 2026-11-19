package com.kevinlemein.backend.exception;

import com.kevinlemein.backend.dto.ApiResponse;
import com.kevinlemein.backend.model.Role;
import com.kevinlemein.backend.support.IntegrationTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Client-facing errors must be safe: right status, no framework/JDK internals in the body. */
class ErrorHandlingIntegrationTest extends IntegrationTestBase {

    private String receptionist;

    @BeforeEach
    void setUp() throws Exception {
        receptionist = login(createUser(Role.ROLE_RECEPTIONIST, "recep"));
    }

    @Test
    void malformedJsonIs400WithoutParserDetails() throws Exception {
        mockMvc.perform(post("/api/appointments").header("Authorization", bearer(receptionist))
                        .contentType(MediaType.APPLICATION_JSON).content("{bad json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Malformed or unreadable request body"))
                .andExpect(content().string(not(containsString("JSON parse"))));
    }

    @Test
    void unknownRouteIs404() throws Exception {
        mockMvc.perform(get("/api/does-not-exist").header("Authorization", bearer(receptionist)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void wrongPathVariableTypeIs400() throws Exception {
        mockMvc.perform(get("/api/patients/abc").header("Authorization", bearer(receptionist)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid value for parameter 'id'"));
    }

    @Test
    void missingRequiredParameterIs400() throws Exception {
        mockMvc.perform(get("/api/patients/search").header("Authorization", bearer(receptionist)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Missing required parameter 'query'"));
    }

    @Test
    void unsupportedMethodIs405() throws Exception {
        mockMvc.perform(delete("/api/patients").header("Authorization", bearer(receptionist)))
                .andExpect(status().isMethodNotAllowed());
    }

    @Test
    void validationErrorsListTheFields() throws Exception {
        mockMvc.perform(post("/api/patients/register").header("Authorization", bearer(receptionist))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\":\"Neema\",\"lastName\":\"Wairimu\",\"email\":\"not-an-email\","
                                + "\"phoneNumber\":\"0700000003\",\"dateOfBirth\":\"1995-02-02\",\"gender\":\"FEMALE\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.email").exists())
                .andExpect(jsonPath("$.errors.address").exists());
    }

    @Test
    void invalidDateOfBirthIs400WithSafeMessage() throws Exception {
        mockMvc.perform(post("/api/patients/register").header("Authorization", bearer(receptionist))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\":\"Neema\",\"lastName\":\"Wairimu\",\"email\":\"neema@example.test\","
                                + "\"phoneNumber\":\"0700000003\",\"dateOfBirth\":\"02/02/1995\",\"gender\":\"FEMALE\",\"address\":\"Nakuru\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Date of birth must be in the format yyyy-MM-dd"));
    }

    @Test
    void unexpectedRuntimeExceptionsAre500WithAGenericMessage() {
        ResponseEntity<ApiResponse<Void>> response = new GlobalExceptionHandler()
                .handleRuntimeException(new IllegalStateException("internal detail: table users column x"));

        assertThat(response.getStatusCode().value()).isEqualTo(500);
        assertThat(response.getBody().getMessage()).doesNotContain("internal detail");
    }
}
