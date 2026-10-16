package com.kevinlemein.backend.model;

import java.util.EnumSet;
import java.util.Set;

/**
 * Clinic visit lifecycle:
 *
 *   PENDING ──► WAITING ──► IN_CONSULTATION ──► COMPLETED
 *      │           │
 *      ├──► CANCELLED ◄──┤
 *      └──► NO_SHOW  ◄───┘
 *
 * COMPLETED, CANCELLED and NO_SHOW are terminal.
 */
public enum AppointmentStatus {

    PENDING,
    WAITING,
    IN_CONSULTATION,
    COMPLETED,
    CANCELLED,
    NO_SHOW;

    /** Transitions a doctor may perform (on their own appointments only). */
    public static final Set<AppointmentStatus> DOCTOR_TARGETS = EnumSet.of(IN_CONSULTATION, COMPLETED);

    public boolean canTransitionTo(AppointmentStatus next) {
        return switch (this) {
            case PENDING -> next == WAITING || next == CANCELLED || next == NO_SHOW;
            case WAITING -> next == IN_CONSULTATION || next == CANCELLED || next == NO_SHOW;
            case IN_CONSULTATION -> next == COMPLETED;
            case COMPLETED, CANCELLED, NO_SHOW -> false;
        };
    }
}
