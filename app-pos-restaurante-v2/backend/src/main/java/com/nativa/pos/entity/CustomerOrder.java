package com.nativa.pos.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Entity @Table(name = "customer_orders")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CustomerOrder {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @JsonIgnore @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "table_id", nullable = false) private DiningTable table;
    @Column(nullable = false, length = 100) private String waiter;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) @Builder.Default private OrderStatus status = OrderStatus.NUEVA;
    @Column(nullable = false) @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime paidAt;
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default private List<OrderItem> items = new ArrayList<>();

    public void addItem(OrderItem item) { items.add(item); item.setOrder(this); }
    @Transient public BigDecimal total() { return items.stream().map(i -> i.getUnitPrice().multiply(BigDecimal.valueOf(i.getQuantity()))).reduce(BigDecimal.ZERO, BigDecimal::add); }
    @JsonProperty("tableId") public Long tableId() { return table.getId(); }
    @JsonProperty("total") public BigDecimal jsonTotal() { return total(); }
}
