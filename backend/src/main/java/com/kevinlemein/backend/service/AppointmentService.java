package com.kevinlemein.backend.service;

import com.kevinlemein.backend.dto.AppointmentResponse;
import com.kevinlemein.backend.dto.BookAppointmentRequest;
import com.kevinlemein.backend.model.*;
import com.kevinlemein.backend.repository.AppointmentRepository;
import com.kevinlemein.backend.repository.PatientRepository;
import com.kevinlemein.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;

    /**
     * Book a new appointment (receptionist only)
     */
    @Transactional
    public AppointmentResponse bookAppointment(BookAppointmentRequest request) {

        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new RuntimeException("Patient not found"));

        User doctor = userRepository.findById(request.getDoctorId())
                .orElseThrow(() -> new RuntimeException("Doctor not found"));

        if (doctor.getRole() != Role.ROLE_DOCTOR) {
            throw new RuntimeException("Selected user is not a doctor");
        }

        LocalDateTime dateTime = LocalDateTime.parse(request.getAppointmentDateTime());

        if (dateTime.isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Cannot book appointments in the past");
        }

        Appointment appointment = Appointment.builder()
                .patient(patient)
                .doctor(doctor)
                .appointmentDateTime(dateTime)
                .appointmentStatus(AppointmentStatus.PENDING)
                .reason(request.getReason())
                .build();

        Appointment saved = appointmentRepository.save(appointment);
        return mapToResponse(saved);
    }

    /**
     * Update appointment status (doctor or receptionist)
     */
    @Transactional
    public AppointmentResponse updateStatus(Long appointmentId, String newStatus, String notes) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));

        AppointmentStatus status;
        try {
            status = AppointmentStatus.valueOf(newStatus.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid status: " + newStatus);
        }

        appointment.setAppointmentStatus(status);
        if (notes != null && !notes.isBlank()) {
            appointment.setNotes(notes);
        }

        Appointment updated = appointmentRepository.save(appointment);
        return mapToResponse(updated);
    }

    /**
     * Get all appointments
     */
    public List<AppointmentResponse> getAllAppointments() {
        return appointmentRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get appointments by doctor ID
     */
    public List<AppointmentResponse> getByDoctor(Long doctorId) {
        return appointmentRepository.findByDoctorIdOrderByAppointmentDateTimeAsc(doctorId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get today's appointments for a doctor
     */
    public List<AppointmentResponse> getTodayByDoctor(Long doctorId) {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1);
        return appointmentRepository.findByDoctorAndDateRange(doctorId, startOfDay, endOfDay)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get appointments by patient ID
     */
    public List<AppointmentResponse> getByPatient(Long patientId) {
        return appointmentRepository.findByPatientIdOrderByAppointmentDateTimeDesc(patientId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get today's appointments (all doctors)
     */
    public List<AppointmentResponse> getTodayAppointments() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1);
        return appointmentRepository.findByDateRange(startOfDay, endOfDay)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get appointment by ID
     */
    public AppointmentResponse getById(Long id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));
        return mapToResponse(appointment);
    }

    private AppointmentResponse mapToResponse(Appointment a) {
        User doctor = a.getDoctor();
        Patient patient = a.getPatient();
        User patientUser = patient.getUser();

        return AppointmentResponse.builder()
                .id(a.getId())
                .patientId(patient.getId())
                .patientFirstName(patientUser.getFirstName())
                .patientLastName(patientUser.getLastName())
                .patientEmail(patientUser.getEmail())
                .patientPhone(patient.getPhoneNumber())
                .doctorId(doctor.getId())
                .doctorFirstName(doctor.getFirstName())
                .doctorLastName(doctor.getLastName())
                .appointmentDateTime(a.getAppointmentDateTime())
                .appointmentStatus(a.getAppointmentStatus().name())
                .reason(a.getReason())
                .notes(a.getNotes())
                .createdAt(a.getCreatedAt())
                .build();
    }
}