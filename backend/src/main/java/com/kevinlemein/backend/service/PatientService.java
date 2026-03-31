package com.kevinlemein.backend.service;

import com.kevinlemein.backend.dto.PatientResponse;
import com.kevinlemein.backend.dto.RegisterPatientRequest;
import com.kevinlemein.backend.model.Gender;
import com.kevinlemein.backend.model.Patient;
import com.kevinlemein.backend.model.Role;
import com.kevinlemein.backend.model.User;
import com.kevinlemein.backend.repository.PatientRepository;
import com.kevinlemein.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PatientService {

    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    private static final String PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";
    private static final int PASSWORD_LENGTH = 6;

    /**
     * Register a new patient — creates both User and Patient records.
     * Auto-generates username from email prefix and a random password.
     */
    @Transactional
    public PatientResponse registerPatient(RegisterPatientRequest request) {

        // Check if email already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email is already registered");
        }

        // Generate username from email prefix
        String username = generateUsername(request.getEmail());

        // Generate random password
        String rawPassword = generatePassword();

        // Create User
        User user = User.builder()
                .username(username)
                .email(request.getEmail())
                .password(passwordEncoder.encode(rawPassword))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .role(Role.ROLE_PATIENT)
                .enabled(true)
                .build();

        User savedUser = userRepository.save(user);

        // Parse gender
        Gender gender;
        try {
            gender = Gender.valueOf(request.getGender().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid gender: " + request.getGender());
        }

        // Create Patient
        Patient patient = Patient.builder()
                .user(savedUser)
                .phoneNumber(request.getPhoneNumber())
                .dateOfBirth(LocalDate.parse(request.getDateOfBirth()))
                .gender(gender)
                .address(request.getAddress())
                .emergencyContactName(request.getEmergencyContactName())
                .emergencyContactPhone(request.getEmergencyContactPhone())
                .allergies(request.getAllergies())
                .build();

        Patient savedPatient = patientRepository.save(patient);

        // Return response with generated password (shown only once)
        PatientResponse response = mapToResponse(savedPatient);
        response.setGeneratedPassword(rawPassword);
        return response;
    }

    /**
     * Get all patients
     */
    public List<PatientResponse> getAllPatients() {
        return patientRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get patient by ID
     */
    public PatientResponse getPatientById(Long id) {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Patient not found"));
        return mapToResponse(patient);
    }

    /**
     * Get patient by user ID
     */
    public PatientResponse getPatientByUserId(Long userId) {
        Patient patient = patientRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Patient record not found"));
        return mapToResponse(patient);
    }

    /**
     * Search patients by name, email, or phone
     */
    public List<PatientResponse> searchPatients(String query) {
        return patientRepository.searchPatients(query)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private String generateUsername(String email) {
        String base = email.split("@")[0].replaceAll("[^a-zA-Z0-9]", "");
        if (base.length() < 3) {
            base = base + "user";
        }
        String username = base;
        int counter = 1;
        while (userRepository.existsByUsername(username)) {
            username = base + counter;
            counter++;
        }
        return username;
    }

    private String generatePassword() {
        SecureRandom random = new SecureRandom();
        StringBuilder password = new StringBuilder(PASSWORD_LENGTH);
        for (int i = 0; i < PASSWORD_LENGTH; i++) {
            password.append(PASSWORD_CHARS.charAt(random.nextInt(PASSWORD_CHARS.length())));
        }
        return password.toString();
    }

    private PatientResponse mapToResponse(Patient patient) {
        User user = patient.getUser();
        return PatientResponse.builder()
                .id(patient.getId())
                .userId(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .username(user.getUsername())
                .phoneNumber(patient.getPhoneNumber())
                .dateOfBirth(patient.getDateOfBirth())
                .gender(patient.getGender().name())
                .address(patient.getAddress())
                .emergencyContactName(patient.getEmergencyContactName())
                .emergencyContactPhone(patient.getEmergencyContactPhone())
                .allergies(patient.getAllergies())
                .enabled(user.isEnabled())
                .createdAt(patient.getCreatedAt())
                .build();
    }
}