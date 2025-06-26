
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
@Table(name = "github_pr_task_links",
        uniqueConstraints = @UniqueConstraint(columnNames = {"github_pull_request_id", "task_id"}))
public class GitHubPRTaskLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "github_pull_request_id", nullable = false)
    @NotNull
    private GitHubPullRequest gitHubPullRequest;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", nullable = false)
    @NotNull
    private Task task;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false)
    private GitHubLinkType linkType = GitHubLinkType.REFERENCE;

    @Column(name = "reference_text")
    private String referenceText;

    @Column(name = "auto_status_update")
    @Builder.Default
    private Boolean autoStatusUpdate = true;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
