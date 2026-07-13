package com.kevinlemein.backend.exception;

/**
 * Thrown when an operation would conflict with existing state — email/username
 * already taken, a bill that's already paid, etc. Mapped to HTTP 409 by
 * GlobalExceptionHandler.
 */
public class DuplicateResourceException extends RuntimeException {
    public DuplicateResourceException(String message) {
        super(message);
    }
}