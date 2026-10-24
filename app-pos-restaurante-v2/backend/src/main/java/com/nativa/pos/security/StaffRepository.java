package com.nativa.pos.security;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StaffRepository extends JpaRepository<StaffUser, Long> {
  Optional<StaffUser> findByUsername(String username);
}
