package com.kevinlemein.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "bill_line_items",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_line_item_source",
                columnNames = {"source", "source_reference_id"}
        )
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BillLineItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bill_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Bill bill;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "total_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalPrice;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LineItemSource source;

    // The id of whatever created this line (dispensing record id, appointment id
    // for a consultation fee, etc). NULL is allowed (MANUAL charges have none),
    // but when it IS set, (source, source_reference_id) must be globally unique —
    // that's what makes double-billing structurally impossible, not just app-checked.
    @Column(name = "source_reference_id")
    private Long sourceReferenceId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    @PreUpdate
    protected void calculate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (unitPrice != null && quantity != null) {
            this.totalPrice = unitPrice.multiply(BigDecimal.valueOf(quantity));
        }
    }
}