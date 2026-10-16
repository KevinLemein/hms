package com.kevinlemein.backend.security;

import com.kevinlemein.backend.model.Role;
import com.kevinlemein.backend.model.User;
import com.kevinlemein.backend.support.IntegrationTestBase;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;

import java.util.Date;

import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * 401 = "authenticate (again)", 403 = "authenticated but not allowed".
 * Clients (the web app's session-expired redirect, a mobile token refresh)
 * depend on that distinction, and both must carry a JSON body.
 */
class AuthenticationResponsesIntegrationTest extends IntegrationTestBase {

    @Value("${jwt.secret}") String secret;

    @Test
    void missingTokenIs401WithJsonBody() throws Exception {
        mockMvc.perform(get("/api/patients"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("WWW-Authenticate", startsWith("Bearer")))
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Authentication required"));
    }

    @Test
    void malformedTokenIs401() throws Exception {
        mockMvc.perform(get("/api/patients").header("Authorization", "Bearer not-a-jwt"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void expiredTokenIs401() throws Exception {
        User recep = createUser(Role.ROLE_RECEPTIONIST, "recep");
        String expired = Jwts.builder()
                .subject(recep.getEmail())
                .issuedAt(new Date(System.currentTimeMillis() - 7_200_000))
                .expiration(new Date(System.currentTimeMillis() - 3_600_000))
                .signWith(Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret)))
                .compact();

        mockMvc.perform(get("/api/patients").header("Authorization", bearer(expired)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenOfADisabledAccountIs401() throws Exception {
        User recep = createUser(Role.ROLE_RECEPTIONIST, "recep");
        String token = login(recep);
        jdbc.update("UPDATE users SET enabled = false WHERE id = ?", recep.getId());

        mockMvc.perform(get("/api/patients").header("Authorization", bearer(token)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void validTokenWithoutPermissionIs403WithJsonBody_methodSecurity() throws Exception {
        String patient = login(createPatient("zawadi").getUser());

        mockMvc.perform(get("/api/patients").header("Authorization", bearer(patient)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void validTokenWithoutPermissionIs403WithJsonBody_urlRule() throws Exception {
        String patient = login(createPatient("zawadi").getUser());

        mockMvc.perform(get("/api/admin/users").header("Authorization", bearer(patient)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("You do not have permission to access this resource"));
    }

    @Test
    void loginStaysPublic() throws Exception {
        User recep = createUser(Role.ROLE_RECEPTIONIST, "recep");
        login(recep); // throws if the token is missing
    }
}
