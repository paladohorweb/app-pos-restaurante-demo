package com.nativa.pos.config;

import com.nativa.pos.entity.*;
import com.nativa.pos.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.List;

@Configuration @Profile("demo") @RequiredArgsConstructor
public class DemoDataInitializer {
    private final ProductRepository products;
    private final DiningTableRepository tables;
    private final ReservationRepository reservations;
    private final CustomerOrderRepository orders;

    @Bean CommandLineRunner seedDemo() { return args -> {
        Product burger = products.save(product("Hamburguesa Nativa", "Fuertes", "Carne madurada, queso y papas rústicas", "38900", "assets/images/burger.webp"));
        Product salmon = products.save(product("Salmón cítrico", "Fuertes", "Vegetales y beurre blanc", "52900", "assets/images/salmon.webp"));
        Product lomo = products.save(product("Lomo de la casa", "Fuertes", "Puré sedoso y reducción de vino", "58900", "assets/images/lomo.webp"));
        products.save(product("Cheesecake vasco", "Postres", "Maracuyá y frutos rojos", "21900", "assets/images/postre.webp"));
        List<DiningTable> savedTables = tables.saveAll(List.of(
            table("Mesa 01", "Salón", 2, TableStatus.DISPONIBLE), table("Mesa 02", "Salón", 4, TableStatus.OCUPADA),
            table("Mesa 03", "Salón", 4, TableStatus.POR_COBRAR), table("Mesa 04", "Salón", 6, TableStatus.DISPONIBLE),
            table("Terraza 01", "Terraza", 2, TableStatus.RESERVADA), table("Terraza 02", "Terraza", 4, TableStatus.DISPONIBLE),
            table("Terraza 03", "Terraza", 6, TableStatus.DISPONIBLE), table("Privado", "VIP", 10, TableStatus.DISPONIBLE)));
        DiningTable t2 = savedTables.get(1); t2.setGuests(3); t2.setOpenedAt(LocalDateTime.now().minusMinutes(32));
        DiningTable t3 = savedTables.get(2); t3.setGuests(4); t3.setOpenedAt(LocalDateTime.now().minusMinutes(75));
        reservations.save(Reservation.builder().customerName("Mariana Torres").phone("300 555 0198").date(LocalDate.now()).time(LocalTime.of(19,30)).guests(2).area("Terraza").table(savedTables.get(4)).occasion("Aniversario").notes("Mesa tranquila").status(ReservationStatus.CONFIRMADA).build());
        reservations.save(Reservation.builder().customerName("Andrés Mejía").phone("315 444 8210").date(LocalDate.now()).time(LocalTime.of(20,0)).guests(6).area("Salón").table(savedTables.get(3)).occasion("Cumpleaños").status(ReservationStatus.PENDIENTE).build());
        CustomerOrder active = CustomerOrder.builder().table(t2).waiter("Laura Gómez").status(OrderStatus.PREPARANDO).createdAt(LocalDateTime.now().minusMinutes(20)).build();
        active.addItem(item(burger, 2, "Una sin cebolla")); orders.save(active);
        CustomerOrder served = CustomerOrder.builder().table(t3).waiter("Carlos Ruiz").status(OrderStatus.SERVIDA).createdAt(LocalDateTime.now().minusMinutes(58)).build();
        served.addItem(item(lomo, 2, "Término medio")); served.addItem(item(salmon, 1, "")); orders.save(served);
    }; }
    private Product product(String name, String category, String description, String price, String image) { return Product.builder().name(name).category(category).description(description).price(new BigDecimal(price)).imageUrl(image).available(true).build(); }
    private DiningTable table(String name, String area, int capacity, TableStatus status) { return DiningTable.builder().name(name).area(area).capacity(capacity).status(status).build(); }
    private OrderItem item(Product p, int qty, String notes) { return OrderItem.builder().product(p).productName(p.getName()).unitPrice(p.getPrice()).quantity(qty).notes(notes).build(); }
}
