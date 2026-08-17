package com.kevinlemein.backend.service;

import com.kevinlemein.backend.dto.CreatePrescriptionRequest;
import com.kevinlemein.backend.dto.PrescriptionResponse;
import com.kevinlemein.backend.dto.UpdatePrescriptionRequest;
import com.kevinlemein.backend.exception.InvalidRequestException;
import com.kevinlemein.backend.exception.ResourceNotFoundException;
import com.kevinlemein.backend.model.Appointment;
import com.kevinlemein.backend.model.Doctor;
import com.kevinlemein.backend.model.Drug;
import com.kevinlemein.backend.model.Prescription;
import com.kevinlemein.backend.repository.AppointmentRepository;
import com.kevinlemein.backend.repository.DoctorRepository;
import com.kevinlemein.backend.repository.DrugRepository;
import com.kevinlemein.backend.repository.PrescriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PrescriptionService {

    private final PrescriptionRepository prescriptionRepository;
    private final DrugRepository drugRepository;
    private final AppointmentRepository appointmentRepository;
    private final DoctorRepository doctorRepository;

    /**
     * Creates a prescription and decrements the drug's stock in the same
     * transaction -- if either half fails, both roll back, so stock can
     * never drift out of sync with actual prescriptions issued.
     */
    @Transactional
    public PrescriptionResponse createPrescription(CreatePrescriptionRequest request, Long authenticatedUserId) {
        Appointment appointment = appointmentRepository.findById(request.getAppointmentId())
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

        Drug drug = drugRepository.findById(request.getDrugId())
                .orElseThrow(() -> new ResourceNotFoundException("Drug not found"));

        if (drug.getQuantity() < request.getQuantity()) {
            throw new InvalidRequestException(
                    "Insufficient stock for %s: only %d remaining, %d requested"
                            .formatted(drug.getName(), drug.getQuantity(), request.getQuantity()));
        }

        drug.setQuantity(drug.getQuantity() - request.getQuantity());
        drugRepository.save(drug);

        Prescription prescription = Prescription.builder()
                .appointmentId(appointment.getId())
                .doctorId(doctor.getId())
                .drugId(drug.getId())
                .dossage(request.getDossage())
                .duration(request.getDuration())
                .notes(request.getNotes())
                .quantity(request.getQuantity())
                .build();

        return mapToResponse(prescriptionRepository.save(prescription));
    }

    public List<PrescriptionResponse> getAllPrescriptions() {
        return prescriptionRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
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
    public PrescriptionResponse updatePrescription(Long id, UpdatePrescriptionRequest request) {
        Prescription prescription = prescriptionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Prescription not found"));

        prescription.setDossage(request.getDossage());
        prescription.setDuration(request.getDuration());
        prescription.setNotes(request.getNotes());

        return mapToResponse(prescriptionRepository.save(prescription));
    }

    /**
     * Deleting a prescription restores its quantity back to the drug's
     * stock, in the same transaction, so deletions can't leave stock
     * permanently short.
     */
    @Transactional
    public void deletePrescription(Long id) {
        Prescription prescription = prescriptionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Prescription not found"));

        Drug drug = drugRepository.findById(prescription.getDrugId())
                .orElseThrow(() -> new ResourceNotFoundException("Drug not found"));

        drug.setQuantity(drug.getQuantity() + prescription.getQuantity());
        drugRepository.save(drug);

        prescriptionRepository.delete(prescription);
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