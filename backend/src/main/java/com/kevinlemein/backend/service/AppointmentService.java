package com.kevinlemein.backend.service;

import com.kevinlemein.backend.exception.ErrorCodes;
import com.kevinlemein.backend.dto.AddLineItemRequest;
import com.kevinlemein.backend.dto.AppointmentResponse;
import com.kevinlemein.backend.dto.BookAppointmentRequest;
import com.kevinlemein.backend.dto.CreateBillRequest;
import com.kevinlemein.backend.exception.DuplicateResourceException;
import com.kevinlemein.backend.exception.InvalidRequestException;
import com.kevinlemein.backend.exception.InvalidStateTransitionException;
import com.kevinlemein.backend.exception.ResourceNotFoundException;
import com.kevinlemein.backend.model.*;
import com.kevinlemein.backend.repository.AppointmentRepository;
import com.kevinlemein.backend.repository.PatientRepository;
import com.kevinlemein.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final BillService billService;
    private final Clock clinicClock;

    @Value("${app.billing.consultation-fee:500.00}")
    private BigDecimal consultationFee;

    /**
     * Book a new appointment (receptionist only).
     *
     * One transaction covers the whole booking: the appointment, its bill and
     * the consultation charge are committed together or not at all, so there
     * is never an appointment without its charge (or a charge without its
     * appointment).
     *
     * Double-booking: the doctor's users row is locked first, so concurrent
     * bookings for the same doctor run the conflict check one at a time. A
     * conflict is another active (not CANCELLED/NO_SHOW) appointment for the
     * same doctor at the same start time — there is no slot length yet.
     */
    @Transactional
    public AppointmentResponse bookAppointment(BookAppointmentRequest request) {

        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));

        User doctor = userRepository.findByIdForUpdate(request.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found"));

        if (doctor.getRole() != Role.ROLE_DOCTOR) {
            throw new InvalidRequestException("Selected user is not a doctor");
        }
        if (!doctor.isEnabled()) {
            throw new InvalidRequestException("Selected doctor's account is disabled");
        }

        LocalDateTime dateTime;
        try {
            dateTime = LocalDateTime.parse(request.getAppointmentDateTime());
        } catch (DateTimeParseException e) {
            throw new InvalidRequestException("Appointment date and time must be in the format yyyy-MM-ddTHH:mm:ss");
        }

        if (dateTime.isBefore(LocalDateTime.now(clinicClock))) {
            throw new InvalidRequestException("Cannot book appointments in the past");
        }

        if (appointmentRepository.countActiveDoctorAppointments(doctor.getId(), dateTime, dateTime) > 0) {
            throw new DuplicateResourceException(ErrorCodes.SLOT_UNAVAILABLE, "The doctor already has an appointment at this time");
        }

        Appointment appointment = Appointment.builder()
                .patient(patient)
                .doctor(doctor)
                .appointmentDateTime(dateTime)
                .appointmentStatus(AppointmentStatus.PENDING)
                .reason(request.getReason())
                .build();

        Appointment saved = appointmentRepository.save(appointment);

        // Auto-charge the consultation fee. Same transaction as the booking
        // itself -- if this fails, the appointment save rolls back too, so
        // an appointment can never exist without its consultation charge.
        chargeConsultationFee(saved, patient);

        return mapToResponse(saved);
    }

    private void chargeConsultationFee(Appointment appointment, Patient patient) {
        CreateBillRequest billRequest = new CreateBillRequest();
        billRequest.setPatientId(patient.getId());
        billRequest.setAppointmentId(appointment.getId());
        var bill = billService.createBill(billRequest);

        AddLineItemRequest item = new AddLineItemRequest();
        item.setDescription("Consultation Fee");
        item.setQuantity(1);
        item.setUnitPrice(consultationFee);
        item.setSource(LineItemSource.CONSULTATION);
        item.setSourceReferenceId(appointment.getId());
        billService.addSystemLineItem(bill.getId(), item);
    }

    /**
     * Update appointment status.
     *
     * Rules (see AppointmentStatus for the lifecycle):
     * - The transition must be allowed from the current status (else 409).
     * - Receptionist/admin may perform any allowed transition — this keeps
     *   the existing front-desk workflow, which can also start/complete a
     *   consultation on the doctor's behalf.
     * - A doctor may only act on their own appointments (else 403) and only
     *   move them to IN_CONSULTATION or COMPLETED.
     *
     * The appointment row is locked so two concurrent updates can't both
     * pass the transition check from the same starting status.
     */
    @Transactional
    public AppointmentResponse updateStatus(Long appointmentId, String newStatus, String notes, User actor) {
        AppointmentStatus status;
        try {
            status = AppointmentStatus.valueOf(newStatus.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new InvalidRequestException("Invalid status: " + newStatus);
        }

        Appointment appointment = appointmentRepository.findByIdForUpdate(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found"));

        if (actor.getRole() == Role.ROLE_DOCTOR) {
            if (!appointment.getDoctor().getId().equals(actor.getId())) {
                throw new AccessDeniedException("Not the assigned doctor");
            }
            if (!AppointmentStatus.DOCTOR_TARGETS.contains(status)) {
                throw new AccessDeniedException("Doctors cannot set status " + status);
            }
        }

        AppointmentStatus current = appointment.getAppointmentStatus();
        if (!current.canTransitionTo(status)) {
            throw new InvalidStateTransitionException(
                    "Cannot change appointment status from " + current + " to " + status);
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
//    public List<AppointmentResponse> getAllAppointments() {
//        return appointmentRepository.findAll()
//                .stream()
//                .map(this::mapToResponse)
//                .collect(Collectors.toList());
//    }

    public List<AppointmentResponse> getAllAppointments() {
        return appointmentRepository.findAll()
                .stream()
                .filter(a -> a.getDoctor() != null && a.getPatient() != null && a.getAppointmentStatus() != null)
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
        LocalDateTime startOfDay = LocalDate.now(clinicClock).atStartOfDay();
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
//    public List<AppointmentResponse> getTodayAppointments() {
//        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
//        LocalDateTime endOfDay = startOfDay.plusDays(1);
//        return appointmentRepository.findByDateRange(startOfDay, endOfDay)
//                .stream()
//                .map(this::mapToResponse)
//                .collect(Collectors.toList());
//    }


    public List<AppointmentResponse> getTodayAppointments() {
        LocalDateTime startOfDay = LocalDate.now(clinicClock).atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1);
        return appointmentRepository.findByDateRange(startOfDay, endOfDay)
                .stream()
                .filter(a -> a.getDoctor() != null && a.getPatient() != null && a.getAppointmentStatus() != null)
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get appointment by ID
     */
    public AppointmentResponse getById(Long id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found"));
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