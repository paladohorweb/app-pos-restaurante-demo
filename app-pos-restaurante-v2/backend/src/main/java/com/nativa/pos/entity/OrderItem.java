package com.nativa.pos.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity @Table(name = "order_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OrderItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @JsonIgnore @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "order_id", nullable = false) private CustomerOrder order;
    @ManyToOne(fetch = FetchType.EAGER, optional = false) @JoinColumn(name = "product_id", nullable = false) private Product product;
    @Column(nullable = false, length = 120) private String productName;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal unitPrice;
    @Column(nullable = false) private int quantity;
    @Column(length = 400) private String notes;
}
