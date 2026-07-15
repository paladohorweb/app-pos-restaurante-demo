package com.nativa.pos.dto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
public record CreateOrderRequest(@NotNull Long tableId, @NotBlank String waiter, @NotEmpty List<@Valid Item> items) {
    public record Item(@NotNull Long productId, @Min(1) int quantity, String notes) {}
}
