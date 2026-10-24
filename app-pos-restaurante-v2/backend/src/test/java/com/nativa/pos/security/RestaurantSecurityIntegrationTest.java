package com.nativa.pos.security;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.nativa.pos.dto.*;
import com.nativa.pos.entity.*;
import com.nativa.pos.repository.*;
import com.nativa.pos.service.RestaurantService;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@ActiveProfiles("demo")
@AutoConfigureMockMvc
class RestaurantSecurityIntegrationTest {
  @Autowired MockMvc mvc;
  @Autowired AuthService auth;
  @Autowired RestaurantService restaurant;
  @Autowired DiningTableRepository tables;
  @Autowired ProductRepository products;
  @Autowired PaymentRepository payments;

  String token(String username) {
    return auth.login(username, "DemoNativa2026!").accessToken();
  }

  Long newTable() {
    return tables
        .save(
            DiningTable.builder()
                .name("Test-" + UUID.randomUUID().toString().substring(0, 12))
                .area("Salón")
                .capacity(4)
                .build())
        .getId();
  }

  Long newOrder(Long table) {
    return restaurant
        .createOrder(
            new CreateOrderRequest(
                table,
                "Equipo",
                List.of(new CreateOrderRequest.Item(products.findAll().get(0).getId(), 1, ""))))
        .getId();
  }

  void serve(Long id) {
    for (int i = 0; i < 3; i++) restaurant.advanceOrder(id);
  }

  @Test
  void anonymousCannotReadBusinessData() throws Exception {
    mvc.perform(get("/api/state")).andExpect(status().isUnauthorized());
    mvc.perform(get("/api/health")).andExpect(status().isOk());
  }

  @Test
  void badCredentialsAreRejected() throws Exception {
    mvc.perform(
            post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"admin\",\"password\":\"incorrecta\"}"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void loginSetsHttpOnlyRefreshAndReturnsAccess() throws Exception {
    mvc.perform(
            post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"admin\",\"password\":\"DemoNativa2026!\"}"))
        .andExpect(status().isOk())
        .andExpect(cookie().httpOnly("nativa_refresh", true))
        .andExpect(jsonPath("$.accessToken").isNotEmpty())
        .andExpect(jsonPath("$.user.role").value("ADMIN"));
  }

  @Test
  void kitchenCannotCreateOrdersOrReadPayments() throws Exception {
    String t = token("cocina");
    mvc.perform(
            post("/api/orders")
                .header("Authorization", "Bearer " + t)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isForbidden());
    mvc.perform(get("/api/payments").header("Authorization", "Bearer " + t))
        .andExpect(status().isForbidden());
    mvc.perform(get("/api/state").header("Authorization", "Bearer " + t))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.payments").isEmpty())
        .andExpect(jsonPath("$.reservations").isEmpty());
  }

  @Test
  void waiterCannotChargeOrReadFinance() throws Exception {
    String t = token("mesero");
    mvc.perform(
            post("/api/tables/3/pay")
                .header("Authorization", "Bearer " + t)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"method\":\"EFECTIVO\"}"))
        .andExpect(status().isForbidden());
    mvc.perform(get("/api/payments").header("Authorization", "Bearer " + t))
        .andExpect(status().isForbidden());
  }

  @Test
  void cashierCannotMakeReservations() throws Exception {
    mvc.perform(
            post("/api/reservations")
                .header("Authorization", "Bearer " + token("cajero"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isForbidden());
  }

  @Test
  void snapshotSerializesOrdersWithoutLazyFailures() throws Exception {
    mvc.perform(get("/api/state").header("Authorization", "Bearer " + token("admin")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.orders[0].items[0].price").isNumber())
        .andExpect(jsonPath("$.products[0].image").isNotEmpty())
        .andExpect(jsonPath("$.tables[1].guests").value(3))
        .andExpect(
            jsonPath("$.orders[0].createdAt").value(org.hamcrest.Matchers.endsWith("-05:00")));
  }

  @Test
  void negativeQuantityIsRejected() throws Exception {
    mvc.perform(
            post("/api/orders")
                .header("Authorization", "Bearer " + token("mesero"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"tableId\":1,\"waiter\":\"Equipo\",\"items\":[{\"productId\":1,\"quantity\":-1}]}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void paymentRequiresKey() throws Exception {
    mvc.perform(
            post("/api/tables/3/pay")
                .header("Authorization", "Bearer " + token("cajero"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"method\":\"EFECTIVO\"}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void cannotChargeFoodStillInKitchen() {
    Long table = newTable();
    newOrder(table);
    assertThatThrownBy(
            () -> restaurant.payTable(table, PaymentMethod.EFECTIVO, UUID.randomUUID().toString()))
        .hasMessageContaining("servidas");
  }

  @Test
  void paymentRetryDoesNotCreateDuplicate() {
    Long table = newTable();
    serve(newOrder(table));
    String key = UUID.randomUUID().toString();
    long before = payments.count();
    var first = restaurant.payTable(table, PaymentMethod.NEQUI, key);
    var retry = restaurant.payTable(table, PaymentMethod.NEQUI, key);
    assertThat(first.getId()).isEqualTo(retry.getId());
    assertThat(payments.count()).isEqualTo(before + 1);
    assertThat(tables.findById(table).orElseThrow().getStatus()).isEqualTo(TableStatus.DISPONIBLE);
    assertThatThrownBy(() -> restaurant.payTable(table, PaymentMethod.TARJETA, key))
        .hasMessageContaining("otra solicitud");
  }

  @Test
  void concurrentChargeSerializesOnTable() throws Exception {
    Long table = newTable();
    serve(newOrder(table));
    long before = payments.count();
    var pool = Executors.newFixedThreadPool(2);
    try {
      var calls =
          pool.invokeAll(
              List.<Callable<Boolean>>of(
                  () -> {
                    try {
                      restaurant.payTable(
                          table, PaymentMethod.EFECTIVO, UUID.randomUUID().toString());
                      return true;
                    } catch (com.nativa.pos.exception.BusinessException e) {
                      return false;
                    }
                  },
                  () -> {
                    try {
                      restaurant.payTable(
                          table, PaymentMethod.EFECTIVO, UUID.randomUUID().toString());
                      return true;
                    } catch (com.nativa.pos.exception.BusinessException e) {
                      return false;
                    }
                  }));
      assertThat(calls.get(0).get() ^ calls.get(1).get()).isTrue();
      assertThat(payments.count()).isEqualTo(before + 1);
    } finally {
      pool.shutdownNow();
    }
  }

  @Test
  void refreshRotatesAndLogoutRevokesAccess() {
    var first = auth.login("admin", "DemoNativa2026!");
    var next = auth.refresh(first.refresh());
    assertThat(next.refresh()).isNotEqualTo(first.refresh());
    assertThatThrownBy(() -> auth.refresh(first.refresh()))
        .isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
    auth.logout(next.refresh());
    assertThatThrownBy(() -> auth.authenticate(first.accessToken()))
        .isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
  }

  @Test
  void refreshNeedsAntiCsrfHeaderAndAllowedOrigin() throws Exception {
    mvc.perform(post("/api/auth/refresh")).andExpect(status().isForbidden());
    mvc.perform(
            post("/api/auth/refresh")
                .header("X-Requested-With", "Nativa")
                .header("Origin", "https://malicious.example"))
        .andExpect(status().isForbidden());
  }

  @Test
  void maliciousOriginsCannotReadApi() throws Exception {
    mvc.perform(
            get("/api/state")
                .header("Origin", "https://malicious.example")
                .header("Authorization", "Bearer " + token("admin")))
        .andExpect(status().isForbidden());
  }
}
