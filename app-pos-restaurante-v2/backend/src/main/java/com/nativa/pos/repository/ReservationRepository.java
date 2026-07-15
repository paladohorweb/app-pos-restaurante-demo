package com.nativa.pos.repository;
import com.nativa.pos.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.*;
import java.util.*;
public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    boolean existsByTable_IdAndDateAndTimeAndStatusNotIn(Long tableId, LocalDate date, LocalTime time, Collection<ReservationStatus> statuses);
    List<Reservation> findAllByOrderByDateAscTimeAsc();
}
