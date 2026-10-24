package com.nativa.pos.security;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.*;

@Entity
@Table(name = "staff_sessions")
@Getter
@Setter
@NoArgsConstructor
public class StaffSession {
  @Id
  @Column(length = 36)
  private String id;

  @ManyToOne(fetch = FetchType.EAGER, optional = false)
  private StaffUser staff;

  @Column(nullable = false, length = 64)
  private String refreshHash;

  @Column(nullable = false)
  private Instant expiresAt;
}
