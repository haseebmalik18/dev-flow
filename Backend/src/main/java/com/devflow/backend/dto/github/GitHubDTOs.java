// GitHubDTOs.java
package com.devflow.backend.dto.github;

import com.devflow.backend.entity.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

public class GitHubDTOs {

    // Connection DTOs
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateConnectionRequest {
        @NotNull(message = "Project ID is required")
        private Long projectId;

        @NotBlank(message = "Repository full name is required")
        private String repositoryFullName; // "owner/repo"

        @NotBlank(message = "Repository URL is required")
        private String repositoryUrl;

        private Long repositoryId;
        private Long installationId;
        private String accessToken; // Temporary, will be used to setup webhook
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConnectionResponse {
        private Long id;
        private String repositoryFullName;
        private String repositoryUrl;
        private Long repositoryId;
        private GitHubConnectionStatus status;
        private GitHubWebhookStatus webhookStatus;
        private String webhookId;
        private Long installationId;
        private LocalDateTime lastSyncAt;
        private LocalDateTime lastWebhookAt;
        private String errorMessage;
        private Integer errorCount;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        // Related data
        private ProjectSummary project;
        private UserSummary connectedBy;
        private ConnectionHealth health;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConnectionSummary {
        private Long id;
        private String repositoryFullName;
        private GitHubConnectionStatus status;
        private GitHubWebhookStatus webhookStatus;
        private LocalDateTime lastWebhookAt;
        private Integer errorCount;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConnectionHealth {
        private Boolean isHealthy;
        private String status;
        private List<String> issues;
        private LocalDateTime lastCheck;
    }

    // Commit DTOs
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CommitResponse {
        private Long id;
        private String commitSha;
        private String shortSha;
        private String commitMessage;
        private String authorName;
        private String authorEmail;
        private String authorUsername;
        private String committerName;
        private String committerEmail;
        private LocalDateTime commitDate;
        private String commitUrl;
        private String branchName;
        private Integer additions;
        private Integer deletions;
        private Integer changedFiles;
        private LocalDateTime createdAt;

        // Related data
        private ConnectionSummary connection;
        private List<TaskLinkSummary> taskLinks;
        private Boolean isFromMainBranch;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CommitSummary {
        private Long id;
        private String commitSha;
        private String shortSha;
        private String commitMessage;
        private String authorName;
        private String authorUsername;
        private LocalDateTime commitDate;
        private String branchName;
        private Integer taskLinksCount;
        private Boolean isFromMainBranch;
    }

    // Pull Request DTOs
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PullRequestResponse {
        private Long id;
        private Integer prNumber;
        private String title;
        private String description;
        private GitHubPRStatus status;
        private GitHubPRMergeState mergeState;
        private String authorUsername;
        private String authorName;
        private String headBranch;
        private String baseBranch;
        private String headSha;
        private String mergeCommitSha;
        private String prUrl;
        private LocalDateTime createdDate;
        private LocalDateTime updatedDate;
        private LocalDateTime mergedDate;
        private LocalDateTime closedDate;
        private Integer additions;
        private Integer deletions;
        private Integer changedFiles;
        private Integer commitsCount;
        private Integer reviewCommentsCount;
        private Integer commentsCount;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        // Related data
        private ConnectionSummary connection;
        private List<TaskLinkSummary> taskLinks;
        private Boolean isOpen;
        private Boolean isMerged;
        private Boolean isDraft;
        private TaskStatus suggestedTaskStatus;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PullRequestSummary {
        private Long id;
        private Integer prNumber;
        private String title;
        private GitHubPRStatus status;
        private String authorUsername;
        private String headBranch;
        private String baseBranch;
        private LocalDateTime createdDate;
        private LocalDateTime mergedDate;
        private Integer taskLinksCount;
        private Boolean isOpen;
        private Boolean isMerged;
    }

    // Task Link DTOs
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TaskLinkSummary {
        private Long id;
        private GitHubLinkType linkType;
        private String referenceText;
        private LocalDateTime createdAt;
        private TaskSummary task;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateTaskLinkRequest {
        @NotNull(message = "Task ID is required")
        private Long taskId;

        @NotNull(message = "Link type is required")
        private GitHubLinkType linkType;

        private String referenceText;
        private Boolean autoStatusUpdate;
    }

    // Webhook DTOs
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WebhookEventRequest {
        private String event;
        private String action;
        private Object payload;
        private String signature;
        private String deliveryId;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WebhookEventResponse {
        private Boolean processed;
        private String message;
        private List<String> actions;
        private LocalDateTime processedAt;
    }

    // Repository DTOs
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RepositoryInfo {
        private Long id;
        private String fullName;
        private String name;
        private String owner;
        private String description;
        private String url;
        private String cloneUrl;
        private String defaultBranch;
        private Boolean isPrivate;
        private Boolean isFork;
        private Integer stargazersCount;
        private Integer forksCount;
        private String language;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private LocalDateTime pushedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RepositorySearchResult {
        private List<RepositoryInfo> repositories;
        private Integer totalCount;
        private Boolean hasMore;
    }

    // Authentication DTOs
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GitHubAuthRequest {
        @NotBlank(message = "Authorization code is required")
        private String code;

        @NotBlank(message = "State is required")
        private String state;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GitHubAuthResponse {
        private String accessToken;
        private String tokenType;
        private String scope;
        private UserInfo userInfo;
        private List<RepositoryInfo> accessibleRepositories;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserInfo {
        private Long id;
        private String login;
        private String name;
        private String email;
        private String avatarUrl;
        private String htmlUrl;
        private String type;
    }

    // Statistics DTOs
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GitHubStatistics {
        private ConnectionStatistics connections;
        private CommitStatistics commits;
        private PullRequestStatistics pullRequests;
        private TaskLinkStatistics taskLinks;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConnectionStatistics {
        private Long totalConnections;
        private Long activeConnections;
        private Long webhooksActive;
        private Long connectionsWithErrors;
        private Long recentActivity;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CommitStatistics {
        private Long totalCommits;
        private Long uniqueAuthors;
        private Long uniqueBranches;
        private Long totalAdditions;
        private Long totalDeletions;
        private Long totalChangedFiles;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PullRequestStatistics {
        private Long totalPRs;
        private Long openPRs;
        private Long mergedPRs;
        private Long closedPRs;
        private Long uniqueAuthors;
        private Double avgAdditions;
        private Double avgDeletions;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TaskLinkStatistics {
        private Long totalLinks;
        private Long commitLinks;
        private Long prLinks;
        private Long references;
        private Long closes;
        private Long fixes;
        private Long resolves;
    }

    // Common DTOs
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProjectSummary {
        private Long id;
        private String name;
        private String color;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserSummary {
        private Long id;
        private String username;
        private String firstName;
        private String lastName;
        private String avatar;
        private String jobTitle;

        public String getFullName() {
            return firstName + " " + lastName;
        }

        public String getInitials() {
            return (firstName.substring(0, 1) + lastName.substring(0, 1)).toUpperCase();
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TaskSummary {
        private Long id;
        private String title;
        private TaskStatus status;
        private Priority priority;
        private LocalDateTime dueDate;
        private Boolean isOverdue;
    }

    // Search and Filter DTOs
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GitHubSearchRequest {
        private String query;
        private String type; // "commits", "prs", "repositories"
        private Long projectId;
        private String author;
        private String branch;
        private GitHubPRStatus prStatus;
        private LocalDateTime since;
        private LocalDateTime until;
        private Integer page;
        private Integer size;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GitHubSearchResponse {
        private String type;
        private List<?> results;
        private Long totalCount;
        private Integer currentPage;
        private Integer totalPages;
        private Boolean hasMore;
    }

    // Sync DTOs
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SyncRequest {
        @NotNull(message = "Connection ID is required")
        private Long connectionId;

        private Boolean fullSync;
        private LocalDateTime since;
        private List<String> syncTypes; // "commits", "pullRequests", "taskLinks"
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SyncResponse {
        private Boolean success;
        private String message;
        private SyncResults results;
        private LocalDateTime syncedAt;
        private LocalDateTime nextSyncAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SyncResults {
        private Integer commitsProcessed;
        private Integer pullRequestsProcessed;
        private Integer taskLinksCreated;
        private Integer taskLinksUpdated;
        private Integer tasksUpdated;
        private List<String> errors;
    }
}