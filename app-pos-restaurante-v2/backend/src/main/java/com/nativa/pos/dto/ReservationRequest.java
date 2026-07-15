package com.nativa.pos.dto;
import jakarta.validation.constraints.*;
import java.time.*;
public record ReservationRequest(@NotBlank String customerName, @NotBlank String phone, @NotNull LocalDate date, @NotNull LocalTime time, @Min(1) int guests, @NotBlank String area, Long tableId, String occasion, String notes) {}
