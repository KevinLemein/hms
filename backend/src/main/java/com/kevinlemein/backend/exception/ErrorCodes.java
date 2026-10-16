package com.kevinlemein.backend.exception;

/**
 * Stable, machine-readable error codes returned in ApiResponse.code.
 * Clients branch on these, never on the human-readable message, so the
 * values must not change once published. Add new codes; don't rename.
 */
public final class ErrorCodes {

    private ErrorCodes() {}

    // Generic, one per HTTP error class
    public static final String UNAUTHENTICATED = "UNAUTHENTICATED";       // 401
    public static final String INVALID_CREDENTIALS = "INVALID_CREDENTIALS"; // 401 on sign-in
    public static final String FORBIDDEN = "FORBIDDEN";                   // 403
    public static final String NOT_FOUND = "NOT_FOUND";                   // 404
    public static final String BAD_REQUEST = "BAD_REQUEST";               // 400
    public static final String VALIDATION_FAILED = "VALIDATION_FAILED";   // 400, see ApiResponse.errors
    public static final String MALFORMED_REQUEST = "MALFORMED_REQUEST";   // 400, unreadable body
    public static final String METHOD_NOT_ALLOWED = "METHOD_NOT_ALLOWED"; // 405
    public static final String UNSUPPORTED_MEDIA_TYPE = "UNSUPPORTED_MEDIA_TYPE"; // 415
    public static final String CONFLICT = "CONFLICT";                     // 409
    public static final String INVALID_STATE_TRANSITION = "INVALID_STATE_TRANSITION"; // 409
    public static final String CONCURRENT_UPDATE = "CONCURRENT_UPDATE";   // 409, safe to retry
    public static final String INTERNAL_ERROR = "INTERNAL_ERROR";         // 500

    // Specific business conflicts (409)
    public static final String SLOT_UNAVAILABLE = "SLOT_UNAVAILABLE";
    public static final String DUPLICATE_ACCOUNT = "DUPLICATE_ACCOUNT";
    public static final String DUPLICATE_PAYMENT_REFERENCE = "DUPLICATE_PAYMENT_REFERENCE";
    public static final String INSUFFICIENT_STOCK = "INSUFFICIENT_STOCK";
    public static final String DRUG_NOT_PRICED = "DRUG_NOT_PRICED";
    public static final String ALREADY_PRESCRIBED = "ALREADY_PRESCRIBED";
    public static final String APPOINTMENT_NOT_ACTIVE = "APPOINTMENT_NOT_ACTIVE";
    public static final String BILL_CANCELLED = "BILL_CANCELLED";
    public static final String BILL_HAS_PAYMENTS = "BILL_HAS_PAYMENTS";
    public static final String ADMIN_SELF_CHANGE = "ADMIN_SELF_CHANGE";

    // Specific 400s
    public static final String INVALID_CURRENT_PASSWORD = "INVALID_CURRENT_PASSWORD";
}
