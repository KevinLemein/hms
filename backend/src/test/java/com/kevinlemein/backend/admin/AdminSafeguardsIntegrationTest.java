package com.kevinlemein.backend.admin;

import com.kevinlemein.backend.model.Role;
import com.kevinlemein.backend.model.User;
import com.kevinlemein.backend.support.IntegrationTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Account-management rules that keep the system administrable and accounts
 * consistent:
 * - an admin can't demote or disable their own account (so there is always
 *   at least one active admin: whoever is making the change);
 * - roles change only between staff roles: a patient account needs a
 *   patient record, which only reception registration creates;
 * - promoting someone to doctor creates their doctor profile, which
 *   prescribing requires.
 */
class AdminSafeguardsIntegrationTest extends IntegrationTestBase {

    private User admin;
    private String adminToken;

    @BeforeEach
    void setUp() throws Exception {
        admin = createUser(Role.ROLE_ADMIN, "admin1");
        adminToken = login(admin);
    }

    private ResultActions changeRole(User target, String role) throws Exception {
        return mockMvc.perform(patch("/api/admin/users/" + target.getId() + "/role").header("Authorization", bearer(adminToken))
                .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"" + role + "\"}"));
    }

    private ResultActions toggle(User target) throws Exception {
        return mockMvc.perform(patch("/api/admin/users/" + target.getId() + "/toggle-status").header("Authorization", bearer(adminToken)));
    }

    private Role roleOf(User u) {
        return userRepository.findById(u.getId()).orElseThrow().getRole();
    }

    @Test
    void adminCannotDemoteThemselves() throws Exception {
        changeRole(admin, "ROLE_RECEPTIONIST")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ADMIN_SELF_CHANGE"));
        assertThat(roleOf(admin)).isEqualTo(Role.ROLE_ADMIN);
    }

    @Test
    void adminCannotDisableThemselves() throws Exception {
        toggle(admin).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("ADMIN_SELF_CHANGE"));
        assertThat(userRepository.findById(admin.getId()).orElseThrow().isEnabled()).isTrue();
    }

    @Test
    void adminCanStillManageOtherAdmins() throws Exception {
        User other = createUser(Role.ROLE_ADMIN, "admin2");
        changeRole(other, "ROLE_RECEPTIONIST").andExpect(status().isOk());
        toggle(other).andExpect(status().isOk()).andExpect(jsonPath("$.data.enabled").value(false));
    }

    @Test
    void staffCannotBeTurnedIntoPatientsAndPatientsCannotBecomeStaff() throws Exception {
        User recep = createUser(Role.ROLE_RECEPTIONIST, "recep");
        changeRole(recep, "ROLE_PATIENT").andExpect(status().isBadRequest());
        assertThat(roleOf(recep)).isEqualTo(Role.ROLE_RECEPTIONIST);

        User patientUser = createPatient("zawadi").getUser();
        changeRole(patientUser, "ROLE_DOCTOR").andExpect(status().isBadRequest());
        assertThat(roleOf(patientUser)).isEqualTo(Role.ROLE_PATIENT);
    }

    @Test
    void promotingToDoctorCreatesTheDoctorProfile() throws Exception {
        User recep = createUser(Role.ROLE_RECEPTIONIST, "recep");
        changeRole(recep, "ROLE_DOCTOR").andExpect(status().isOk());

        assertThat(roleOf(recep)).isEqualTo(Role.ROLE_DOCTOR);
        assertThat(doctorRepository.findByUserId(recep.getId())).isPresent();

        // Changing back and forth doesn't create a second profile.
        changeRole(recep, "ROLE_RECEPTIONIST").andExpect(status().isOk());
        changeRole(recep, "ROLE_DOCTOR").andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM doctors WHERE user_id = ?", Integer.class, recep.getId())).isEqualTo(1);
    }

    @Test
    void staffAccountCreationCannotCreatePatientAccounts() throws Exception {
        String recep = login(createUser(Role.ROLE_RECEPTIONIST, "recep"));
        mockMvc.perform(post("/api/receptionist/users").header("Authorization", bearer(recep))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"pat1\",\"email\":\"pat1@example.test\",\"password\":\"Secret#123\","
                                + "\"firstName\":\"P\",\"lastName\":\"One\",\"role\":\"ROLE_PATIENT\"}"))
                .andExpect(status().isBadRequest());
        assertThat(userRepository.findByEmail("pat1@example.test")).isEmpty();
    }
}
