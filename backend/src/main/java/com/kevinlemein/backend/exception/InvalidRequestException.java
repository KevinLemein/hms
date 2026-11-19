package com.kevinlemein.backend.exception;

/**
 * Thrown for business-rule violations that aren't field-level validation
 * (that's handled by MethodArgumentNotValidException/@Valid) — e.g. an
 * invalid enum value, booking an appointment in the past, a role a user
 * isn't allowed to assign. Mapped to HTTP 400 by GlobalExceptionHandler.
 */
public class InvalidRequestException extends RuntimeException {
    private final String code;

    public InvalidRequestException(String message) {
        this(ErrorCodes.BAD_REQUEST, message);
    }

    /** With a specific code from {@link ErrorCodes} that clients can branch on. */
    public InvalidRequestException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}