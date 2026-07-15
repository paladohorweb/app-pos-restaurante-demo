package com.nativa.pos.dto;
import com.nativa.pos.entity.PaymentMethod;
import jakarta.validation.constraints.NotNull;
public record PaymentRequest(@NotNull PaymentMethod method) {}
