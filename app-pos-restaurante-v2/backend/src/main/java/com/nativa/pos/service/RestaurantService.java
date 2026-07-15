package com.nativa.pos.service;

import com.nativa.pos.dto.*;
import com.nativa.pos.entity.*;
import com.nativa.pos.exception.*;
import com.nativa.pos.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

@Service @RequiredArgsConstructor
public class RestaurantService {
    private static final List<OrderStatus> CLOSED = List.of(OrderStatus.PAGADA, OrderStatus.CANCELADA);
    private static final List<ReservationStatus> INACTIVE_RESERVATIONS = List.of(ReservationStatus.CANCELADA, ReservationStatus.NO_ASISTIO);
    private final ProductRepository products;
    private final DiningTableRepository tables;
    private final ReservationRepository reservations;
    private final CustomerOrderRepository orders;
    private final PaymentRepository payments;

    @Transactional(readOnly = true) public List<Product> products() { return products.findAll(); }
    @Transactional(readOnly = true) public List<DiningTable> tables() { return tables.findAll(); }
    @Transactional(readOnly = true) public List<Reservation> reservations() { return reservations.findAllByOrderByDateAscTimeAsc(); }
    @Transactional(readOnly = true) public List<CustomerOrder> orders() { return orders.findAllByOrderByCreatedAtDesc(); }
    @Transactional(readOnly = true) public List<Payment> payments() { return payments.findAllByOrderByCreatedAtDesc(); }

    @Transactional
    public Reservation createReservation(ReservationRequest request) {
        if (request.date().isBefore(LocalDate.now())) throw new BusinessException("La fecha de reserva no puede estar en el pasado");
        DiningTable table = request.tableId() == null ? null : table(request.tableId());
        if (table != null && table.getCapacity() < request.guests()) throw new BusinessException("La mesa no tiene capacidad para todos los comensales");
        if (table != null && reservations.existsByTable_IdAndDateAndTimeAndStatusNotIn(table.getId(), request.date(), request.time(), INACTIVE_RESERVATIONS))
            throw new BusinessException("La mesa ya está reservada para esa fecha y hora");
        return reservations.save(Reservation.builder().customerName(request.customerName().trim()).phone(request.phone().trim()).date(request.date()).time(request.time()).guests(request.guests()).area(request.area()).table(table).occasion(request.occasion()).notes(request.notes()).build());
    }

    @Transactional
    public Reservation setReservationStatus(Long id, ReservationStatus status) {
        Reservation reservation = reservation(id);
        reservation.setStatus(status);
        if (reservation.getTable() != null && status == ReservationStatus.CONFIRMADA && reservation.getTable().getStatus() == TableStatus.DISPONIBLE)
            reservation.getTable().setStatus(TableStatus.RESERVADA);
        if (reservation.getTable() != null && INACTIVE_RESERVATIONS.contains(status) && reservation.getTable().getStatus() == TableStatus.RESERVADA)
            reservation.getTable().setStatus(TableStatus.DISPONIBLE);
        return reservation;
    }

    @Transactional
    public DiningTable seatReservation(Long reservationId) {
        Reservation reservation = reservation(reservationId);
        if (INACTIVE_RESERVATIONS.contains(reservation.getStatus())) throw new BusinessException("La reserva está inactiva");
        DiningTable target = reservation.getTable();
        if (target == null) target = tables.findAll().stream().filter(t -> t.getArea().equalsIgnoreCase(reservation.getArea()) && t.getCapacity() >= reservation.getGuests() && t.getStatus() == TableStatus.DISPONIBLE).findFirst().orElseThrow(() -> new BusinessException("No hay una mesa disponible con esa capacidad"));
        if (target.getStatus() != TableStatus.DISPONIBLE && target.getStatus() != TableStatus.RESERVADA) throw new BusinessException("La mesa seleccionada no está disponible");
        target.setStatus(TableStatus.OCUPADA); target.setGuests(reservation.getGuests()); target.setOpenedAt(LocalDateTime.now());
        reservation.setTable(target); reservation.setStatus(ReservationStatus.EN_MESA);
        return target;
    }

