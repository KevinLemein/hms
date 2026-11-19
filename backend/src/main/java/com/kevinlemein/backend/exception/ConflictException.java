package com.kevinlemein.backend.exception;

/**
 * Thrown when a well-formed request can't be carried out because of the
 * current state of the data — insufficient stock, an unpriced drug, a
 * cancelled bill, a charge that already has payments against it. Mapped to
 * HTTP 409 by GlobalExceptionHandler. The message must be safe to show to
 * the client.
 */
public class ConflictException extends RuntimeException {
    private final String code;

    public ConflictException(String message) {
        this(ErrorCodes.CONFLICT, message);
    }

    /** With a specific code from {@link ErrorCodes} that clients can branch on. */
    public ConflictException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
