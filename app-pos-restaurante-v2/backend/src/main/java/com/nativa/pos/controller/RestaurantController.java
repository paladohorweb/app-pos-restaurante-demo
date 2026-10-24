package com.nativa.pos.controller;

import com.nativa.pos.dto.*;
import com.nativa.pos.entity.*;
import com.nativa.pos.service.RestaurantService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class RestaurantController {
  private final RestaurantService service;

  @GetMapping("/state")
  public StateView state(org.springframework.security.core.Authentication authentication) {
    return service.snapshot(
        ((com.nativa.pos.security.AuthService.User) authentication.getPrincipal()).role());
  }

  @GetMapping("/health")
  public Object health() {
    return java.util.Map.of("status", "UP", "service", "nativa-pos-api");
  }

  @GetMapping("/products")
  public List<Product> products() {
    return service.products();
  }

  @GetMapping("/tables")
  public List<DiningTable> tables() {
    return service.tables();
  }

  @GetMapping("/reservations")
  public List<Reservation> reservations() {
    return service.reservations();
  }

  @GetMapping("/orders")
  public List<CustomerOrder> orders() {
    return service.orders();
  }

  @GetMapping("/payments")
  public List<Payment> payments() {
    return service.payments();
  }

  @PostMapping("/reservations")
  @ResponseStatus(HttpStatus.CREATED)
  public Reservation createReservation(@Valid @RequestBody ReservationRequest request) {
    return service.createReservation(request);
  }

  @PatchMapping("/reservations/{id}/status")
  public Reservation reservationStatus(
      @PathVariable Long id, @RequestParam ReservationStatus status) {
    return service.setReservationStatus(id, status);
  }

  @PostMapping("/reservations/{id}/seat")
  public DiningTable seat(@PathVariable Long id) {
    return service.seatReservation(id);
  }

  @PostMapping("/tables/{id}/open")
  public DiningTable open(@PathVariable Long id, @Valid @RequestBody OpenTableRequest request) {
    return service.openTable(id, request.guests());
  }

  @PostMapping("/orders")
  @ResponseStatus(HttpStatus.CREATED)
  public CustomerOrder createOrder(@Valid @RequestBody CreateOrderRequest request) {
    return service.createOrder(request);
  }

  @PostMapping("/orders/{id}/advance")
  public CustomerOrder advance(@PathVariable Long id) {
    return service.advanceOrder(id);
  }

  @PostMapping("/tables/{id}/pay")
  @ResponseStatus(HttpStatus.CREATED)
  public Payment pay(
      @PathVariable Long id,
      @Valid @RequestBody PaymentRequest request,
      @RequestHeader("Idempotency-Key") String key) {
    if (!key.matches("[A-Za-z0-9_-]{16,64}"))
      throw new com.nativa.pos.exception.BusinessException("Clave de pago inválida");
    return service.payTable(id, request.method(), key);
  }
}
