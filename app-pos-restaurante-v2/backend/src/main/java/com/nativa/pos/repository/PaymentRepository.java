package com.nativa.pos.repository;
import com.nativa.pos.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface PaymentRepository extends JpaRepository<Payment, Long> { List<Payment> findAllByOrderByCreatedAtDesc(); }
