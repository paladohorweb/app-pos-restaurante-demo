package com.nativa.pos.dto;

import jakarta.validation.constraints.*;
import java.time.*;

public record ReservationRequest(
    @NotBlank @Size(max = 120) String customerName,
    @NotBlank @Size(max = 30) String phone,
    @NotNull LocalDate date,
    @NotNull LocalTime time,
    @Min(1) @Max(20) int guests,
    @NotBlank @Pattern(regexp = "Salón|Terraza|VIP") String area,
    Long tableId,
    @Size(max = 80) String occasion,
    @Size(max = 600) String notes) {}
