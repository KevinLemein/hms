package com.kevinlemein.backend.observability;

import com.kevinlemein.backend.model.Role;
import com.kevinlemein.backend.support.IntegrationTestBase;
import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Health for load balancers / container checks; nothing else from Actuator is exposed. */
class HealthEndpointIntegrationTest extends IntegrationTestBase {

    @Test
    void healthIsPublicAndRevealsNoDetails() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.components").doesNotExist())
                .andExpect(jsonPath("$.details").doesNotExist());
    }

    @Test
    void otherActuatorEndpointsAreNotExposedEvenToAdmins() throws Exception {
        String admin = login(createUser(Role.ROLE_ADMIN, "admin1"));
        for (String path : new String[]{"/actuator/env", "/actuator/beans", "/actuator/configprops", "/actuator/heapdump", "/actuator/info"}) {
            mockMvc.perform(get(path).header("Authorization", bearer(admin))).andExpect(status().isNotFound());
        }
    }
}
