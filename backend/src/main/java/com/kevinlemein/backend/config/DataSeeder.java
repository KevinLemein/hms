package com.kevinlemein.backend.config;

import com.kevinlemein.backend.model.*;
import com.kevinlemein.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor

public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        // Only seed if no admin exists
        if (userRepository.findByRole(Role.ROLE_ADMIN).isEmpty()) {
            User admin = User.builder()
                    .username("admin")
                    .email("kevin@gmail.com")
                    .password(passwordEncoder.encode("12345678"))
                    .firstName("System")
                    .lastName("Admin")
                    .role(Role.ROLE_ADMIN)
                    .enabled(true)
                    .build();

            userRepository.save(admin);
            log.info("=== Default admin user created ===");
            log.info("Email: kevin@gmail.com");
            log.info("Password: 12345678");
            log.info("=== Change this password after first login! ===");
        } else {
            log.info("Admin user already exists, skipping seed.");
        }
    }
}
