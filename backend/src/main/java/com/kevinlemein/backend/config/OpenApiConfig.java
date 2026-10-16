package com.kevinlemein.backend.config;

import com.kevinlemein.backend.exception.ErrorCodes;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.*;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.responses.ApiResponses;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * The OpenAPI document (/v3/api-docs, Swagger UI at /swagger-ui.html) is
 * generated from the controllers and DTOs; this class only adds what can't be
 * inferred: the bearer-token scheme, the shared error envelope with its stable
 * codes, and the standard error responses on every operation.
 *
 * Only /api/** is documented (springdoc.paths-to-match); Actuator and the
 * error page are not part of the client contract. The docs are disabled in
 * the production (docker) profile unless API_DOCS_ENABLED=true.
 */
@Configuration
public class OpenApiConfig {

    static final String BEARER = "bearerAuth";
    static final String ERROR_REF = "#/components/schemas/ErrorResponse";

    @Bean
    public OpenAPI medicareOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("MediCare API")
                        .version("1")
                        .description("""
                                Client API for the MediCare clinic system (web app and mobile).

                                **Authentication:** `POST /api/auth/login` returns a JWT; send it as \
                                `Authorization: Bearer <token>`. 401 = sign in again; 403 = signed in \
                                but not allowed (never a session expiry).

                                **Envelope:** every response is `{ success, message, data?, timestamp }`. \
                                Errors add a stable `code`, the `requestId` (also in the `X-Request-Id` \
                                header) and, for validation failures, per-field `errors`. Branch on `code`, \
                                not on `message`.

                                **Compatibility:** changes are additive (new endpoints, new optional \
                                fields, new error codes). Clients must ignore unknown fields and treat \
                                unknown error codes by HTTP status."""))
                .components(new Components()
                        .addSecuritySchemes(BEARER, new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")
                                .description("Token from POST /api/auth/login")))
                // Relative: the same document works for every environment's base URL.
                .servers(List.of(new io.swagger.v3.oas.models.servers.Server().url("/").description("This server")))
                .addSecurityItem(new SecurityRequirement().addList(BEARER));
    }

    /** Adds the standard error responses and marks the login endpoint as public. */
    @Bean
    public OpenApiCustomizer standardErrorResponses() {
        return openApi -> {
            // Registered here (customizers run last): springdoc rebuilds component
            // schemas from the controllers and would drop one declared earlier.
            openApi.getComponents().addSchemas("ErrorResponse", errorSchema());
            openApi.getPaths().forEach((path, item) -> item.readOperations().forEach(op -> {
            boolean publicEndpoint = path.equals("/api/auth/login");
            if (publicEndpoint) op.setSecurity(List.of());
            ApiResponses responses = op.getResponses() == null ? new ApiResponses() : op.getResponses();
            responses.remove("default");
            putIfAbsent(responses, "400", "Bad request or validation failed (see `code`, `errors`)");
            if (!publicEndpoint) {
                putIfAbsent(responses, "401", "Missing, invalid or expired token: sign in again (`UNAUTHENTICATED`)");
                putIfAbsent(responses, "403", "Signed in but not allowed (`FORBIDDEN`)");
            } else {
                putIfAbsent(responses, "401", "Wrong email or password (`INVALID_CREDENTIALS`)");
            }
            if (path.contains("{")) putIfAbsent(responses, "404", "Not found (`NOT_FOUND`)");
            if (!"get".equals(method(item, op))) putIfAbsent(responses, "409", "Conflicts with current state (see `code`)");
            putIfAbsent(responses, "500", "Unexpected server error (`INTERNAL_ERROR`); quote the requestId");
            op.setResponses(responses);
            }));
        };
    }

    private static String method(io.swagger.v3.oas.models.PathItem item, Operation op) {
        return item.readOperationsMap().entrySet().stream()
                .filter(e -> e.getValue() == op).map(e -> e.getKey().name().toLowerCase()).findFirst().orElse("");
    }

    private static void putIfAbsent(ApiResponses responses, String status, String description) {
        if (responses.containsKey(status)) return;
        responses.addApiResponse(status, new ApiResponse().description(description)
                .content(new Content().addMediaType("application/json", new MediaType().schema(new Schema<>().$ref(ERROR_REF)))));
    }

    @SuppressWarnings({"rawtypes", "unchecked"})
    private static Schema<?> errorSchema() {
        List<String> codes = Arrays.stream(ErrorCodes.class.getFields())
                .filter(f -> Modifier.isStatic(f.getModifiers()) && f.getType() == String.class)
                .map(OpenApiConfig::value).sorted().toList();
        StringSchema code = new StringSchema();
        code.setEnum(codes);
        code.setDescription("Stable machine-readable error code. New codes may be added; unknown codes should be handled by HTTP status.");
        return new ObjectSchema()
                .description("Error envelope returned with every 4xx/5xx response")
                .addProperty("success", new BooleanSchema().example(false))
                .addProperty("code", code.example("INSUFFICIENT_STOCK"))
                .addProperty("message", new StringSchema().description("Safe, human-readable; may change").example("Insufficient stock for Amoxicillin: only 2 remaining, 5 requested"))
                .addProperty("requestId", new StringSchema().description("Correlation id, same as the X-Request-Id header").example("7c1e0f4a-2b9d-4c55-9a51-3f0b8e6d2a10"))
                .addProperty("errors", new MapSchema().additionalProperties(new StringSchema())
                        .description("Field -> message, only for VALIDATION_FAILED").example(Map.of("email", "Please provide a valid email address")))
                .addProperty("timestamp", new StringSchema().format("date-time"))
                .required(List.of("success", "code", "message"));
    }

    private static String value(Field f) {
        try {
            return (String) f.get(null);
        } catch (IllegalAccessException e) {
            throw new IllegalStateException(e);
        }
    }
}
