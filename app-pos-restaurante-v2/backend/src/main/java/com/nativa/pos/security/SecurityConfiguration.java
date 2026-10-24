package com.nativa.pos.security;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.filter.OncePerRequestFilter;

@Configuration
public class SecurityConfiguration {
  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(12);
  }

  @Bean
  com.fasterxml.jackson.databind.ObjectMapper legacyMapper() {
    return new com.fasterxml.jackson.databind.ObjectMapper();
  }

  @Bean
  SecurityFilterChain security(
      HttpSecurity http, AuthService auth, @Value("${app.cors-origin}") String origins)
      throws Exception {
    return http.cors(Customizer.withDefaults())
        .csrf(c -> c.disable())
        .sessionManagement(c -> c.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .headers(
            h ->
                h.contentSecurityPolicy(
                        c -> c.policyDirectives("default-src 'none'; frame-ancestors 'none'"))
                    .referrerPolicy(
                        c ->
                            c.policy(
                                org.springframework.security.web.header.writers
                                    .ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER)))
        .exceptionHandling(
            e ->
                e.authenticationEntryPoint(
                        (q, r, x) -> error(r, 401, "Inicia sesión para continuar"))
                    .accessDeniedHandler((q, r, x) -> error(r, 403, "Acceso denegado")))
        .authorizeHttpRequests(
            a ->
                a.requestMatchers(HttpMethod.OPTIONS, "/**")
                    .permitAll()
                    .requestMatchers(
                        "/api/health", "/api/auth/login", "/api/auth/refresh", "/api/auth/logout")
                    .permitAll()
                    .requestMatchers(
                        HttpMethod.GET,
                        "/api/auth/me",
                        "/api/state",
                        "/api/products",
                        "/api/tables",
                        "/api/orders")
                    .authenticated()
                    .requestMatchers(HttpMethod.POST, "/api/tables/*/pay")
                    .hasAnyRole("ADMIN", "CAJERO")
                    .requestMatchers("/api/payments", "/api/jgm/license")
                    .hasAnyRole("ADMIN", "CAJERO")
                    .requestMatchers("/api/orders/*/advance")
                    .hasAnyRole("ADMIN", "COCINA", "MESERO")
                    .requestMatchers("/api/reservations/**", "/api/tables/*/open")
                    .hasAnyRole("ADMIN", "MESERO")
                    .requestMatchers(HttpMethod.POST, "/api/orders")
                    .hasAnyRole("ADMIN", "MESERO")
                    .anyRequest()
                    .denyAll())
        .addFilterBefore(
            new Gate(auth, Set.of(origins.split(","))), UsernamePasswordAuthenticationFilter.class)
        .build();
  }

  static void error(HttpServletResponse r, int status, String message) throws IOException {
    r.setStatus(status);
    r.setContentType("application/json;charset=UTF-8");
    r.setHeader("Cache-Control", "no-store");
    r.getWriter().write("{\"message\":\"" + message + "\"}");
  }

  static class Gate extends OncePerRequestFilter {
    record Attempt(int count, long end) {}

    private final Map<String, Attempt> attempts = new ConcurrentHashMap<>();
    private final AuthService auth;
    private final Set<String> origins;

    Gate(AuthService auth, Set<String> origins) {
      this.auth = auth;
      this.origins = origins;
    }

    protected void doFilterInternal(HttpServletRequest q, HttpServletResponse r, FilterChain chain)
        throws ServletException, IOException {
      r.setHeader("Cache-Control", "no-store");
      String path = q.getRequestURI();
      if (path.startsWith("/api/auth/")
          && !q.getMethod().equals("GET")
          && !q.getMethod().equals("OPTIONS")) {
        String origin = q.getHeader("Origin");
        if (origin != null && !origins.contains(origin)) {
          error(r, 403, "Origen no permitido");
          return;
        }
        if ((path.endsWith("refresh") || path.endsWith("logout"))
            && !"Nativa".equals(q.getHeader("X-Requested-With"))) {
          error(r, 403, "Cabecera de solicitud requerida");
          return;
        }
        long now = Instant.now().getEpochSecond();
        attempts.entrySet().removeIf(e -> e.getValue().end() < now);
        if (attempts.size() >= 10000 && !attempts.containsKey(q.getRemoteAddr())) {
          error(r, 429, "Intenta de nuevo más tarde");
          return;
        }
        var value =
            attempts.compute(
                q.getRemoteAddr(),
                (k, v) ->
                    v == null || v.end() < now
                        ? new Attempt(1, now + 60)
                        : new Attempt(v.count() + 1, v.end()));
        if (value.count() > 20) {
          r.setHeader("Retry-After", "60");
          error(r, 429, "Demasiados intentos. Espera un minuto");
          return;
        }
      }
      String bearer = q.getHeader("Authorization");
      if (bearer != null && bearer.startsWith("Bearer "))
        try {
          var u = auth.authenticate(bearer.substring(7));
          SecurityContextHolder.getContext()
              .setAuthentication(
                  new UsernamePasswordAuthenticationToken(
                      u, null, List.of(new SimpleGrantedAuthority("ROLE_" + u.role()))));
        } catch (Exception e) {
          error(r, 401, "Sesión vencida");
          return;
        }
      chain.doFilter(q, r);
    }
  }
}
