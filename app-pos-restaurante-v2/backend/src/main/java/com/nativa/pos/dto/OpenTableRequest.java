package com.nativa.pos.dto;
import jakarta.validation.constraints.Min;
public record OpenTableRequest(@Min(1) int guests) {}
