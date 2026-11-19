package com.kevinlemein.backend.billing;

import com.kevinlemein.backend.dto.RecordPaymentRequest;
import com.kevinlemein.backend.model.*;
import com.kevinlemein.backend.repository.BillRepository;
import com.kevinlemein.backend.service.BillService;
import com.kevinlemein.backend.support.IntegrationTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class BillingIntegrationTest extends IntegrationTestBase {

    @Autowired BillService billService;
    @Autowired BillRepository billRepository;

    private String receptionist;
    private User receptionistUser;
    private Patient patient;

    @BeforeEach
    void setUp() throws Exception {
        receptionistUser = createUser(Role.ROLE_RECEPTIONIST, "recep");
        receptionist = login(receptionistUser);
        patient = createPatient("zawadi");
    }

    private long createBill(String extraJson) throws Exception {
        String body = mockMvc.perform(post("/api/bills").header("Authorization", bearer(receptionist))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"patientId\":" + patient.getId() + extraJson + "}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return ((Number) json(body, "$.data.id")).longValue();
    }

    private org.springframework.test.web.servlet.ResultActions addItem(long billId, String json) throws Exception {
        return mockMvc.perform(post("/api/bills/" + billId + "/items").header("Authorization", bearer(receptionist))
                .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private org.springframework.test.web.servlet.ResultActions pay(long billId, String json) throws Exception {
        return mockMvc.perform(post("/api/bills/" + billId + "/payments").header("Authorization", bearer(receptionist))
                .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    @Test
    void addingAChargeComputesTotalsAndBalance() throws Exception {
        long billId = createBill("");

        addItem(billId, "{\"description\":\"Walk-in fee\",\"quantity\":2,\"unitPrice\":150.00,\"source\":\"MANUAL\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("OPEN"))
                .andExpect(jsonPath("$.data.totalAmount").value(300.00))
                .andExpect(jsonPath("$.data.balance").value(300.00))
                .andExpect(jsonPath("$.data.lineItems", hasSize(1)))
                .andExpect(jsonPath("$.data.lineItems[0].totalPrice").value(300.00));
    }

    @Test
    void repeatingASourcedChargeIsIdempotent() throws Exception {
        long billId = createBill("");
        String charge = "{\"description\":\"Lab test\",\"quantity\":1,\"unitPrice\":800,\"source\":\"LAB\",\"sourceReferenceId\":42}";

        addItem(billId, charge).andExpect(status().isOk());
        addItem(billId, charge)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.lineItems", hasSize(1)))
                .andExpect(jsonPath("$.data.totalAmount").value(800.00));
    }

    @Test
    void partialThenFullPaymentTransitionsStatus() throws Exception {
        long billId = createBill("");
        addItem(billId, "{\"description\":\"Fee\",\"quantity\":1,\"unitPrice\":1000,\"source\":\"MANUAL\"}").andExpect(status().isOk());

        pay(billId, "{\"amount\":400,\"method\":\"CASH\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PARTIALLY_PAID"))
                .andExpect(jsonPath("$.data.balance").value(600.00));

        pay(billId, "{\"amount\":600,\"method\":\"MPESA\",\"reference\":\"QAB1CD2EF3\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PAID"))
                .andExpect(jsonPath("$.data.balance").value(0))
                .andExpect(jsonPath("$.data.payments", hasSize(2)))
                .andExpect(jsonPath("$.data.payments[0].recordedByUserId").value(receptionistUser.getId().intValue()));
    }

    @Test
    void overpaymentIsRejected() throws Exception {
        long billId = createBill("");
        addItem(billId, "{\"description\":\"Fee\",\"quantity\":1,\"unitPrice\":500,\"source\":\"MANUAL\"}").andExpect(status().isOk());

        pay(billId, "{\"amount\":500.01,\"method\":\"CASH\"}").andExpect(status().isBadRequest());
    }

    @Test
    void mpesaPaymentRequiresReference() throws Exception {
        long billId = createBill("");
        addItem(billId, "{\"description\":\"Fee\",\"quantity\":1,\"unitPrice\":500,\"source\":\"MANUAL\"}").andExpect(status().isOk());

        pay(billId, "{\"amount\":100,\"method\":\"MPESA\"}").andExpect(status().isBadRequest());
    }

    @Test
    void anMpesaReferenceCanOnlyBeRecordedOnce() throws Exception {
        long first = createBill("");
        long second = createBill("");
        addItem(first, "{\"description\":\"Fee\",\"quantity\":1,\"unitPrice\":500,\"source\":\"MANUAL\"}").andExpect(status().isOk());
        addItem(second, "{\"description\":\"Fee\",\"quantity\":1,\"unitPrice\":500,\"source\":\"MANUAL\"}").andExpect(status().isOk());

        pay(first, "{\"amount\":100,\"method\":\"MPESA\",\"reference\":\"QZZ9YY8XX7\"}").andExpect(status().isOk());
        pay(second, "{\"amount\":100,\"method\":\"MPESA\",\"reference\":\"QZZ9YY8XX7\"}").andExpect(status().isConflict());
    }

    @Test
    void cancelledBillRejectsChargesAndPayments() throws Exception {
        User admin = createUser(Role.ROLE_ADMIN, "admin1");
        long billId = createBill("");
        mockMvc.perform(patch("/api/bills/" + billId + "/cancel").header("Authorization", bearer(login(admin)))
                        .contentType(MediaType.TEXT_PLAIN).content("Created in error"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CANCELLED"));

        addItem(billId, "{\"description\":\"Fee\",\"quantity\":1,\"unitPrice\":500,\"source\":\"MANUAL\"}").andExpect(status().isBadRequest());
        pay(billId, "{\"amount\":1,\"method\":\"CASH\"}").andExpect(status().isBadRequest());
    }

    @Test
    void billForAnotherPatientsAppointmentIsRejected() throws Exception {
        Patient other = createPatient("jabari");
        User doctor = createDoctor("drkamau");
        Appointment appt = createAppointment(other, doctor, AppointmentStatus.PENDING);

        mockMvc.perform(post("/api/bills").header("Authorization", bearer(receptionist))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"patientId\":" + patient.getId() + ",\"appointmentId\":" + appt.getId() + "}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void concurrentPaymentsCannotExceedTheBalance() throws Exception {
        long billId = createBill("");
        addItem(billId, "{\"description\":\"Fee\",\"quantity\":1,\"unitPrice\":1000,\"source\":\"MANUAL\"}").andExpect(status().isOk());

        int threads = 6;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger succeeded = new AtomicInteger();
        List<Future<?>> futures = new ArrayList<>();
        for (int i = 0; i < threads; i++) {
            futures.add(pool.submit(() -> {
                start.await();
                RecordPaymentRequest req = new RecordPaymentRequest();
                req.setAmount(new BigDecimal("600"));
                req.setMethod(PaymentMethod.CASH);
                try {
                    billService.recordPayment(billId, req, receptionistUser.getId());
                    succeeded.incrementAndGet();
                } catch (RuntimeException expected) {
                    // over-balance rejections are the expected outcome for all but one
                }
                return null;
            }));
        }
        start.countDown();
        for (Future<?> f : futures) f.get(30, TimeUnit.SECONDS);
        pool.shutdown();

        assertThat(succeeded.get()).isEqualTo(1);
        BigDecimal paid = jdbc.queryForObject("SELECT COALESCE(SUM(amount),0) FROM payments WHERE bill_id = ?", BigDecimal.class, billId);
        assertThat(paid).isEqualByComparingTo("600");
    }
}
