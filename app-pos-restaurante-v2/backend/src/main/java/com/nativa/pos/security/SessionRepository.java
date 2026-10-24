package com.nativa.pos.security;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.*;

public interface SessionRepository extends JpaRepository<StaffSession, String> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select s from StaffSession s where s.id = :id")
  Optional<StaffSession> locked(String id);
}
