package com.nativa.pos.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "restaurant_tables")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DiningTable {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @NotBlank @Column(nullable = false, unique = true, length = 50) private String name;
    @NotBlank @Column(nullable = false, length = 50) private String area;
    @Min(1) @Column(nullable = false) private int capacity;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) @Builder.Default private TableStatus status = TableStatus.DISPONIBLE;
    private Integer guests;
    private LocalDateTime openedAt;
}
