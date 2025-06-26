package com.devflow.backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "github_user_tokens",
        indexes = {
                @Index(name = "idx_github_user_active", columnList = "user_id, active"),
                @Index(name = "idx_github_token_expiry", columnList = "expires_at")
        })
public class GitHubUserToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @NotNull
    private User user;

    @NotBlank
    @Column(name = "access_token", nullable = false, columnDefinition = "TEXT")
    private String accessToken;

    @Column(name = "token_type")
    @Builder.Default
    private String tokenType = "Bearer";

    @Column(name = "scope")
    private String scope;

    @Column(name = "github_user_id")
    private Long githubUserId;

    @Column(name = "github_username")
    private String githubUsername;

    @Column(name = "github_user_email")
    private String githubUserEmail;

    @Column(name = "active")
    @Builder.Default
    private Boolean active = true;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "last_used_at")
    private LocalDateTime lastUsedAt;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public boolean isExpired() {
        return expiresAt != null && expiresAt.isBefore(LocalDateTime.now());
    }

    public void markAsUsed() {
        this.lastUsedAt = LocalDateTime.now();
    }

    public void deactivate() {
        this.active = false;
    }

    public boolean isValid() {
        return active && !isExpired();
    }
}