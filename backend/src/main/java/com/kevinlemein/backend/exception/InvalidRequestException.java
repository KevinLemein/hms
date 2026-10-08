package com.kevinlemein.backend.exception;

/**
 * Thrown for business-rule violations that aren't field-level validation
 * (that's handled by MethodArgumentNotValidException/@Valid) — e.g. an
 * invalid enum value, booking an appointment in the past, a role a user
 * isn't allowed to assign. Mapped to HTTP 400 by GlobalExceptionHandler.
 */
public class InvalidRequestException extends RuntimeException {
    public InvalidRequestException(String message) {
        super(message);
    }
}