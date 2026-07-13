package com.kevinlemein.backend.exception;

/**
 * Thrown when a requested entity (patient, appointment, bill, user, ...)
 * doesn't exist. Mapped to HTTP 404 by GlobalExceptionHandler.
 */
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}