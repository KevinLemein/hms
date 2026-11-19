package com.kevinlemein.backend.service;

import com.kevinlemein.backend.exception.ErrorCodes;
import com.kevinlemein.backend.dto.AddLineItemRequest;
import com.kevinlemein.backend.dto.AppointmentResponse;
import com.kevinlemein.backend.dto.BookAppointmentRequest;
import com.kevinlemein.backend.dto.CreateBillRequest;
import com.kevinlemein.backend.dto.DoctorResponse;
import com.kevinlemein.backend.dto.RescheduleAppointmentRequest;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final BillService billService;
    private final DoctorScheduleService doctorScheduleService;
    private final Clock clinicClock;

    @Value("${app.billing.consultation-fee:500.00}")
    private BigDecimal consultationFee;

    /**
     * Book an appointment for any patient (front desk).
     *
     * One transaction covers the whole booking: the appointment, its bill and
     * the consultation charge are committed together or not at all, so there
     * is never an appointment without its charge (or a charge without its
     * appointment).
     *
     * Double-booking: the doctor's users row is locked first, so concurrent
     * bookings for the same doctor run the conflict check one at a time. A
     * conflict is another active (not CANCELLED/NO_SHOW) appointment for the
     * same doctor at the same start time. A doctor's saved working hours and
     * time off are enforced too (see DoctorScheduleService.requireBookable).
     */
    @Transactional
    public AppointmentResponse bookAppointment(BookAppointmentRequest request) {
        if (request.getPatientId() == null) {
            throw new InvalidRequestException("Patient ID is required");
        }
        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));
        return book(patient, request);
    }

    /**
     * A patient books for themself. The patient is resolved from the signed-in
     * user; a patientId in the request is only accepted if it is their own.
     */
    @Transactional
    public AppointmentResponse bookAppointmentAsPatient(BookAppointmentRequest request, User patientUser) {
        Patient patient = patientRepository.findByUserId(patientUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));
        if (request.getPatientId() != null && !request.getPatientId().equals(patient.getId())) {
            throw new AccessDeniedException("Patients can only book for themselves");
        }
        return book(patient, request);
    }

    private AppointmentResponse book(Patient patient, BookAppointmentRequest request) {
        User doctor = lockBookableDoctor(request.getDoctorId());
        LocalDateTime dateTime = parseFutureDateTime(request.getAppointmentDateTime());
        doctorScheduleService.requireBookable(doctor.getId(), dateTime);

        if (appointmentRepository.countActiveDoctorAppointments(doctor.getId(), dateTime, dateTime) > 0) {
            throw slotTaken(doctor, dateTime);
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
     * - A patient may only act on their own appointments (else 403) and only
     *   cancel them.
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
        } else if (actor.getRole() == Role.ROLE_PATIENT) {
            requireOwnAppointment(appointment, actor);
            if (!AppointmentStatus.PATIENT_TARGETS.contains(status)) {
                throw new AccessDeniedException("Patients cannot set status " + status);
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
     * Move a PENDING or WAITING appointment to another time and/or change its
     * reason. Front desk may reschedule any; a patient only their own. The
     * doctor stays the same, and the new time gets the same conflict check as
     * a booking.
     */
    @Transactional
    public AppointmentResponse rescheduleAppointment(Long appointmentId, RescheduleAppointmentRequest request, User actor) {
        Appointment appointment = appointmentRepository.findByIdForUpdate(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found"));

        if (actor.getRole() == Role.ROLE_PATIENT) {
            requireOwnAppointment(appointment, actor);
        }

        AppointmentStatus current = appointment.getAppointmentStatus();
        if (current != AppointmentStatus.PENDING && current != AppointmentStatus.WAITING) {
            throw new InvalidStateTransitionException("Only pending or waiting appointments can be rescheduled");
        }

        // Same lock as booking so a concurrent booking can't take the new slot.
        User doctor = lockBookableDoctor(appointment.getDoctor().getId());
        LocalDateTime dateTime = parseFutureDateTime(request.getAppointmentDateTime());

        if (!dateTime.equals(appointment.getAppointmentDateTime())) {
            doctorScheduleService.requireBookable(doctor.getId(), dateTime);
            if (appointmentRepository.countActiveDoctorAppointments(doctor.getId(), dateTime, dateTime) > 0) {
                throw slotTaken(doctor, dateTime);
            }
        }

        appointment.setAppointmentDateTime(dateTime);
        appointment.setReason(request.getReason());
        return mapToResponse(appointmentRepository.save(appointment));
    }

    /** Enabled doctors, for booking forms. `id` is the doctor's user id. */
    public List<DoctorResponse> getBookableDoctors() {
        return userRepository.findByRole(Role.ROLE_DOCTOR).stream()
                .filter(User::isEnabled)
                .map(d -> DoctorResponse.builder()
                        .id(d.getId()).firstName(d.getFirstName()).lastName(d.getLastName()).build())
                .collect(Collectors.toList());
    }

    /**
     * Free start times ("HH:mm") for a doctor on a day. Slots that are already
     * taken, or already past today, are left out. When rescheduling, pass the
     * appointment being moved so its own slot still counts as free.
     */
    public List<String> getAvailableSlots(Long doctorId, LocalDate date, Long ignoreAppointmentId) {
        User doctor = userRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found"));
        if (doctor.getRole() != Role.ROLE_DOCTOR) {
            throw new InvalidRequestException("Selected user is not a doctor");
        }

        LocalDateTime startOfDay = date.atStartOfDay();
        Set<LocalDateTime> taken = appointmentRepository
                .findByDoctorAndDateRange(doctorId, startOfDay, startOfDay.plusDays(1).minusSeconds(1)).stream()
                .filter(a -> a.getAppointmentStatus() != AppointmentStatus.CANCELLED
                        && a.getAppointmentStatus() != AppointmentStatus.NO_SHOW)
                .filter(a -> !a.getId().equals(ignoreAppointmentId))
                .map(Appointment::getAppointmentDateTime)
                .collect(Collectors.toSet());

        LocalDateTime now = LocalDateTime.now(clinicClock);
        List<String> slots = new ArrayList<>();
        for (LocalDateTime slot : doctorScheduleService.slotGrid(doctorId, date)) {
            if (!slot.isBefore(now) && !taken.contains(slot)) {
                slots.add(slot.toLocalTime().toString());
            }
        }
        return slots;
    }

    private User lockBookableDoctor(Long doctorId) {
        User doctor = userRepository.findByIdForUpdate(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found"));
        if (doctor.getRole() != Role.ROLE_DOCTOR) {
            throw new InvalidRequestException("Selected user is not a doctor");
        }
        if (!doctor.isEnabled()) {
            throw new InvalidRequestException("Selected doctor's account is disabled");
        }
        return doctor;
    }

    private static DuplicateResourceException slotTaken(User doctor, LocalDateTime dateTime) {
        return new DuplicateResourceException(ErrorCodes.SLOT_UNAVAILABLE,
                "Dr. %s %s already has an appointment on %s at %s. Please choose another time."
                        .formatted(doctor.getFirstName(), doctor.getLastName(), dateTime.toLocalDate(),
                                dateTime.toLocalTime().withSecond(0).withNano(0)));
    }

    private LocalDateTime parseFutureDateTime(String value) {
        LocalDateTime dateTime;
        try {
            dateTime = LocalDateTime.parse(value);
        } catch (DateTimeParseException e) {
            throw new InvalidRequestException("Appointment date and time must be in the format yyyy-MM-ddTHH:mm:ss");
        }
        if (dateTime.isBefore(LocalDateTime.now(clinicClock))) {
            throw new InvalidRequestException("Cannot book appointments in the past");
        }
        return dateTime;
    }

    private void requireOwnAppointment(Appointment appointment, User patientUser) {
        if (!appointment.getPatient().getUser().getId().equals(patientUser.getId())) {
            throw new AccessDeniedException("Not the appointment's patient");
        }
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