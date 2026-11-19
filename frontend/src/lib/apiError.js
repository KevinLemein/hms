// Turns an Axios error into something safe and useful to show a user.
//
// The backend's ApiResponse.message is written to be client-safe (Phase 1a),
// so it is shown as-is for 4xx responses. 5xx and network failures get
// fixed wording. 401 is handled globally by the axios interceptor (session
// expiry -> sign-in); 403 is a permission problem, never a session expiry.

export function getErrorMessage(err, fallback = "Something went wrong. Please try again.") {
    const status = err?.response?.status;
    const message = err?.response?.data?.message;

    if (!err?.response) return "Can't reach the server. Check your connection and try again.";
    if (status === 401) return "Your session has expired. Please sign in again.";
    if (status === 403) return message || "You don't have permission to do that.";
    if (status >= 500) return "The server had a problem. Please try again in a moment.";
    return message || fallback;
}

/** Per-field validation messages from ApiResponse.errors ({ field: message }), if any. */
export function getFieldErrors(err) {
    const errors = err?.response?.data?.errors;
    return errors && typeof errors === "object" ? errors : {};
}
