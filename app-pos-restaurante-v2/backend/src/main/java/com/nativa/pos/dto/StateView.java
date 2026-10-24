package com.nativa.pos.dto;

import com.nativa.pos.entity.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

public record StateView(
    List<TableView> tables,
    List<ProductView> products,
    List<OrderView> orders,
    List<Reservation> reservations,
    List<PaymentView> payments,
    int nextId) {
  public static String stamp(LocalDateTime value) {
    return value == null
        ? null
        : value.atZone(java.time.ZoneId.of("America/Bogota")).toOffsetDateTime().toString();
  }

  public record TableView(
      Long id,
      String name,
      String area,
      int capacity,
      TableStatus status,
      Integer guests,
      String openedAt) {
    public TableView(DiningTable t) {
      this(
          t.getId(),
          t.getName(),
          t.getArea(),
          t.getCapacity(),
          t.getStatus(),
          t.getGuests(),
          stamp(t.getOpenedAt()));
    }
  }

  public record PaymentView(
      Long id, Long tableId, String createdAt, BigDecimal amount, PaymentMethod method) {
    public PaymentView(Payment p) {
      this(p.getId(), p.tableId(), stamp(p.getCreatedAt()), p.getAmount(), p.getMethod());
    }
  }

  public record ProductView(
      Long id,
      String name,
      String category,
      String description,
      BigDecimal price,
      String image,
      boolean available) {
    public ProductView(Product p) {
      this(
          p.getId(),
          p.getName(),
          p.getCategory(),
          p.getDescription(),
          p.getPrice(),
          p.getImageUrl(),
          p.isAvailable());
    }
  }

  public record ItemView(
      Long productId, String name, BigDecimal price, int quantity, String notes) {
    public ItemView(OrderItem i) {
      this(
          i.getProduct().getId(),
          i.getProductName(),
          i.getUnitPrice(),
          i.getQuantity(),
          i.getNotes());
    }
  }

  public record OrderView(
      Long id,
      Long tableId,
      String waiter,
      String createdAt,
      String status,
      List<ItemView> items,
      boolean paid) {
    public OrderView(CustomerOrder o) {
      this(
          o.getId(),
          o.tableId(),
          o.getWaiter(),
          stamp(o.getCreatedAt()),
          o.getStatus() == OrderStatus.PAGADA ? "SERVIDA" : o.getStatus().name(),
          o.getItems().stream().map(ItemView::new).toList(),
          o.getStatus() == OrderStatus.PAGADA);
    }
  }
}
