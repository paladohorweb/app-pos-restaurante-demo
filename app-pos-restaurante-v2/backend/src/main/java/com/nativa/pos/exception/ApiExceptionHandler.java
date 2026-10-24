package com.nativa.pos.exception;

import java.time.Instant;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice
public class ApiExceptionHandler {
  @ExceptionHandler(NotFoundException.class)
  ResponseEntity<Map<String, Object>> notFound(NotFoundException ex) {
    return response(HttpStatus.NOT_FOUND, ex.getMessage());
  }

  @ExceptionHandler(BusinessException.class)
  ResponseEntity<Map<String, Object>> business(BusinessException ex) {
    return response(HttpStatus.CONFLICT, ex.getMessage());
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<Map<String, Object>> validation(MethodArgumentNotValidException ex) {
    String message =
        ex.getBindingResult().getFieldErrors().stream()
            .map(e -> e.getField() + ": " + e.getDefaultMessage())
            .findFirst()
            .orElse("Solicitud inválida");
    return response(HttpStatus.BAD_REQUEST, message);
  }

  @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
  ResponseEntity<Map<String, Object>> status(
      org.springframework.web.server.ResponseStatusException ex) {
    return response(
        HttpStatus.valueOf(ex.getStatusCode().value()),
        ex.getReason() == null ? "Solicitud rechazada" : ex.getReason());
  }

  @ExceptionHandler({
    org.springframework.dao.OptimisticLockingFailureException.class,
    org.springframework.dao.DataIntegrityViolationException.class
  })
  ResponseEntity<Map<String, Object>> conflict(Exception ex) {
    return response(HttpStatus.CONFLICT, "La operación cambió. Actualiza y vuelve a intentar.");
  }

  private ResponseEntity<Map<String, Object>> response(HttpStatus status, String message) {
    return ResponseEntity.status(status)
        .body(
            Map.of(
                "timestamp",
                Instant.now(),
                "status",
                status.value(),
                "error",
                status.getReasonPhrase(),
                "message",
                message));
  }
}
