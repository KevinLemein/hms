package com.kevinlemein.backend.security;

import com.kevinlemein.backend.model.Role;
import com.kevinlemein.backend.model.User;
import com.kevinlemein.backend.support.IntegrationTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class PasswordIntegrationTest extends IntegrationTestBase {

    private User user;
    private String token;

    @BeforeEach
    void setUp() throws Exception {
        user = createUser(Role.ROLE_RECEPTIONIST, "recep");
        token = login(user);
    }

    private ResultActions change(String bearerToken, String current, String next) throws Exception {
        var req = post("/api/auth/change-password").contentType(MediaType.APPLICATION_JSON)
                .content("{\"currentPassword\":\"" + current + "\",\"newPassword\":\"" + next + "\"}");
        if (bearerToken != null) req.header("Authorization", bearer(bearerToken));
        return mockMvc.perform(req);
    }

    private int loginStatus(String password) throws Exception {
        return mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + user.getEmail() + "\",\"password\":\"" + password + "\"}"))
                .andReturn().getResponse().getStatus();
    }

    @Test
    void changesThePassword() throws Exception {
        change(token, PASSWORD, "A-much-better-one#26").andExpect(status().isOk());
        assertThat(loginStatus("A-much-better-one#26")).isEqualTo(200);
        assertThat(loginStatus(PASSWORD)).isEqualTo(401);
    }

    @Test
    void wrongCurrentPasswordIs400NotA401() throws Exception {
        // 401 would make clients treat it as an expired session and sign the user out.
        change(token, "not-my-password", "A-much-better-one#26")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_CURRENT_PASSWORD"));
        assertThat(loginStatus(PASSWORD)).isEqualTo(200);
    }

    @Test
    void newPasswordMustBeLongEnoughAndDifferent() throws Exception {
        change(token, PASSWORD, "short").andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        change(token, PASSWORD, PASSWORD).andExpect(status().isBadRequest());
    }

    @Test
    void requiresAuthentication() throws Exception {
        change(null, PASSWORD, "A-much-better-one#26").andExpect(status().isUnauthorized());
    }

    @Test
    void generatedPatientPasswordsAreLongEnough() throws Exception {
        String body = mockMvc.perform(post("/api/patients/register").header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\":\"Neema\",\"lastName\":\"Wairimu\",\"email\":\"neema@example.test\",\"phoneNumber\":\"0700000003\","
                                + "\"dateOfBirth\":\"1995-02-02\",\"gender\":\"FEMALE\",\"address\":\"Nakuru\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String generated = json(body, "$.data.generatedPassword");
        assertThat(generated).hasSizeGreaterThanOrEqualTo(12).matches(".*[0-9].*");
    }
}
