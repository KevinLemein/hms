package com.kevinlemein.backend.api;

import com.jayway.jsonpath.JsonPath;
import com.kevinlemein.backend.model.Role;
import com.kevinlemein.backend.model.User;
import com.kevinlemein.backend.support.IntegrationTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * The published API contract: the OpenAPI document generated from the
 * controllers, plus the small auth additions mobile clients need.
 *
 * The committed snapshot docs/openapi.json must match what the code
 * generates, so the documentation can't silently drift from the
 * implementation. To refresh it after an intentional API change:
 *   ./mvnw test -Dtest=ApiContractIntegrationTest -DupdateApiSpec=true
 */
class ApiContractIntegrationTest extends IntegrationTestBase {

    private static final Path SNAPSHOT = Path.of("..", "docs", "openapi.json");

    private String spec() throws Exception {
        return mockMvc.perform(get("/v3/api-docs")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }

    @Test
    void specDocumentsClientEndpointsWithBearerAuthAndNothingInternal() throws Exception {
        String spec = spec();
        Map<String, Object> paths = JsonPath.read(spec, "$.paths");
        assertThat(paths).containsKeys(
                "/api/auth/login", "/api/auth/me", "/api/auth/change-password",
                "/api/patients/me", "/api/patients/me/appointments", "/api/patients/me/prescriptions", "/api/patients/me/bills",
                "/api/appointments", "/api/appointments/{id}/status", "/api/prescriptions", "/api/prescriptions/mine",
                "/api/bills/{billId}/payments");
        assertThat(paths.keySet()).noneMatch(p -> p.startsWith("/actuator") || p.startsWith("/error"));

        assertThat((String) JsonPath.read(spec, "$.components.securitySchemes.bearerAuth.scheme")).isEqualTo("bearer");
        // Login is public; everything else requires the bearer token.
        assertThat((List<?>) JsonPath.read(spec, "$.paths['/api/auth/login'].post.security")).isEmpty();
        assertThat((List<?>) JsonPath.read(spec, "$.security[*].bearerAuth")).isNotEmpty();

        // The shared error envelope and its codes are documented.
        assertThat((Map<String, Object>) JsonPath.read(spec, "$.components.schemas.ErrorResponse.properties")).containsKeys("code", "message", "requestId", "errors");
        assertThat((Map<String, Object>) JsonPath.read(spec, "$.paths['/api/patients/me'].get.responses")).containsKeys("200", "401", "403");
    }

    @Test
    void committedSpecSnapshotMatchesTheCode() throws Exception {
        String generated = spec();
        if (Boolean.getBoolean("updateApiSpec")) {
            Files.writeString(SNAPSHOT, prettyPrint(generated));
        }
        assertThat(SNAPSHOT).as("docs/openapi.json is missing; run with -DupdateApiSpec=true").exists();
        var mapper = new tools.jackson.databind.json.JsonMapper();
        assertThat(mapper.readTree(Files.readString(SNAPSHOT)))
                .as("docs/openapi.json is out of date with the controllers; regenerate with -DupdateApiSpec=true")
                .isEqualTo(mapper.readTree(generated));
    }

    @Test
    void meReturnsTheSignedInUser() throws Exception {
        User recep = createUser(Role.ROLE_RECEPTIONIST, "recep");
        mockMvc.perform(get("/api/auth/me").header("Authorization", bearer(login(recep))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(recep.getId().intValue()))
                .andExpect(jsonPath("$.data.role").value("ROLE_RECEPTIONIST"))
                .andExpect(jsonPath("$.data.email").value(recep.getEmail()));
        mockMvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void loginTellsTheClientWhenTheTokenExpires() throws Exception {
        User recep = createUser(Role.ROLE_RECEPTIONIST, "recep");
        String body = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + recep.getEmail() + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        Instant expiresAt = Instant.parse(json(body, "$.data.expiresAt"));
        // test profile: jwt.expiration = 3600000 ms
        assertThat(expiresAt).isBetween(Instant.now().plusSeconds(3500), Instant.now().plusSeconds(3700));
    }

    @Test
    void userResponsesNoLongerCarryAPasswordField() throws Exception {
        String admin = login(createUser(Role.ROLE_ADMIN, "admin1"));
        String body = mockMvc.perform(get("/api/admin/users").header("Authorization", bearer(admin)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        // jsonPath().doesNotExist() also passes for "password": null, so check the key itself.
        Map<String, Object> first = JsonPath.read(body, "$.data.content[0]");
        assertThat(first).doesNotContainKey("password");
    }

    private static String prettyPrint(String json) {
        var mapper = new tools.jackson.databind.json.JsonMapper();
        return mapper.writerWithDefaultPrettyPrinter().writeValueAsString(mapper.readTree(json)) + "\n";
    }
}
