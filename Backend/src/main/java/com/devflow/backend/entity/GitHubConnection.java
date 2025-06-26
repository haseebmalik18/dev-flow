
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
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "github_connections",
        uniqueConstraints = @UniqueConstraint(columnNames = {"project_id", "repository_full_name"}))
public class GitHubConnection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    @NotNull
    private Project project;

    @NotBlank
    @Column(name = "repository_full_name", nullable = false)
    private String repositoryFullName;

    @NotBlank
    @Column(name = "repository_url", nullable = false)
    private String repositoryUrl;

    @Column(name = "repository_id")
    private Long repositoryId;

    @NotBlank
    @Column(name = "webhook_id")
    private String webhookId;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false)
    private GitHubConnectionStatus status = GitHubConnectionStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false)
    private GitHubWebhookStatus webhookStatus = GitHubWebhookStatus.PENDING;

    @Column(name = "webhook_secret")
    private String webhookSecret;

    @Column(name = "installation_id")
    private Long installationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "connected_by_id", nullable = false)
    @NotNull
    private User connectedBy;

    @OneToMany(mappedBy = "gitHubConnection", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<GitHubCommit> commits = new ArrayList<>();

    @OneToMany(mappedBy = "gitHubConnection", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<GitHubPullRequest> pullRequests = new ArrayList<>();

    @Column(name = "last_sync_at")
    private LocalDateTime lastSyncAt;

    @Column(name = "last_webhook_at")
    private LocalDateTime lastWebhookAt;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "error_count")
    @Builder.Default
    private Integer errorCount = 0;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;


    public void recordWebhookReceived() {
        this.lastWebhookAt = LocalDateTime.now();
        this.errorCount = 0;
        this.errorMessage = null;
    }

    public void recordError(String errorMessage) {
        this.errorMessage = errorMessage;
        this.errorCount = (this.errorCount != null ? this.errorCount : 0) + 1;
        this.updatedAt = LocalDateTime.now();
    }

    public void clearErrors() {
        this.errorMessage = null;
        this.errorCount = 0;
    }

    public boolean isHealthy() {
        return status == GitHubConnectionStatus.ACTIVE &&
                webhookStatus == GitHubWebhookStatus.ACTIVE &&
                (errorCount == null || errorCount < 5);
    }

    public String getRepositoryOwner() {
        return repositoryFullName != null && repositoryFullName.contains("/")
                ? repositoryFullName.split("/")[0]
                : null;
    }

    public String getRepositoryName() {
        return repositoryFullName != null && repositoryFullName.contains("/")
                ? repositoryFullName.split("/")[1]
                : repositoryFullName;
    }
}