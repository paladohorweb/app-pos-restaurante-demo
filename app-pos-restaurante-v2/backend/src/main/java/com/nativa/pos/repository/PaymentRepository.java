package com.nativa.pos.repository;

import com.nativa.pos.entity.Payment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
  List<Payment> findAllByOrderByCreatedAtDesc();

  java.util.Optional<Payment> findByRequestKey(String requestKey);
}
