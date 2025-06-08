package com.devflow.backend.repository;

import com.devflow.backend.entity.TokenType;
import com.devflow.backend.entity.VerificationToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface VerificationTokenRepository extends JpaRepository<VerificationToken, Long> {

    Optional<VerificationToken> findByToken(String token);

    Optional<VerificationToken> findByEmailAndCodeAndType(String email, String code, TokenType type);

    @Query("SELECT vt FROM VerificationToken vt WHERE vt.email = ?1 AND vt.type = ?2 AND vt.usedAt IS NULL AND vt.expiresAt > ?3")
    Optional<VerificationToken> findValidTokenByEmailAndType(String email, TokenType type, LocalDateTime now);

    @Modifying
    @Query("DELETE FROM VerificationToken vt WHERE vt.expiresAt < ?1")
    void deleteExpiredTokens(LocalDateTime now);

    @Modifying
    @Query("DELETE FROM VerificationToken vt WHERE vt.email = ?1 AND vt.type = ?2")
    void deleteByEmailAndType(String email, TokenType type);
}