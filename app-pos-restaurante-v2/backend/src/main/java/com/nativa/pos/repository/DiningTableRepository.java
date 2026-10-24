package com.nativa.pos.repository;

import com.nativa.pos.entity.DiningTable;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.*;

public interface DiningTableRepository extends JpaRepository<DiningTable, Long> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select t from DiningTable t where t.id = :id")
  Optional<DiningTable> locked(Long id);
}
