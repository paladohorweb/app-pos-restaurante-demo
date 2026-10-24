package com.nativa.pos.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;

@Configuration
public class WebConfig implements WebMvcConfigurer {
  @Value("${app.cors-origin}")
  private String corsOrigin;

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    registry
        .addMapping("/api/**")
        .allowedOrigins(corsOrigin.split(","))
        .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE")
        .allowedHeaders("Authorization", "Content-Type", "X-Requested-With", "Idempotency-Key")
        .allowCredentials(true)
        .exposedHeaders("X-JGM-License-State", "X-JGM-Billing-Url");
  }
}
