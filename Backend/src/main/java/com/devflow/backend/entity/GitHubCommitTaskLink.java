// GitHubCommitTaskLink.java
package com.devflow.backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "github_commit_task_links",
        uniqueConstraints = @UniqueConstraint(columnNames = {"github_commit_id", "task_id"}))
public class GitHubCommitTaskLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "github_commit_id", nullable = false)
    @NotNull
    private GitHubCommit gitHubCommit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", nullable = false)
    @NotNull
    private Task task;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false)
    private GitHubLinkType linkType = GitHubLinkType.REFERENCE;

    @Column(name = "reference_text")
    private String referenceText; // The actual text that created the link (e.g., "#123")

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
