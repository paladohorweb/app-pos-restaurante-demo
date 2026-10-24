package com.nativa.pos.security;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Duration;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final AuthService auth;
  private final boolean secure;

  public AuthController(AuthService auth, @Value("${app.cookie-secure:false}") boolean secure) {
    this.auth = auth;
    this.secure = secure;
  }

  public record Login(
      @NotBlank @Size(max = 120) String username, @NotBlank @Size(max = 72) String password) {}

  @PostMapping("/login")
  public ResponseEntity<?> login(@Valid @RequestBody Login input) {
    return response(auth.login(input.username(), input.password()));
  }

  @PostMapping("/refresh")
  public ResponseEntity<?> refresh(
      @CookieValue(value = "nativa_refresh", required = false) String token) {
    return response(auth.refresh(token));
  }

  @PostMapping("/logout")
  public ResponseEntity<?> logout(
      @CookieValue(value = "nativa_refresh", required = false) String token) {
    auth.logout(token);
    return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, cookie("", 0)).build();
  }

  @GetMapping("/me")
  public AuthService.User me(@AuthenticationPrincipal AuthService.User user) {
    return user;
  }

  private ResponseEntity<?> response(AuthService.Tokens t) {
    return ResponseEntity.ok()
        .header(HttpHeaders.SET_COOKIE, cookie(t.refresh(), 43200))
        .body(Map.of("accessToken", t.accessToken(), "user", t.user()));
  }

  private String cookie(String value, long age) {
    return ResponseCookie.from("nativa_refresh", value)
        .httpOnly(true)
        .secure(secure)
        .sameSite("Strict")
        .path("/api/auth")
        .maxAge(Duration.ofSeconds(age))
        .build()
        .toString();
  }
}
