package com.kevinlemein.backend.security;

import com.kevinlemein.backend.exception.ErrorCodes;
import com.kevinlemein.backend.observability.RequestIdFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.LocalDateTime;

/**
 * Writes the standard ApiResponse error envelope for failures raised inside
 * the security filter chain (before any controller runs):
 *
 * - 401 when there is no valid authentication: missing, malformed, expired
 *   token, or the account was disabled. Clients should sign in again.
 * - 403 when the caller IS authenticated but a URL rule denies the request.
 *
 * Without this, Spring Security's default returned 403 with an empty body
 * for both cases, so clients couldn't tell "sign in again" from "forbidden".
 * Denials from @PreAuthorize are handled by GlobalExceptionHandler and use
 * the same 403 message.
 */
@Component
public class JsonSecurityErrorHandler implements AuthenticationEntryPoint, AccessDeniedHandler {

    static final String UNAUTHORIZED_MESSAGE = "Authentication required";
    static final String FORBIDDEN_MESSAGE = "You do not have permission to access this resource";

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        response.setHeader("WWW-Authenticate", "Bearer");
        write(response, HttpStatus.UNAUTHORIZED, ErrorCodes.UNAUTHENTICATED, UNAUTHORIZED_MESSAGE);
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
                       AccessDeniedException accessDeniedException) throws IOException {
        write(response, HttpStatus.FORBIDDEN, ErrorCodes.FORBIDDEN, FORBIDDEN_MESSAGE);
    }

    private void write(HttpServletResponse response, HttpStatus status, String code, String message) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        // Fixed code/message, and a request id that RequestIdFilter has
        // restricted to [A-Za-z0-9._-] or a UUID, so plain string building is safe.
        String requestId = RequestIdFilter.currentRequestId();
        response.getWriter().write("{\"success\":false,\"code\":\"" + code + "\",\"message\":\"" + message + "\""
                + (requestId != null ? ",\"requestId\":\"" + requestId + "\"" : "")
                + ",\"timestamp\":\"" + LocalDateTime.now() + "\"}");
    }
}
