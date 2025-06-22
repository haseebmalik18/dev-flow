// GitHubPullRequest.java
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
@Table(name = "github_pull_requests",
        indexes = {
                @Index(name = "idx_pr_number", columnList = "pr_number"),
                @Index(name = "idx_pr_connection", columnList = "github_connection_id"),
                @Index(name = "idx_pr_status", columnList = "status")
        })
public class GitHubPullRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "github_connection_id", nullable = false)
    @NotNull
    private GitHubConnection gitHubConnection;

    @NotNull
    @Column(name = "pr_number", nullable = false)
    private Integer prNumber;

    @NotBlank
    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private GitHubPRStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "merge_state")
    private GitHubPRMergeState mergeState;

    @NotBlank
    @Column(name = "author_username", nullable = false)
    private String authorUsername;

    @Column(name = "author_name")
    private String authorName;

    @NotBlank
    @Column(name = "head_branch", nullable = false)
    private String headBranch;

    @NotBlank
    @Column(name = "base_branch", nullable = false)
    private String baseBranch;

    @Column(name = "head_sha")
    private String headSha;

    @Column(name = "merge_commit_sha")
    private String mergeCommitSha;

    @NotBlank
    @Column(name = "pr_url", nullable = false)
    private String prUrl;

    @NotNull
    @Column(name = "created_date", nullable = false)
    private LocalDateTime createdDate;

    @Column(name = "updated_date")
    private LocalDateTime updatedDate;

    @Column(name = "merged_date")
    private LocalDateTime mergedDate;

    @Column(name = "closed_date")
    private LocalDateTime closedDate;

    @OneToMany(mappedBy = "gitHubPullRequest", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<GitHubPRTaskLink> taskLinks = new ArrayList<>();

    @Column(name = "additions")
    private Integer additions;

    @Column(name = "deletions")
    private Integer deletions;

    @Column(name = "changed_files")
    private Integer changedFiles;

    @Column(name = "commits_count")
    private Integer commitsCount;

    @Column(name = "review_comments_count")
    private Integer reviewCommentsCount;

    @Column(name = "comments_count")
    private Integer commentsCount;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    // Helper methods
    public List<String> extractTaskReferences() {
        List<String> references = new ArrayList<>();

        // Extract from title
        if (title != null) {
            references.addAll(extractReferencesFromText(title));
        }

        // Extract from description
        if (description != null) {
            references.addAll(extractReferencesFromText(description));
        }

        return references.stream().distinct().collect(java.util.stream.Collectors.toList());
    }

    private List<String> extractReferencesFromText(String text) {
        List<String> references = new ArrayList<>();

        String[] patterns = {
                "#(\\d+)",
                "(?i)(TASK|DEV|ISSUE|BUG|FEAT|FIX)[-_]?(\\d+)",
                "(?i)closes?\\s+#(\\d+)",
                "(?i)fixes?\\s+#(\\d+)",
                "(?i)resolves?\\s+#(\\d+)"
        };

        for (String pattern : patterns) {
            java.util.regex.Pattern p = java.util.regex.Pattern.compile(pattern);
            java.util.regex.Matcher m = p.matcher(text);
            while (m.find()) {
                if (pattern.startsWith("#")) {
                    references.add(m.group(1));
                } else if (pattern.contains("closes?|fixes?|resolves?")) {
                    references.add(m.group(1));
                } else {
                    references.add(m.group(2));
                }
            }
        }

        return references;
    }

    public boolean isOpen() {
        return status == GitHubPRStatus.OPEN;
    }

    public boolean isMerged() {
        return status == GitHubPRStatus.CLOSED && mergedDate != null;
    }

    public boolean isDraft() {
        return status == GitHubPRStatus.DRAFT;
    }

    public TaskStatus suggestTaskStatus() {
        switch (status) {
            case OPEN:
                return TaskStatus.REVIEW;
            case CLOSED:
                return isMerged() ? TaskStatus.DONE : TaskStatus.TODO;
            case DRAFT:
                return TaskStatus.IN_PROGRESS;
            default:
                return TaskStatus.IN_PROGRESS;
        }
    }
}