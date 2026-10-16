package com.kevinlemein.backend.medication;

import com.kevinlemein.backend.dto.CreatePrescriptionRequest;
import com.kevinlemein.backend.dto.RecordPaymentRequest;
import com.kevinlemein.backend.model.*;
import com.kevinlemein.backend.repository.BillRepository;
import com.kevinlemein.backend.service.BillService;
import com.kevinlemein.backend.service.PrescriptionService;
import com.kevinlemein.backend.support.IntegrationTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Prescribing is the dispensing event in this application: creating a
 * prescription deducts stock and charges the patient. Both must be done by
 * the server, priced from drugs.cost, exactly once, and never oversell.
 */
class MedicationDispensingIntegrationTest extends IntegrationTestBase {

    @Autowired PrescriptionService prescriptionService;
    @Autowired BillService billService;
    @Autowired BillRepository billRepository;

    private User doctorA;
    private String tokenA;
    private String tokenB;
    private String receptionist;
    private User receptionistUser;
    private Patient patient;
    private Appointment appointment;
    private Drug amoxicillin;

    @BeforeEach
    void setUp() throws Exception {
        doctorA = createDoctor("drkamau");
        tokenA = login(doctorA);
        tokenB = login(createDoctor("drotieno"));
        receptionistUser = createUser(Role.ROLE_RECEPTIONIST, "recep");
        receptionist = login(receptionistUser);
        patient = createPatient("zawadi");
        appointment = createAppointment(patient, doctorA, AppointmentStatus.IN_CONSULTATION);
        amoxicillin = createDrug("Amoxicillin", "120.00", 50);
    }

    // ---------- helpers ----------

    private String body(long appointmentId, long drugId, int quantity, String extra) {
        return "{\"appointmentId\":" + appointmentId + ",\"drugId\":" + drugId
                + ",\"dossage\":\"1 x 3\",\"duration\":\"5 days\",\"quantity\":" + quantity + extra + "}";
    }

    private ResultActions prescribe(String token, long appointmentId, long drugId, int quantity, String extra) throws Exception {
        return mockMvc.perform(post("/api/prescriptions").header("Authorization", bearer(token))
                .contentType(MediaType.APPLICATION_JSON).content(body(appointmentId, drugId, quantity, extra)));
    }

    private ResultActions prescribe(long appointmentId, long drugId, int quantity) throws Exception {
        return prescribe(tokenA, appointmentId, drugId, quantity, "");
    }

    private int stock(Drug drug) {
        return drugRepository.findById(drug.getId()).orElseThrow().getQuantity();
    }

