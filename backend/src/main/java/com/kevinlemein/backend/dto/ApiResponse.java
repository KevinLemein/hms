package com.kevinlemein.backend.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.kevinlemein.backend.observability.RequestIdFilter;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private boolean success;
    private String message;
    private T data;

    // Errors only: stable machine-readable code (see exception.ErrorCodes)
    // and the request's correlation id (also in the X-Request-Id header).
    private String code;
    private String requestId;

    // Field name -> validation message. Only present on validation failures.
    private Map<String, String> errors;

    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();

    public static <T> ApiResponse<T> success(String message, T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .message(message)
                .data(data)
                .timestamp(LocalDateTime.now())
                .build();
    }

    public static <T> ApiResponse<T> error(String code, String message) {
        return error(code, message, null);
    }

    public static <T> ApiResponse<T> error(String code, String message, Map<String, String> errors) {
        return ApiResponse.<T>builder()
                .success(false)
                .code(code)
                .message(message)
                .errors(errors)
                .requestId(RequestIdFilter.currentRequestId())
                .timestamp(LocalDateTime.now())
                .build();
    }
}
