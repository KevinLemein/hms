package com.kevinlemein.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.ZoneId;

/**
 * The clinic's clock. Business rules about dates ("today's appointments",
 * "can't book in the past") use this, not the server's default time zone:
 * the production container runs in UTC while the clinic and the times staff
 * type in are East Africa Time.
 *
 * Audit timestamps (createdAt, paidAt, ...) are unchanged and still use the
 * server clock, so existing stored values keep a single meaning.
 */
@Configuration
public class TimeConfig {

    @Bean
    public Clock clinicClock(@Value("${app.clinic.timezone:Africa/Nairobi}") String zone) {
        return Clock.system(ZoneId.of(zone));
    }
}
