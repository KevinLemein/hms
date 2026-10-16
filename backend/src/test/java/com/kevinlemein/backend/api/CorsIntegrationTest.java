package com.kevinlemein.backend.api;

import com.kevinlemein.backend.support.IntegrationTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.TestPropertySource;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Browser access is limited to configured origins (CORS is not an access
 * control mechanism; it only governs which web pages may call the API from a
 * browser). Native mobile clients are not subject to CORS.
 */
@TestPropertySource(properties = "app.cors.allowed-origins=https://clinic.example.test, http://localhost:5173")
class CorsIntegrationTest extends IntegrationTestBase {

    @Test
    void configuredOriginMayCallTheApiAndReadTheRequestId() throws Exception {
        mockMvc.perform(options("/api/patients/me")
                        .header("Origin", "https://clinic.example.test")
                        .header("Access-Control-Request-Method", "GET")
                        .header("Access-Control-Request-Headers", "authorization,x-request-id"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "https://clinic.example.test"))
                .andExpect(header().string("Access-Control-Expose-Headers", containsString("X-Request-Id")))
                // Bearer tokens, not cookies: credentials mode is not needed.
                .andExpect(header().doesNotExist("Access-Control-Allow-Credentials"));
    }

    @Test
    void otherOriginsAreRefused() throws Exception {
        mockMvc.perform(options("/api/patients/me")
                        .header("Origin", "https://evil.example.test")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }
}
