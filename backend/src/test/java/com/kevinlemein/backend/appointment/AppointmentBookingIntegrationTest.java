package com.kevinlemein.backend.appointment;

import com.kevinlemein.backend.dto.BookAppointmentRequest;
import com.kevinlemein.backend.model.*;
import com.kevinlemein.backend.service.AppointmentService;
import com.kevinlemein.backend.support.IntegrationTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AppointmentBookingIntegrationTest extends IntegrationTestBase {

    @Autowired AppointmentService appointmentService;

    private String receptionist;
    private Patient patient;
    private Patient otherPatient;
    private User doctor;
    private User otherDoctor;

    @BeforeEach
    void setUp() throws Exception {
        receptionist = login(createUser(Role.ROLE_RECEPTIONIST, "recep"));
        patient = createPatient("zawadi");
        otherPatient = createPatient("jabari");
        doctor = createDoctor("drkamau");
        otherDoctor = createDoctor("drotieno");
    }

    private ResultActions book(Patient p, User d, String slot) throws Exception {
        return mockMvc.perform(post("/api/appointments").header("Authorization", bearer(receptionist))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"patientId\":" + p.getId() + ",\"doctorId\":" + d.getId()
                        + ",\"appointmentDateTime\":\"" + slot + "\",\"reason\":\"Fictional checkup\"}"));
    }

    private int count(String table) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM " + table, Integer.class);
    }

    @Test
    void bookingCreatesExactlyOneBillWithOneConsultationCharge() throws Exception {
        String body = book(patient, doctor, futureSlot(3, 10))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.appointmentStatus").value("PENDING"))
                .andReturn().getResponse().getContentAsString();
        long appointmentId = ((Number) json(body, "$.data.id")).longValue();

        assertThat(count("appointments")).isEqualTo(1);
        assertThat(count("bills")).isEqualTo(1);
        assertThat(count("bill_line_items")).isEqualTo(1);
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM bill_line_items WHERE source = 'CONSULTATION' AND source_reference_id = ? AND total_price = 500.00",
                Integer.class, appointmentId)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT appointment_id FROM bills", Long.class)).isEqualTo(appointmentId);
    }

    @Test
    void sameDoctorSameStartTimeIsRejected() throws Exception {
        String slot = futureSlot(3, 10);
        book(patient, doctor, slot).andExpect(status().isCreated());
        book(otherPatient, doctor, slot).andExpect(status().isConflict());

        assertThat(count("appointments")).isEqualTo(1);
        assertThat(count("bills")).isEqualTo(1);
    }

    @Test
    void differentDoctorSameStartTimeIsAllowed() throws Exception {
        String slot = futureSlot(3, 10);
        book(patient, doctor, slot).andExpect(status().isCreated());
        book(otherPatient, otherDoctor, slot).andExpect(status().isCreated());
    }

    @Test
    void cancelledSlotCanBeRebooked() throws Exception {
        String slot = futureSlot(3, 10);
        String body = book(patient, doctor, slot).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long id = ((Number) json(body, "$.data.id")).longValue();
        jdbc.update("UPDATE appointments SET status = 'CANCELLED' WHERE id = ?", id);

        book(otherPatient, doctor, slot).andExpect(status().isCreated());
    }

    @Test
    void bookingInThePastIsRejectedWithoutSideEffects() throws Exception {
        book(patient, doctor, "2020-01-01T10:00:00").andExpect(status().isBadRequest());
        assertThat(count("appointments")).isZero();
        assertThat(count("bills")).isZero();
    }

    @Test
    void unparseableDateIsA400WithASafeMessage() throws Exception {
        book(patient, doctor, "not-a-date")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Appointment date and time must be in the format yyyy-MM-ddTHH:mm:ss"));
    }

    @Test
    void bookingANonDoctorIsRejectedWithoutSideEffects() throws Exception {
        User notADoctor = createUser(Role.ROLE_RECEPTIONIST, "recep2");
        book(patient, notADoctor, futureSlot(3, 10)).andExpect(status().isBadRequest());
        assertThat(count("appointments")).isZero();
        assertThat(count("bills")).isZero();
    }

    @Test
    void bookingADisabledDoctorIsRejected() throws Exception {
        jdbc.update("UPDATE users SET enabled = false WHERE id = ?", doctor.getId());
        book(patient, doctor, futureSlot(3, 10)).andExpect(status().isBadRequest());
    }

    @Test
    void concurrentBookingsOfOneSlotProduceExactlyOneAppointment() throws Exception {
        String slot = futureSlot(4, 9);
        int threads = 6;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger succeeded = new AtomicInteger();
        List<Future<?>> futures = new ArrayList<>();
        for (int i = 0; i < threads; i++) {
            Patient p = (i % 2 == 0) ? patient : otherPatient;
            futures.add(pool.submit(() -> {
                start.await();
                try {
                    appointmentService.bookAppointment(BookAppointmentRequest.builder()
                            .patientId(p.getId()).doctorId(doctor.getId())
                            .appointmentDateTime(slot).reason("race").build());
                    succeeded.incrementAndGet();
                } catch (RuntimeException expected) {
                    // conflicts are the expected outcome for all but one
                }
                return null;
            }));
        }
        start.countDown();
        for (Future<?> f : futures) f.get(30, TimeUnit.SECONDS);
        pool.shutdown();

        assertThat(succeeded.get()).isEqualTo(1);
        assertThat(count("appointments")).isEqualTo(1);
        assertThat(count("bills")).isEqualTo(1);
        assertThat(count("bill_line_items")).isEqualTo(1);
    }
}
