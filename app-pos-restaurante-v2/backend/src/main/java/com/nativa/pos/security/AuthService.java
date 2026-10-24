package com.nativa.pos.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.Instant;
import java.util.*;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {
  public record User(Long id, String username, String name, String role) {}

  public record Tokens(String accessToken, User user, String refresh) {}

  private final StaffRepository users;
  private final SessionRepository sessions;
  private final PasswordEncoder passwords;
  private final SecretKey key;
  private final String dummy;

  public AuthService(
      StaffRepository users,
      SessionRepository sessions,
      PasswordEncoder passwords,
      Environment env,
      @Value("${JWT_SECRET:}") String secret) {
    this.users = users;
    this.sessions = sessions;
    this.passwords = passwords;
    this.dummy = passwords.encode(UUID.randomUUID().toString());
    if (secret.isBlank()
        && Arrays.asList(
                env.getActiveProfiles().length == 0
                    ? env.getDefaultProfiles()
                    : env.getActiveProfiles())
            .contains("demo")) secret = random();
    if (secret.getBytes(StandardCharsets.UTF_8).length < 32)
      throw new IllegalStateException("Configura JWT_SECRET aleatorio de al menos 32 bytes");
    key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
  }

  @Transactional
  public Tokens login(String username, String password) {
    if (password.getBytes(StandardCharsets.UTF_8).length > 72) throw denied();
    var u = users.findByUsername(username.trim().toLowerCase(Locale.ROOT)).orElse(null);
    boolean valid = passwords.matches(password, u == null ? dummy : u.getPasswordHash());
    if (!valid || u == null) throw denied();
    sessions.deleteAll(
        sessions.findAll().stream().filter(s -> s.getExpiresAt().isBefore(Instant.now())).toList());
    var s = new StaffSession();
    s.setId(UUID.randomUUID().toString());
    s.setStaff(u);
    s.setExpiresAt(Instant.now().plusSeconds(43200));
    String token = s.getId() + "." + random();
    s.setRefreshHash(hash(token));
    sessions.save(s);
    return tokens(s, token);
  }

  @Transactional
  public Tokens refresh(String token) {
    var s = find(token);
    String rotated = s.getId() + "." + random();
    s.setRefreshHash(hash(rotated));
    return tokens(s, rotated);
  }

  @Transactional
  public void logout(String token) {
    if (token == null || !token.contains(".")) return;
    sessions
        .locked(token.substring(0, token.indexOf('.')))
        .filter(
            s ->
                MessageDigest.isEqual(
                    s.getRefreshHash().getBytes(StandardCharsets.UTF_8),
                    hash(token).getBytes(StandardCharsets.UTF_8)))
        .ifPresent(sessions::delete);
  }

  private StaffSession find(String token) {
    if (token == null || !token.contains(".") || token.length() > 200) throw denied();
    var s =
        sessions.locked(token.substring(0, token.indexOf('.'))).orElseThrow(AuthService::denied);
    if (s.getExpiresAt().isBefore(Instant.now())
        || !MessageDigest.isEqual(
            s.getRefreshHash().getBytes(StandardCharsets.UTF_8),
            hash(token).getBytes(StandardCharsets.UTF_8))) throw denied();
    return s;
  }

  private Tokens tokens(StaffSession s, String refresh) {
    var u = s.getStaff();
    var now = Instant.now();
    String jwt =
        Jwts.builder()
            .issuer("nativa-pos")
            .subject(u.getUsername())
            .id(s.getId())
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plusSeconds(900)))
            .signWith(key)
            .compact();
    return new Tokens(jwt, new User(u.getId(), u.getUsername(), u.getName(), u.getRole()), refresh);
  }

  @Transactional(readOnly = true)
  public User authenticate(String token) {
    try {
      var c =
          Jwts.parser()
              .verifyWith(key)
              .requireIssuer("nativa-pos")
              .build()
              .parseSignedClaims(token)
              .getPayload();
      var s =
          sessions
              .findById(c.getId())
              .filter(v -> v.getExpiresAt().isAfter(Instant.now()))
              .orElseThrow(AuthService::denied);
      var u = s.getStaff();
      if (!u.getUsername().equals(c.getSubject())) throw denied();
      return new User(u.getId(), u.getUsername(), u.getName(), u.getRole());
    } catch (Exception e) {
      throw denied();
    }
  }

  private static ResponseStatusException denied() {
    return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales o sesión inválidas");
  }

  private static String random() {
    byte[] b = new byte[48];
    new SecureRandom().nextBytes(b);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(b);
  }

  private static String hash(String v) {
    try {
      return HexFormat.of()
          .formatHex(
              MessageDigest.getInstance("SHA-256").digest(v.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }
}
