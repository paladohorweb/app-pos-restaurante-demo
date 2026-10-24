package com.nativa.pos.security;

import java.util.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.*;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class StaffInitializer {
  @Bean
  CommandLineRunner staff(StaffRepository users, PasswordEncoder encoder, Environment env) {
    return args -> {
      boolean demo =
          Arrays.asList(
                  env.getActiveProfiles().length == 0
                      ? env.getDefaultProfiles()
                      : env.getActiveProfiles())
              .contains("demo");
      if (demo) {
        for (String role : List.of("ADMIN", "MESERO", "COCINA", "CAJERO"))
          create(users, encoder, role.toLowerCase(), "DemoNativa2026!", role);
      } else {
        String username = env.getProperty("BOOTSTRAP_ADMIN_USERNAME", "");
        String password = env.getProperty("BOOTSTRAP_ADMIN_PASSWORD", "");
        if (!username.isBlank() && users.findByUsername(username.toLowerCase()).isEmpty()) {
          if (password.length() < 14
              || password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72)
            throw new IllegalStateException(
                "BOOTSTRAP_ADMIN_PASSWORD debe tener entre 14 y 72 bytes");
          create(users, encoder, username.toLowerCase(), password, "ADMIN");
        }
      }
    };
  }

  private void create(
      StaffRepository users,
      PasswordEncoder encoder,
      String username,
      String password,
      String role) {
    if (users.findByUsername(username).isPresent()) return;
    var u = new StaffUser();
    u.setUsername(username);
    u.setPasswordHash(encoder.encode(password));
    u.setName(
        switch (role) {
          case "ADMIN" -> "Administración";
          case "MESERO" -> "Equipo de salón";
          case "COCINA" -> "Equipo de cocina";
          default -> "Equipo de caja";
        });
    u.setRole(role);
    users.save(u);
  }
}
