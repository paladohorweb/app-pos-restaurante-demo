package com.nativa.pos.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;

@Entity @Table(name = "products")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Product {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @NotBlank @Column(nullable = false, length = 120) private String name;
    @NotBlank @Column(nullable = false, length = 60) private String category;
    @Column(length = 500) private String description;
    @NotNull @DecimalMin("0.0") @Column(nullable = false, precision = 12, scale = 2) private BigDecimal price;
    @Column(length = 255) private String imageUrl;
    @Builder.Default @Column(nullable = false) private boolean available = true;
}
