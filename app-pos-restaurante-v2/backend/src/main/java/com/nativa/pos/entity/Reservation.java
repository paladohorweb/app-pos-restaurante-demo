package com.nativa.pos.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.time.*;

@Entity @Table(name = "reservations", indexes = @Index(name = "idx_reservation_slot", columnList = "reservation_date,reservation_time"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Reservation {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @NotBlank @Column(nullable = false, length = 120) private String customerName;
    @NotBlank @Column(nullable = false, length = 30) private String phone;
    @Column(name = "reservation_date", nullable = false) private LocalDate date;
    @Column(name = "reservation_time", nullable = false) private LocalTime time;
    @Min(1) @Column(nullable = false) private int guests;
    @NotBlank @Column(nullable = false, length = 50) private String area;
    @JsonIgnore @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "table_id") private DiningTable table;
    @Column(length = 80) private String occasion;
    @Column(length = 600) private String notes;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) @Builder.Default private ReservationStatus status = ReservationStatus.PENDIENTE;
    @Column(nullable = false) @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
    @JsonProperty("tableId") public Long tableId() { return table == null ? null : table.getId(); }
}
