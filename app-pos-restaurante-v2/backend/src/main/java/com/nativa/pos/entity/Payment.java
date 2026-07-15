package com.nativa.pos.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity @Table(name = "payments")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Payment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @JsonIgnore @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "table_id", nullable = false) private DiningTable table;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal amount;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private PaymentMethod method;
    @Column(nullable = false) @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
    @JsonProperty("tableId") public Long tableId() { return table.getId(); }
}
