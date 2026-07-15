package com.nativa.pos.repository;
import com.nativa.pos.entity.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;
public interface CustomerOrderRepository extends JpaRepository<CustomerOrder, Long> {
    @EntityGraph(attributePaths = {"items", "items.product", "table"})
    List<CustomerOrder> findAllByOrderByCreatedAtDesc();
    @EntityGraph(attributePaths = {"items", "items.product", "table"})
    @Query("select distinct o from CustomerOrder o where o.table.id = :tableId and o.status not in :closed")
    List<CustomerOrder> findOpenByTable(@Param("tableId") Long tableId, @Param("closed") Collection<OrderStatus> closed);
}
