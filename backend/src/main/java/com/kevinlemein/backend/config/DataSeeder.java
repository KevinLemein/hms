package com.kevinlemein.backend.config;

import com.kevinlemein.backend.model.*;
import com.kevinlemein.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;

/**
 * Seeds a single admin account on first boot, only if no admin exists yet.
 *
 * Credentials are never hardcoded: the email/password are read from
 * ADMIN_EMAIL / ADMIN_PASSWORD env vars (see application-docker.properties).
 * If ADMIN_PASSWORD isn't set, a random one-time password is generated and
 * printed to the server log ONCE — it is never stored in plaintext and never
 * committed to source. Whoever stands the environment up must retrieve it
 * from the logs and change it on first login.
 */
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);
    private static final String PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    private static final int GENERATED_PASSWORD_LENGTH = 16;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${admin.seed.email:admin@medicare.local}")
    private String adminEmail;

    @Value("${admin.seed.password:}")
    private String adminPassword;

    @Override
    public void run(String... args) {
        if (userRepository.findByRole(Role.ROLE_ADMIN).isEmpty()) {
            boolean generated = adminPassword == null || adminPassword.isBlank();
            String rawPassword = generated ? generateSecurePassword() : adminPassword;

            User admin = User.builder()
                    .username("admin")
                    .email(adminEmail)
                    .password(passwordEncoder.encode(rawPassword))
                    .firstName("System")
                    .lastName("Admin")
                    .role(Role.ROLE_ADMIN)
                    .enabled(true)
                    .build();

            userRepository.save(admin);

            log.warn("=== Admin user created ===");
            log.warn("Email: {}", adminEmail);
            if (generated) {
                log.warn("Password (auto-generated, shown once): {}", rawPassword);
                log.warn("No ADMIN_PASSWORD was set — set one explicitly for repeatable deploys.");
            } else {
                log.warn("Password: set from ADMIN_PASSWORD env var.");
            }
            log.warn("=== Log in and change this password immediately. ===");
        } else {
            log.info("Admin user already exists, skipping seed.");
        }
    }

    private String generateSecurePassword() {
        SecureRandom random = new SecureRandom();
        StringBuilder password = new StringBuilder(GENERATED_PASSWORD_LENGTH);
        for (int i = 0; i < GENERATED_PASSWORD_LENGTH; i++) {
            password.append(PASSWORD_CHARS.charAt(random.nextInt(PASSWORD_CHARS.length())));
        }
        return password.toString();
    }
}