package com.kevinlemein.backend.dto;

import lombok.Builder;
import lombok.Data;
import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Wraps a page of results for API responses.
 *
 * Deliberately NOT returning Spring's Page<T> directly from controllers —
 * Jackson can serialize PageImpl, but Spring itself warns this isn't a
 * stable contract (internal fields, no guarantee across versions). This
 * gives the frontend a fixed, predictable shape to depend on instead.
 */
@Data
@Builder
public class PagedResponse<T> {
    private List<T> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
    private boolean last;

    public static <T> PagedResponse<T> from(Page<T> page) {
        return PagedResponse.<T>builder()
                .content(page.getContent())
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .last(page.isLast())
                .build();
    }
}