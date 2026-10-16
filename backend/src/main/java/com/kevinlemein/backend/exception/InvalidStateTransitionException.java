package com.kevinlemein.backend.exception;

/**
 * Thrown when a request is well-formed but not allowed from the resource's
 * current state — e.g. reopening a COMPLETED appointment. Mapped to HTTP 409
 * by GlobalExceptionHandler.
 */
public class InvalidStateTransitionException extends RuntimeException {
    public InvalidStateTransitionException(String message) {
        super(message);
    }
}
