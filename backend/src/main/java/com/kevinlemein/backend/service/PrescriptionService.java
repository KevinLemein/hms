package com.kevinlemein.backend.service;

import com.kevinlemein.backend.exception.ErrorCodes;
import com.kevinlemein.backend.dto.CreatePrescriptionRequest;
import com.kevinlemein.backend.dto.PrescriptionResponse;
import com.kevinlemein.backend.dto.UpdatePrescriptionRequest;
import com.kevinlemein.backend.exception.ConflictException;
import com.kevinlemein.backend.exception.ResourceNotFoundException;
import com.kevinlemein.backend.model.Appointment;
import com.kevinlemein.backend.model.AppointmentStatus;
import com.kevinlemein.backend.model.BillLineItem;
import com.kevinlemein.backend.model.Doctor;
import com.kevinlemein.backend.model.Drug;
import com.kevinlemein.backend.model.Prescription;
import com.kevinlemein.backend.model.Role;
import com.kevinlemein.backend.model.User;
import com.kevinlemein.backend.repository.AppointmentRepository;
import com.kevinlemein.backend.repository.DoctorRepository;
import com.kevinlemein.backend.repository.DrugRepository;
import com.kevinlemein.backend.repository.PrescriptionRepository;
import com.kevinlemein.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PrescriptionService {

    private final PrescriptionRepository prescriptionRepository;
    private final DrugRepository drugRepository;
    private final AppointmentRepository appointmentRepository;
    private final DoctorRepository doctorRepository;
    private final UserRepository userRepository;
    private final BillService billService;

    /** Outcome of createPrescription: created = false means an identical earlier request was replayed. */
    public record PrescriptionResult(PrescriptionResponse prescription, boolean created) {}

    /**
     * Prescribe = dispense: in this application creating a prescription is
     * the event that takes the drug out of stock and charges the patient.
     *
     * One transaction, locks always taken in the same order to avoid
     * deadlocks: appointment -> drug -> bill.
     *   1. Lock the appointment: serializes requests for the same visit, so
     *      the duplicate check below can't race.
     *   2. One prescription per drug per appointment. An identical retry
     *      returns the existing prescription (created = false) without
     *      touching stock or billing; a different request for the same drug
     *      is a 409 (edit or delete the existing one instead).
     *   3. Lock the drug row, require a price, check stock, deduct.
     *   4. Save the prescription and charge drugs.cost x quantity to the
     *      appointment's bill (BillService.chargeDispensedDrug).
     * Any failure rolls back stock, prescription and charge together.
     */
    @Transactional
    public PrescriptionResult createPrescription(CreatePrescriptionRequest request, Long authenticatedUserId) {
        Appointment appointment = appointmentRepository.findByIdForUpdate(request.getAppointmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found"));

        // prescriptions.doctor_id has a foreign key to doctors.id, NOT
        // users.id -- these are different ids. A user with ROLE_DOCTOR must
        // also have a corresponding row in `doctors` (created automatically
        // now when an admin/receptionist creates a doctor account -- see
        // UserService.createUser). If this lookup fails for an existing
        // doctor account created before that fix, they'll need a one-time
        // backfill row inserted directly, not something this method can fix
        // for them automatically.
        Doctor doctor = doctorRepository.findByUserId(authenticatedUserId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No doctor profile found for this account. Ask an admin to check your account setup."));

        // appointments.doctor_id is a users.id; only the assigned doctor may prescribe.
        if (!appointment.getDoctor().getId().equals(authenticatedUserId)) {
            throw new AccessDeniedException("Not the assigned doctor");
        }

        if (appointment.getAppointmentStatus() == AppointmentStatus.CANCELLED
                || appointment.getAppointmentStatus() == AppointmentStatus.NO_SHOW) {
            throw new ConflictException(ErrorCodes.APPOINTMENT_NOT_ACTIVE, "Cannot prescribe on a " + appointment.getAppointmentStatus() + " appointment");
        }

        List<Prescription> existing = prescriptionRepository
                .findByAppointmentIdAndDrugId(appointment.getId(), request.getDrugId());
        if (!existing.isEmpty()) {
            Prescription previous = existing.get(0);
            if (isSameRequest(previous, request)) {
                return new PrescriptionResult(withCharge(mapToResponse(previous)), false);
            }
            throw new ConflictException(ErrorCodes.ALREADY_PRESCRIBED,
                    "This drug is already prescribed on this appointment; edit or delete the existing prescription instead");
        }

        Drug drug = drugRepository.findByIdForUpdate(request.getDrugId())
                .orElseThrow(() -> new ResourceNotFoundException("Drug not found"));

        // drugs.cost is the only price the application has. No price -> no
        // dispensing, rather than handing out medication for free or
        // inventing a price.
        if (drug.getCost() == null || drug.getCost().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ConflictException(ErrorCodes.DRUG_NOT_PRICED, "%s has no price configured and cannot be dispensed".formatted(drug.getName()));
        }

        if (drug.getQuantity() < request.getQuantity()) {
            throw new ConflictException(ErrorCodes.INSUFFICIENT_STOCK,
                    "Insufficient stock for %s: only %d remaining, %d requested"
                            .formatted(drug.getName(), drug.getQuantity(), request.getQuantity()));
        }

        drug.setQuantity(drug.getQuantity() - request.getQuantity());
        drugRepository.save(drug);

        Prescription prescription = prescriptionRepository.save(Prescription.builder()
                .appointmentId(appointment.getId())
                .doctorId(doctor.getId())
                .drugId(drug.getId())
                .dossage(request.getDossage())
                .duration(request.getDuration())
                .notes(request.getNotes())
                .quantity(request.getQuantity())
                .build());

        BillLineItem charge = billService.chargeDispensedDrug(appointment, prescription, drug);

        PrescriptionResponse response = mapToResponse(prescription);
        response.setBillId(charge.getBill().getId());
        response.setChargeAmount(charge.getTotalPrice());
        return new PrescriptionResult(response, true);
    }

    private static boolean isSameRequest(Prescription p, CreatePrescriptionRequest r) {
        return Objects.equals(p.getQuantity(), r.getQuantity())
                && Objects.equals(p.getDossage(), r.getDossage())
                && Objects.equals(p.getDuration(), r.getDuration())
                && Objects.equals(blankToNull(p.getNotes()), blankToNull(r.getNotes()));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s;
    }

    private PrescriptionResponse withCharge(PrescriptionResponse response) {
        billService.findDispensingCharge(response.getId()).ifPresent(c -> {
            response.setBillId(c.getBill().getId());
            response.setChargeAmount(c.getTotalPrice());
        });
        return response;
    }

    public List<PrescriptionResponse> getAllPrescriptions() {
        return prescriptionRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /** Prescriptions issued by the doctor with this users.id, newest first. */
    public List<PrescriptionResponse> getPrescriptionsIssuedBy(Long doctorUserId) {
        return doctorRepository.findByUserId(doctorUserId)
                .map(d -> prescriptionRepository.findByDoctorId(d.getId()).stream()
                        .sorted(Comparator.comparing(Prescription::getCreatedOn).reversed())
                        .map(this::mapToResponse)
                        .collect(Collectors.toList()))
                .orElse(List.of());
    }

    public PrescriptionResponse getPrescriptionById(Long id) {
        return mapToResponse(prescriptionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Prescription not found")));
    }

    public List<PrescriptionResponse> getPrescriptionsByDoctor(Long doctorId) {
        return prescriptionRepository.findByDoctorId(doctorId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<PrescriptionResponse> getPrescriptionsByAppointment(Long appointmentId) {
        return prescriptionRepository.findByAppointmentId(appointmentId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Deliberately only edits dossage/duration/notes -- see
     * UpdatePrescriptionRequest for why drugId/quantity aren't editable here.
     */
    @Transactional
    public PrescriptionResponse updatePrescription(Long id, UpdatePrescriptionRequest request, User actor) {
        Prescription prescription = prescriptionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Prescription not found"));
        requireAuthor(prescription, actor);

        prescription.setDossage(request.getDossage());
        prescription.setDuration(request.getDuration());
        prescription.setNotes(request.getNotes());

        return mapToResponse(prescriptionRepository.save(prescription));
    }

    /**
     * Deleting a prescription undoes the dispensing in one transaction:
     * restores its quantity to stock and removes its DRUG_DISPENSE charge.
     * Refused (409) once the bill has payments — see
     * BillService.removeDispensingCharge. Same lock order as creation:
     * appointment -> drug -> bill.
     */
    @Transactional
    public void deletePrescription(Long id, User actor) {
        Prescription prescription = prescriptionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Prescription not found"));
        if (actor.getRole() != Role.ROLE_ADMIN) {
            requireAuthor(prescription, actor);
        }

        appointmentRepository.findByIdForUpdate(prescription.getAppointmentId());

        Drug drug = drugRepository.findByIdForUpdate(prescription.getDrugId())
                .orElseThrow(() -> new ResourceNotFoundException("Drug not found"));

        billService.removeDispensingCharge(prescription.getId());

        drug.setQuantity(drug.getQuantity() + prescription.getQuantity());
        drugRepository.save(drug);

        prescriptionRepository.delete(prescription);
    }

    /**
     * All prescriptions issued on this patient's appointments, newest first,
     * with drug and prescribing-doctor names filled in so the client doesn't
     * need access to the drug catalogue or staff list to display them.
     */
    public List<PrescriptionResponse> getPrescriptionsForPatient(Long patientId) {
        Map<Long, Appointment> appointments = appointmentRepository
                .findByPatientIdOrderByAppointmentDateTimeDesc(patientId).stream()
                .collect(Collectors.toMap(Appointment::getId, Function.identity()));
        if (appointments.isEmpty()) {
            return List.of();
        }

        List<Prescription> prescriptions = prescriptionRepository.findByAppointmentIdIn(appointments.keySet());
        Map<Long, Drug> drugs = drugRepository.findAllById(
                        prescriptions.stream().map(Prescription::getDrugId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Drug::getId, Function.identity()));
        Map<Long, Doctor> doctors = doctorRepository.findAllById(
                        prescriptions.stream().map(Prescription::getDoctorId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Doctor::getId, Function.identity()));
        Map<Long, User> doctorUsers = userRepository.findAllById(
                        doctors.values().stream().map(Doctor::getUserId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(User::getId, Function.identity()));

        return prescriptions.stream()
                .sorted(Comparator.comparing(Prescription::getCreatedOn).reversed())
                .map(p -> {
                    PrescriptionResponse r = mapToResponse(p);
                    Drug drug = drugs.get(p.getDrugId());
                    if (drug != null) {
                        r.setDrugName(drug.getName());
                        r.setDrugMilligrams(drug.getMilligrams());
                    }
                    Doctor doctor = doctors.get(p.getDoctorId());
                    User doctorUser = doctor == null ? null : doctorUsers.get(doctor.getUserId());
                    if (doctorUser != null) {
                        r.setPrescribedByFirstName(doctorUser.getFirstName());
                        r.setPrescribedByLastName(doctorUser.getLastName());
                    }
                    r.setAppointmentDateTime(appointments.get(p.getAppointmentId()).getAppointmentDateTime());
                    return r;
                })
                .collect(Collectors.toList());
    }

    /** Doctors may only change prescriptions they issued themselves. */
    private void requireAuthor(Prescription prescription, User actor) {
        Long actorDoctorId = doctorRepository.findByUserId(actor.getId()).map(Doctor::getId).orElse(null);
        if (!prescription.getDoctorId().equals(actorDoctorId)) {
            throw new AccessDeniedException("Not the prescribing doctor");
        }
    }

    private PrescriptionResponse mapToResponse(Prescription p) {
        return PrescriptionResponse.builder()
                .id(p.getId())
                .appointmentId(p.getAppointmentId())
                .doctorId(p.getDoctorId())
                .drugId(p.getDrugId())
                .dossage(p.getDossage())
                .duration(p.getDuration())
                .notes(p.getNotes())
                .quantity(p.getQuantity())
                .createdOn(p.getCreatedOn())
                .build();
    }
}