package com.nativa.pos;

import static org.assertj.core.api.Assertions.*;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(
    properties = {
      "spring.datasource.url=jdbc:h2:mem:migrations;MODE=MySQL;DB_CLOSE_DELAY=-1",
      "spring.datasource.username=sa",
      "spring.datasource.password=",
      "spring.flyway.enabled=true",
      "spring.jpa.hibernate.ddl-auto=validate",
      "JWT_SECRET=local-test-secret-with-48-characters-for-migration"
    })
@ActiveProfiles("migration-check")
class MigrationIntegrationTest {
  @Autowired Flyway flyway;

  @Test
  void migrationsAndJpaAgree() {
    assertThat(flyway.info().applied()).hasSize(3);
  }
}
