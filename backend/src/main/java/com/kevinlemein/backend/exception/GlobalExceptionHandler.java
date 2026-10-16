package com.kevinlemein.backend.exception;

import com.kevinlemein.backend.dto.ApiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Maps exceptions to the ApiResponse error envelope.
 *
 * Rule: only messages we wrote ourselves (domain exceptions, validation
 * messages, fixed strings) are returned to clients. Framework, JDK and
 * database exception messages can contain parser internals, SQL, table or
 * column names, so they are logged server-side and replaced by a generic
 * message in the response.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationErrors(
            MethodArgumentNotValidException ex
    ) {
        String errors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));

        // Per-field messages for form UIs; first message wins per field.
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(fe -> fieldErrors.putIfAbsent(fe.getField(), fe.getDefaultMessage()));

        return ResponseEntity
                .badRequest()
                .body(ApiResponse.error(ErrorCodes.VALIDATION_FAILED, errors, fieldErrors));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleUnreadableBody(HttpMessageNotReadableException ex) {
        return ResponseEntity
                .badRequest()
                .body(ApiResponse.error(ErrorCodes.MALFORMED_REQUEST, "Malformed or unreadable request body"));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Void>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return ResponseEntity
                .badRequest()
                .body(ApiResponse.error(ErrorCodes.BAD_REQUEST, "Invalid value for parameter '" + ex.getName() + "'"));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiResponse<Void>> handleMissingParameter(MissingServletRequestParameterException ex) {
        return ResponseEntity
                .badRequest()
                .body(ApiResponse.error(ErrorCodes.BAD_REQUEST, "Missing required parameter '" + ex.getParameterName() + "'"));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNoResource(NoResourceFoundException ex) {
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(ErrorCodes.NOT_FOUND, "Resource not found"));
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex) {
        return ResponseEntity
                .status(HttpStatus.METHOD_NOT_ALLOWED)
                .body(ApiResponse.error(ErrorCodes.METHOD_NOT_ALLOWED, "HTTP method not supported for this resource"));
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> handleMediaTypeNotSupported(HttpMediaTypeNotSupportedException ex) {
        return ResponseEntity
                .status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
                .body(ApiResponse.error(ErrorCodes.UNSUPPORTED_MEDIA_TYPE, "Unsupported content type"));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error(ErrorCodes.INVALID_CREDENTIALS, "Invalid email or password"));
    }

    /**
     * Thrown by @PreAuthorize / @PostAuthorize (including the ownership
     * checks in PatientSecurity) when an authenticated user is not allowed
     * to access a specific resource. Returned as 403, not 500 — and never
     * echoes ex.getMessage(), which for access-denied exceptions can hint
     * at what check failed.
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error(ErrorCodes.FORBIDDEN, "You do not have permission to access this resource"));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleResourceNotFound(ResourceNotFoundException ex) {
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(ErrorCodes.NOT_FOUND, ex.getMessage()));
    }

    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<ApiResponse<Void>> handleDuplicateResource(DuplicateResourceException ex) {
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(ApiResponse.error(ex.getCode(), ex.getMessage()));
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ApiResponse<Void>> handleConflict(ConflictException ex) {
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(ApiResponse.error(ex.getCode(), ex.getMessage()));
    }

    @ExceptionHandler(InvalidStateTransitionException.class)
    public ResponseEntity<ApiResponse<Void>> handleInvalidStateTransition(InvalidStateTransitionException ex) {
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(ApiResponse.error(ErrorCodes.INVALID_STATE_TRANSITION, ex.getMessage()));
    }

    /**
     * A database constraint rejected the write (e.g. a duplicate charge that
     * raced past the service-level check). The constraint text names tables
     * and columns, so it is logged, never returned.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        // Only the constraint name: the database's detail text contains the
        // offending values (emails, phone numbers), which must not be logged.
        log.warn("Data integrity violation (constraint: {})", constraintName(ex));
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(ApiResponse.error(ErrorCodes.CONFLICT, "The request conflicts with existing data. Refresh and try again."));
    }

    /** Lock timeout / deadlock while another request held the same row. Safe to retry. */
    @ExceptionHandler(PessimisticLockingFailureException.class)
    public ResponseEntity<ApiResponse<Void>> handleLockFailure(PessimisticLockingFailureException ex) {
        log.warn("Lock failure: {}", ex.getClass().getSimpleName());
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(ApiResponse.error(ErrorCodes.CONCURRENT_UPDATE, "The record is being updated by another request. Please try again."));
    }

    @ExceptionHandler(InvalidRequestException.class)
    public ResponseEntity<ApiResponse<Void>> handleInvalidRequest(InvalidRequestException ex) {
        return ResponseEntity
                .badRequest()
                .body(ApiResponse.error(ex.getCode(), ex.getMessage()));
    }

    /**
     * Anything not handled above is a bug or an infrastructure failure, not a
     * client error: 500, logged in full, generic message to the client.
     * (Previously this returned 400 with ex.getMessage(), which leaked
     * NullPointerException and parser text to clients.)
     */
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ApiResponse<Void>> handleRuntimeException(RuntimeException ex) {
        log.error("Unhandled runtime exception", ex);
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(ErrorCodes.INTERNAL_ERROR, "An unexpected error occurred. Please try again later."));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGenericException(Exception ex) {
        log.error("Unhandled exception", ex);
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(ErrorCodes.INTERNAL_ERROR, "An unexpected error occurred. Please try again later."));
    }

    private static String constraintName(Throwable ex) {
        for (Throwable t = ex; t != null; t = t.getCause()) {
            if (t instanceof org.hibernate.exception.ConstraintViolationException cve && cve.getConstraintName() != null) {
                return cve.getConstraintName();
            }
        }
        return "unknown";
    }
}
