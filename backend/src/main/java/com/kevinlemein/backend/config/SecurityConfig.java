package com.kevinlemein.backend.config;

import com.kevinlemein.backend.security.JwtAuthenticationFilter;
import com.kevinlemein.backend.security.JsonSecurityErrorHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final UserDetailsService userDetailsService;
    private final JsonSecurityErrorHandler securityErrorHandler;

    @Value("${app.cors.allowed-origins:}")
    private List<String> allowedOrigins;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints
                        // Authenticated auth endpoints first: the permit-all below would match them too.
                        .requestMatchers("/api/auth/change-password", "/api/auth/me").authenticated()
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/actuator/health").permitAll()
                        // API docs (disabled entirely in the production profile unless API_DOCS_ENABLED=true)
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()

                        // Admin-only endpoints
                        .requestMatchers("/api/admin/**").hasAuthority("ROLE_ADMIN")

                        // Doctor-only endpoints
                        .requestMatchers("/api/doctors/**").hasAuthority("ROLE_DOCTOR")

                        // Receptionist endpoints
                        .requestMatchers("/api/receptionist/**").hasAnyAuthority("ROLE_RECEPTIONIST", "ROLE_ADMIN")

                        // Patient endpoints (read-only dashboard)
                        .requestMatchers("/api/patients/me/**").hasAuthority("ROLE_PATIENT")

                        // Shared endpoints (accessible by doctor and receptionist)
                        .requestMatchers("/api/patients/**").hasAnyAuthority("ROLE_DOCTOR", "ROLE_RECEPTIONIST", "ROLE_ADMIN", "ROLE_PATIENT")
                        .requestMatchers("/api/appointments/**").hasAnyAuthority("ROLE_DOCTOR", "ROLE_RECEPTIONIST", "ROLE_ADMIN", "ROLE_PATIENT")
                        .requestMatchers("/api/bills/**").hasAnyAuthority("ROLE_DOCTOR", "ROLE_RECEPTIONIST", "ROLE_ADMIN", "ROLE_PATIENT")

                        // Everything else requires authentication
                        .anyRequest().authenticated()
                )
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(securityErrorHandler)
                        .accessDeniedHandler(securityErrorHandler)
                )
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    /**
     * Browser cross-origin access, from app.cors.allowed-origins (comma-
     * separated; empty = none). Credentials mode is off: the API uses bearer
     * tokens, not cookies. X-Request-Id is exposed so browser clients can show
     * it in error reports. CORS is not access control: every endpoint still
     * enforces authentication and authorization.
     */
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(allowedOrigins.stream().map(String::trim).filter(o -> !o.isEmpty()).toList());
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Request-Id"));
        configuration.setExposedHeaders(List.of("X-Request-Id"));
        configuration.setAllowCredentials(false);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}