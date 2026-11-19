package com.kevinlemein.backend.exception;

/**
 * Thrown when an operation would conflict with existing state — email/username
 * already taken, a bill that's already paid, etc. Mapped to HTTP 409 by
 * GlobalExceptionHandler.
 */
public class DuplicateResourceException extends RuntimeException {
    private final String code;

    public DuplicateResourceException(String message) {
        this(ErrorCodes.CONFLICT, message);
    }

    /** With a specific code from {@link ErrorCodes} that clients can branch on. */
    public DuplicateResourceException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}