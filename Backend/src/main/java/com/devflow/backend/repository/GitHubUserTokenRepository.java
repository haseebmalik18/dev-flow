package com.devflow.backend.repository;

import com.devflow.backend.entity.GitHubUserToken;
import com.devflow.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface GitHubUserTokenRepository extends JpaRepository<GitHubUserToken, Long> {

    Optional<GitHubUserToken> findByUserAndActiveTrue(User user);

    List<GitHubUserToken> findByUserOrderByCreatedAtDesc(User user);

    Optional<GitHubUserToken> findByGithubUsernameAndActiveTrue(String githubUsername);

    List<GitHubUserToken> findByActiveTrueAndExpiresAtBefore(LocalDateTime threshold);

    boolean existsByUserAndActiveTrue(User user);

    @Modifying
    @Query("UPDATE GitHubUserToken t SET t.active = false WHERE t.user = :user AND t.active = true")
    void deactivateAllTokensForUser(@Param("user") User user);

    @Modifying
    @Query("UPDATE GitHubUserToken t SET t.lastUsedAt = CURRENT_TIMESTAMP WHERE t.id = :tokenId")
    void updateLastUsedAt(@Param("tokenId") Long tokenId);

    @Modifying
    @Query("UPDATE GitHubUserToken t SET t.active = false WHERE t.expiresAt < CURRENT_TIMESTAMP AND t.active = true")
    void deactivateExpiredTokens();

    @Query("SELECT COUNT(t) FROM GitHubUserToken t WHERE t.active = true")
    long countActiveTokens();

    @Query("SELECT COUNT(t) FROM GitHubUserToken t WHERE t.active = true AND t.lastUsedAt > :threshold")
    long countRecentlyUsedTokens(@Param("threshold") LocalDateTime threshold);
}