    private int count(String table) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM " + table, Integer.class);
    }

    private int drugCharges() {
        return jdbc.queryForObject("SELECT COUNT(*) FROM bill_line_items WHERE source = 'DRUG_DISPENSE'", Integer.class);
    }

    private Drug createUnpricedDrug(String name, BigDecimal cost) {
        return drugRepository.save(Drug.builder().name(name).milligrams(250).category("Test").cost(cost).quantity(40).build());
    }

    private void assertNothingDispensed(Drug drug, int expectedStock) {
        assertThat(stock(drug)).isEqualTo(expectedStock);
        assertThat(count("prescriptions")).isZero();
        assertThat(drugCharges()).isZero();
    }

    // ---------- 1. authoritative pricing ----------

    @Test
    void chargeUsesServerPriceAndIgnoresAnyClientSuppliedPrice() throws Exception {
        prescribe(tokenA, appointment.getId(), amoxicillin.getId(), 3, ",\"unitPrice\":1,\"cost\":1,\"totalPrice\":1")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.chargeAmount").value(360.00));

        assertThat(jdbc.queryForObject(
                "SELECT unit_price FROM bill_line_items WHERE source = 'DRUG_DISPENSE'", BigDecimal.class))
                .isEqualByComparingTo("120.00");
        assertThat(jdbc.queryForObject(
                "SELECT total_price FROM bill_line_items WHERE source = 'DRUG_DISPENSE'", BigDecimal.class))
                .isEqualByComparingTo("360.00");
        assertThat(stock(amoxicillin)).isEqualTo(47);
    }

    @Test
    void clientsCannotPostServerOwnedChargeSources() throws Exception {
        long billId = billRepository.save(Bill.builder().patient(patient).appointment(appointment).build()).getId();
        for (String source : new String[]{"DRUG_DISPENSE", "CONSULTATION"}) {
            mockMvc.perform(post("/api/bills/" + billId + "/items").header("Authorization", bearer(receptionist))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"description\":\"x\",\"quantity\":1,\"unitPrice\":1,\"source\":\"" + source + "\",\"sourceReferenceId\":999}"))
                    .andExpect(status().isBadRequest());
        }
        assertThat(count("bill_line_items")).isZero();
    }

    // ---------- 2. quantity validation ----------

    @Test
    void invalidQuantitiesAreRejected() throws Exception {
        prescribe(appointment.getId(), amoxicillin.getId(), 0).andExpect(status().isBadRequest());
        prescribe(appointment.getId(), amoxicillin.getId(), -2).andExpect(status().isBadRequest());
        assertNothingDispensed(amoxicillin, 50);
    }

    // ---------- 3. ineligible prescriptions ----------

    @Test
    void anotherDoctorsAppointmentCannotBeCharged() throws Exception {
        prescribe(tokenB, appointment.getId(), amoxicillin.getId(), 2, "").andExpect(status().isForbidden());
        assertNothingDispensed(amoxicillin, 50);
    }

    @Test
    void cancelledOrNoShowAppointmentsCannotBeCharged() throws Exception {
        for (AppointmentStatus s : new AppointmentStatus[]{AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW}) {
            Appointment a = createAppointment(patient, doctorA, s);
            prescribe(a.getId(), amoxicillin.getId(), 2).andExpect(status().isConflict());
        }
        assertNothingDispensed(amoxicillin, 50);
    }

    @Test
    void unpricedDrugsCannotBeDispensed() throws Exception {
        Drug noPrice = createUnpricedDrug("Unpriced", null);
        Drug zeroPrice = createUnpricedDrug("Zero priced", BigDecimal.ZERO);

        prescribe(appointment.getId(), noPrice.getId(), 1).andExpect(status().isConflict());
        prescribe(appointment.getId(), zeroPrice.getId(), 1).andExpect(status().isConflict());

        assertThat(stock(noPrice)).isEqualTo(40);
        assertThat(stock(zeroPrice)).isEqualTo(40);
        assertThat(count("prescriptions")).isZero();
        assertThat(drugCharges()).isZero();
    }

    @Test
    void unknownDrugOrAppointmentIs404() throws Exception {
        prescribe(appointment.getId(), 99999, 1).andExpect(status().isNotFound());
        prescribe(99999, amoxicillin.getId(), 1).andExpect(status().isNotFound());
        assertNothingDispensed(amoxicillin, 50);
    }

    // ---------- 4 / 10. duplicates and retries ----------

    @Test
    void identicalRetryReturnsTheExistingPrescriptionWithoutChargingOrDeductingAgain() throws Exception {
        String first = prescribe(appointment.getId(), amoxicillin.getId(), 3)
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();

        prescribe(appointment.getId(), amoxicillin.getId(), 3)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value((Integer) json(first, "$.data.id")))
                .andExpect(jsonPath("$.data.chargeAmount").value(360.00));

        assertThat(count("prescriptions")).isEqualTo(1);
        assertThat(drugCharges()).isEqualTo(1);
        assertThat(stock(amoxicillin)).isEqualTo(47);
    }

    @Test
    void sameDrugWithDifferentDetailsOnTheSameAppointmentIsAConflict() throws Exception {
        prescribe(appointment.getId(), amoxicillin.getId(), 3).andExpect(status().isCreated());
        prescribe(appointment.getId(), amoxicillin.getId(), 5).andExpect(status().isConflict());

        assertThat(count("prescriptions")).isEqualTo(1);
        assertThat(drugCharges()).isEqualTo(1);
        assertThat(stock(amoxicillin)).isEqualTo(47);
    }

    @Test
    void concurrentIdenticalRequestsDispenseOnce() throws Exception {
        int succeeded = runConcurrently(6, i -> request(appointment.getId(), amoxicillin.getId(), 3));

        assertThat(succeeded).isEqualTo(6); // first creates, the rest replay
        assertThat(count("prescriptions")).isEqualTo(1);
        assertThat(drugCharges()).isEqualTo(1);
        assertThat(stock(amoxicillin)).isEqualTo(47);
    }

    // ---------- 5. legitimate billing ----------

    @Test
    void chargeLandsOnTheAppointmentsExistingBill() throws Exception {
        String booked = mockMvc.perform(post("/api/appointments").header("Authorization", bearer(receptionist))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"patientId\":" + patient.getId() + ",\"doctorId\":" + doctorA.getId()
                                + ",\"appointmentDateTime\":\"" + futureSlot(2, 11) + "\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long apptId = ((Number) json(booked, "$.data.id")).longValue();
        jdbc.update("UPDATE appointments SET status = 'IN_CONSULTATION' WHERE id = ?", apptId);

        prescribe(apptId, amoxicillin.getId(), 2).andExpect(status().isCreated());

        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM bills WHERE appointment_id = ?", Integer.class, apptId)).isEqualTo(1);
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM bill_line_items li JOIN bills b ON b.id = li.bill_id WHERE b.appointment_id = ?",
                Integer.class, apptId)).isEqualTo(2); // consultation + drug
    }

    @Test
    void billIsCreatedWhenTheAppointmentHasNone() throws Exception {
        prescribe(appointment.getId(), amoxicillin.getId(), 1)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.billId").exists());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM bills WHERE appointment_id = ?", Integer.class, appointment.getId()))
                .isEqualTo(1);
    }

    @Test
    void drugChargeReopensAPaidBill() throws Exception {
        Bill bill = billRepository.save(Bill.builder().patient(patient).appointment(appointment).build());
        jdbc.update("INSERT INTO bill_line_items (bill_id, description, quantity, unit_price, total_price, source, created_at) "
                + "VALUES (?, 'Consultation Fee', 1, 500, 500, 'MANUAL', now())", bill.getId());
        RecordPaymentRequest pay = new RecordPaymentRequest();
        pay.setAmount(new BigDecimal("500"));
        pay.setMethod(PaymentMethod.CASH);
        billService.recordPayment(bill.getId(), pay, receptionistUser.getId());
        assertThat(billRepository.findById(bill.getId()).orElseThrow().getStatus()).isEqualTo(BillStatus.PAID);

        prescribe(appointment.getId(), amoxicillin.getId(), 2).andExpect(status().isCreated());

        assertThat(jdbc.queryForObject("SELECT status FROM bills WHERE id = ?", String.class, bill.getId()))
                .isEqualTo("PARTIALLY_PAID");
    }

    // ---------- 6 / 11. failures roll back ----------

    @Test
    void cancelledBillRollsBackStockAndPrescription() throws Exception {
        Bill bill = billRepository.save(Bill.builder().patient(patient).appointment(appointment).build());
        jdbc.update("UPDATE bills SET status = 'CANCELLED' WHERE id = ?", bill.getId());

        prescribe(appointment.getId(), amoxicillin.getId(), 4).andExpect(status().isConflict());
        assertNothingDispensed(amoxicillin, 50);
    }

    // ---------- 7. insufficient stock ----------

    @Test
    void insufficientStockIsRejectedWithoutSideEffects() throws Exception {
        prescribe(appointment.getId(), amoxicillin.getId(), 51)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Insufficient stock for Amoxicillin: only 50 remaining, 51 requested"));
        assertNothingDispensed(amoxicillin, 50);
    }

    // ---------- 8 / 9. concurrency ----------

    @Test
    void concurrentDispensingCannotOversellOrGoNegative() throws Exception {
        Drug scarce = createDrug("Scarce", "50.00", 10);
        int threads = 8;
        List<Appointment> appointments = new ArrayList<>();
        for (int i = 0; i < threads; i++) {
            appointments.add(createAppointment(patient, doctorA, AppointmentStatus.IN_CONSULTATION));
        }

        int succeeded = runConcurrently(threads, i -> request(appointments.get(i).getId(), scarce.getId(), 3));

        assertThat(succeeded).isEqualTo(3); // 3 x 3 = 9 <= 10; a 4th would need 12
        assertThat(stock(scarce)).isEqualTo(1);
        assertThat(count("prescriptions")).isEqualTo(3);
        assertThat(drugCharges()).isEqualTo(3);
        Integer dispensed = jdbc.queryForObject("SELECT COALESCE(SUM(quantity),0) FROM prescriptions WHERE drug_id = ?",
                Integer.class, scarce.getId());
        assertThat(dispensed + stock(scarce)).isEqualTo(10);
    }

    // ---------- 12. existing rules: deletion ----------

    @Test
    void deletingAPrescriptionRestoresStockAndRemovesItsCharge() throws Exception {
        String created = prescribe(appointment.getId(), amoxicillin.getId(), 3)
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long id = ((Number) json(created, "$.data.id")).longValue();

        mockMvc.perform(delete("/api/prescriptions/" + id).header("Authorization", bearer(tokenA)))
                .andExpect(status().isOk());

        assertThat(stock(amoxicillin)).isEqualTo(50);
        assertThat(count("prescriptions")).isZero();
        assertThat(drugCharges()).isZero();
    }

    @Test
    void deletingIsBlockedOnceTheBillHasPayments() throws Exception {
        String created = prescribe(appointment.getId(), amoxicillin.getId(), 3)
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long id = ((Number) json(created, "$.data.id")).longValue();
        long billId = ((Number) json(created, "$.data.billId")).longValue();
        RecordPaymentRequest pay = new RecordPaymentRequest();
        pay.setAmount(new BigDecimal("100"));
        pay.setMethod(PaymentMethod.CASH);
        billService.recordPayment(billId, pay, receptionistUser.getId());

        mockMvc.perform(delete("/api/prescriptions/" + id).header("Authorization", bearer(tokenA)))
                .andExpect(status().isConflict());

        assertThat(stock(amoxicillin)).isEqualTo(47);
        assertThat(count("prescriptions")).isEqualTo(1);
        assertThat(drugCharges()).isEqualTo(1);
    }

    // ---------- concurrency harness ----------

    private CreatePrescriptionRequest request(long appointmentId, long drugId, int quantity) {
        CreatePrescriptionRequest r = new CreatePrescriptionRequest();
        r.setAppointmentId(appointmentId);
        r.setDrugId(drugId);
        r.setDossage("1 x 3");
        r.setDuration("5 days");
        r.setQuantity(quantity);
        return r;
    }

    /**
     * Calls the service from N threads released together by a latch, so the
     * transactions genuinely overlap. Returns how many calls succeeded.
     */
    private int runConcurrently(int threads, java.util.function.IntFunction<CreatePrescriptionRequest> requests) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger succeeded = new AtomicInteger();
        List<Future<?>> futures = new ArrayList<>();
        for (int i = 0; i < threads; i++) {
            CreatePrescriptionRequest req = requests.apply(i);
            futures.add(pool.submit(() -> {
                start.await();
                try {
                    prescriptionService.createPrescription(req, doctorA.getId());
                    succeeded.incrementAndGet();
                } catch (RuntimeException expected) {
                    // insufficient stock / conflict for the losers
                }
                return null;
            }));
        }
        start.countDown();
        for (Future<?> f : futures) f.get(60, TimeUnit.SECONDS);
        pool.shutdown();
        return succeeded.get();
    }
}
