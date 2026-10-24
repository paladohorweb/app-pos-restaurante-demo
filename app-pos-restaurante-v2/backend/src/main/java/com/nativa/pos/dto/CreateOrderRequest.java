package com.nativa.pos.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

public record CreateOrderRequest(
    @NotNull @Positive Long tableId,
    @NotBlank @Size(max = 100) String waiter,
    @NotEmpty @Size(max = 100) List<@Valid Item> items) {
  public record Item(
      @NotNull Long productId, @Min(1) @Max(99) int quantity, @Size(max = 400) String notes) {}
}
