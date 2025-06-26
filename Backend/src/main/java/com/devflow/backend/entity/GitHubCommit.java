
package com.devflow.backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "github_commits",
        indexes = {
                @Index(name = "idx_commit_sha", columnList = "commit_sha"),
                @Index(name = "idx_commit_connection", columnList = "github_connection_id"),
                @Index(name = "idx_commit_created", columnList = "created_at")
        })
public class GitHubCommit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "github_connection_id", nullable = false)
    @NotNull
    private GitHubConnection gitHubConnection;

    @NotBlank
    @Column(name = "commit_sha", nullable = false, unique = true)
    private String commitSha;

    @NotBlank
    @Column(name = "commit_message", nullable = false, columnDefinition = "TEXT")
    private String commitMessage;

    @NotBlank
    @Column(name = "author_name", nullable = false)
    private String authorName;

    @NotBlank
    @Column(name = "author_email", nullable = false)
    private String authorEmail;

    @Column(name = "author_username")
    private String authorUsername;

    @Column(name = "committer_name")
    private String committerName;

    @Column(name = "committer_email")
    private String committerEmail;

    @NotNull
    @Column(name = "commit_date", nullable = false)
    private LocalDateTime commitDate;

    @Column(name = "commit_url", nullable = false)
    private String commitUrl;

    @Column(name = "branch_name")
    private String branchName;

    @OneToMany(mappedBy = "gitHubCommit", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<GitHubCommitTaskLink> taskLinks = new ArrayList<>();

    @Column(name = "additions")
    private Integer additions;

    @Column(name = "deletions")
    private Integer deletions;

    @Column(name = "changed_files")
    private Integer changedFiles;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;


    public List<String> extractTaskReferences() {
        List<String> references = new ArrayList<>();
        if (commitMessage == null) return references;


        String[] patterns = {
                "#(\\d+)",
                "(?i)(TASK|DEV|ISSUE|BUG|FEAT|FIX)[-_]?(\\d+)",
                "(?i)closes?\\s+#(\\d+)",
                "(?i)fixes?\\s+#(\\d+)",
                "(?i)resolves?\\s+#(\\d+)"
        };

        for (String pattern : patterns) {
            java.util.regex.Pattern p = java.util.regex.Pattern.compile(pattern);
            java.util.regex.Matcher m = p.matcher(commitMessage);
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

        return references.stream().distinct().collect(java.util.stream.Collectors.toList());
    }

    public boolean isFromMainBranch() {
        return branchName != null &&
                (branchName.equals("main") || branchName.equals("master"));
    }

    public String getShortSha() {
        return commitSha != null && commitSha.length() >= 7
                ? commitSha.substring(0, 7)
                : commitSha;
    }
}