    @Transactional
    public DiningTable openTable(Long tableId, int guests) {
        DiningTable table = table(tableId);
        if (table.getStatus() != TableStatus.DISPONIBLE) throw new BusinessException("La mesa no está disponible");
        if (guests > table.getCapacity()) throw new BusinessException("La cantidad de personas supera la capacidad de la mesa");
        table.setStatus(TableStatus.OCUPADA); table.setGuests(guests); table.setOpenedAt(LocalDateTime.now());
        return table;
    }

    @Transactional
    public CustomerOrder createOrder(CreateOrderRequest request) {
        DiningTable table = table(request.tableId());
        if (table.getStatus() == TableStatus.RESERVADA) throw new BusinessException("Primero debes registrar la llegada de la reserva");
        if (table.getStatus() == TableStatus.DISPONIBLE) { table.setStatus(TableStatus.OCUPADA); table.setGuests(1); table.setOpenedAt(LocalDateTime.now()); }
        if (table.getStatus() == TableStatus.POR_COBRAR) table.setStatus(TableStatus.OCUPADA);
        CustomerOrder order = CustomerOrder.builder().table(table).waiter(request.waiter()).build();
        request.items().forEach(input -> {
            Product product = products.findById(input.productId()).orElseThrow(() -> new NotFoundException("Producto", input.productId()));
            if (!product.isAvailable()) throw new BusinessException(product.getName() + " no está disponible");
            order.addItem(OrderItem.builder().product(product).productName(product.getName()).unitPrice(product.getPrice()).quantity(input.quantity()).notes(input.notes()).build());
        });
        return orders.save(order);
    }

    @Transactional
    public CustomerOrder advanceOrder(Long id) {
        CustomerOrder order = orders.findById(id).orElseThrow(() -> new NotFoundException("Comanda", id));
        OrderStatus next = switch (order.getStatus()) {
            case NUEVA -> OrderStatus.PREPARANDO;
            case PREPARANDO -> OrderStatus.LISTA;
            case LISTA -> OrderStatus.SERVIDA;
            default -> throw new BusinessException("La comanda no puede avanzar desde " + order.getStatus());
        };
        order.setStatus(next);
        if (next == OrderStatus.SERVIDA) {
            List<CustomerOrder> open = orders.findOpenByTable(order.getTable().getId(), CLOSED);
            if (open.stream().allMatch(o -> o.getStatus() == OrderStatus.SERVIDA)) order.getTable().setStatus(TableStatus.POR_COBRAR);
        }
        return order;
    }

    @Transactional
    public Payment payTable(Long tableId, PaymentMethod method) {
        DiningTable table = table(tableId);
        List<CustomerOrder> open = orders.findOpenByTable(tableId, CLOSED);
        if (open.isEmpty()) throw new BusinessException("La mesa no tiene comandas pendientes");
        if (open.stream().anyMatch(o -> o.getStatus() != OrderStatus.SERVIDA)) throw new BusinessException("Todas las comandas deben estar servidas antes de cobrar");
        BigDecimal total = open.stream().map(CustomerOrder::total).reduce(BigDecimal.ZERO, BigDecimal::add);
        LocalDateTime paidAt = LocalDateTime.now();
        open.forEach(o -> { o.setStatus(OrderStatus.PAGADA); o.setPaidAt(paidAt); });
        table.setStatus(TableStatus.DISPONIBLE); table.setGuests(null); table.setOpenedAt(null);
        return payments.save(Payment.builder().table(table).amount(total).method(method).build());
    }

    private DiningTable table(Long id) { return tables.findById(id).orElseThrow(() -> new NotFoundException("Mesa", id)); }
    private Reservation reservation(Long id) { return reservations.findById(id).orElseThrow(() -> new NotFoundException("Reserva", id)); }
}
