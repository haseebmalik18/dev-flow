// GitHubIntegrationService.java
package com.devflow.backend.service;

import com.devflow.backend.dto.github.GitHubDTOs.*;
import com.devflow.backend.entity.*;
import com.devflow.backend.exception.AuthException;
import com.devflow.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class GitHubIntegrationService {

    private final GitHubConnectionRepository connectionRepository;
    private final GitHubCommitRepository commitRepository;
    private final GitHubPullRequestRepository pullRequestRepository;
    private final GitHubCommitTaskLinkRepository commitTaskLinkRepository;
    private final GitHubPRTaskLinkRepository prTaskLinkRepository;
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final ActivityService activityService;
    private final GitHubWebhookService webhookService;
    private final GitHubTaskLinkingService taskLinkingService;

    /**
     * Create a new GitHub connection for a project
     */
    public ConnectionResponse createConnection(CreateConnectionRequest request, User user) {
        Project project = findProjectWithAccess(request.getProjectId(), user);

        // Check if connection already exists
        if (connectionRepository.existsActiveConnectionForProjectAndRepository(
                project, request.getRepositoryFullName())) {
            throw new AuthException("Repository is already connected to this project");
        }

        try {
            // Create webhook
            String webhookId = webhookService.createWebhook(
                    request.getRepositoryFullName(),
                    request.getAccessToken()
            );

            // Create connection
            GitHubConnection connection = GitHubConnection.builder()
                    .project(project)
                    .repositoryFullName(request.getRepositoryFullName())
                    .repositoryUrl(request.getRepositoryUrl())
                    .repositoryId(request.getRepositoryId())
                    .webhookId(webhookId)
                    .installationId(request.getInstallationId())
                    .connectedBy(user)
                    .status(GitHubConnectionStatus.ACTIVE)
                    .webhookStatus(GitHubWebhookStatus.PENDING)
                    .build();

            connection = connectionRepository.save(connection);

            // Create activity
            activityService.createProjectUpdatedActivity(
                    user,
                    project,
                    java.util.Map.of("githubConnection", "Repository " + request.getRepositoryFullName() + " connected")
            );

            // Start initial sync asynchronously
            syncConnectionAsync(connection.getId());

            log.info("GitHub connection created: {} for project: {} by user: {}",
                    request.getRepositoryFullName(), project.getName(), user.getUsername());

            return mapToConnectionResponse(connection);

        } catch (Exception e) {
            log.error("Failed to create GitHub connection: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to connect repository: " + e.getMessage());
        }
    }

    /**
     * Get all connections for a project
     */
    @Transactional(readOnly = true)
    public List<ConnectionResponse> getProjectConnections(Long projectId, User user) {
        Project project = findProjectWithAccess(projectId, user);

        List<GitHubConnection> connections = connectionRepository.findByProjectOrderByCreatedAtDesc(project);
        return connections.stream()
                .map(this::mapToConnectionResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get connection by ID
     */
    @Transactional(readOnly = true)
    public ConnectionResponse getConnection(Long connectionId, User user) {
        GitHubConnection connection = findConnectionWithAccess(connectionId, user);
        return mapToConnectionResponse(connection);
    }

    /**
     * Delete a GitHub connection
     */
    public void deleteConnection(Long connectionId, User user) {
        GitHubConnection connection = findConnectionWithAccess(connectionId, user);

        if (!canUserManageConnections(user, connection.getProject())) {
            throw new AuthException("You don't have permission to delete this connection");
        }

        try {
            // Remove webhook
            webhookService.deleteWebhook(connection.getRepositoryFullName(), connection.getWebhookId());

            // Update status instead of deleting to preserve history
            connection.setStatus(GitHubConnectionStatus.DISCONNECTED);
            connection.setWebhookStatus(GitHubWebhookStatus.INACTIVE);
            connectionRepository.save(connection);

            // Create activity
            activityService.createProjectUpdatedActivity(
                    user,
                    connection.getProject(),
                    java.util.Map.of("githubConnection", "Repository " + connection.getRepositoryFullName() + " disconnected")
            );

            log.info("GitHub connection deleted: {} for project: {} by user: {}",
                    connection.getRepositoryFullName(), connection.getProject().getName(), user.getUsername());

        } catch (Exception e) {
            log.error("Failed to delete GitHub connection: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to disconnect repository: " + e.getMessage());
        }
    }

    /**
     * Get commits for a project
     */
    @Transactional(readOnly = true)
    public Page<CommitResponse> getProjectCommits(Long projectId, User user, int page, int size) {
        Project project = findProjectWithAccess(projectId, user);

        Pageable pageable = PageRequest.of(page, size);
        Page<GitHubCommit> commits = commitRepository.findByProjectOrderByCommitDateDesc(project, pageable);

        return commits.map(this::mapToCommitResponse);
    }

    /**
     * Get commits for a task
     */
    @Transactional(readOnly = true)
    public List<CommitResponse> getTaskCommits(Long taskId, User user) {
        Task task = findTaskWithAccess(taskId, user);

        List<GitHubCommit> commits = commitRepository.findByTaskOrderByCommitDateDesc(task);
        return commits.stream()
                .map(this::mapToCommitResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get pull requests for a project
     */
    @Transactional(readOnly = true)
    public Page<PullRequestResponse> getProjectPullRequests(Long projectId, User user, int page, int size) {
        Project project = findProjectWithAccess(projectId, user);

        Pageable pageable = PageRequest.of(page, size);
        Page<GitHubPullRequest> pullRequests = pullRequestRepository.findByProjectOrderByCreatedDateDesc(project, pageable);

        return pullRequests.map(this::mapToPullRequestResponse);
    }

    /**
     * Get pull requests for a task
     */
    @Transactional(readOnly = true)
    public List<PullRequestResponse> getTaskPullRequests(Long taskId, User user) {
        Task task = findTaskWithAccess(taskId, user);

        List<GitHubPullRequest> pullRequests = pullRequestRepository.findByTaskOrderByCreatedDateDesc(task);
        return pullRequests.stream()
                .map(this::mapToPullRequestResponse)
                .collect(Collectors.toList());
    }

    /**
     * Search GitHub content
     */
    @Transactional(readOnly = true)
    public GitHubSearchResponse search(GitHubSearchRequest request, User user) {
        if (request.getProjectId() != null) {
            findProjectWithAccess(request.getProjectId(), user);
        }

        return taskLinkingService.search(request);
    }

    /**
     * Manual sync of a connection
     */
    public SyncResponse syncConnection(Long connectionId, User user) {
        GitHubConnection connection = findConnectionWithAccess(connectionId, user);

        if (!canUserManageConnections(user, connection.getProject())) {
            throw new AuthException("You don't have permission to sync this connection");
        }

        try {
            SyncResults results = taskLinkingService.syncConnection(connection);

            connection.setLastSyncAt(LocalDateTime.now());
            connection.clearErrors();
            connectionRepository.save(connection);

            log.info("Manual sync completed for connection: {} by user: {}",
                    connection.getRepositoryFullName(), user.getUsername());

            return SyncResponse.builder()
                    .success(true)
                    .message("Sync completed successfully")
                    .results(results)
                    .syncedAt(LocalDateTime.now())
                    .build();

        } catch (Exception e) {
            connection.recordError("Sync failed: " + e.getMessage());
            connectionRepository.save(connection);

            log.error("Failed to sync connection: {}", e.getMessage(), e);

            return SyncResponse.builder()
                    .success(false)
                    .message("Sync failed: " + e.getMessage())
                    .syncedAt(LocalDateTime.now())
                    .build();
        }
    }

    /**
     * Create manual task link
     */
    public TaskLinkSummary createCommitTaskLink(Long commitId, CreateTaskLinkRequest request, User user) {
        GitHubCommit commit = commitRepository.findById(commitId)
                .orElseThrow(() -> new AuthException("Commit not found"));

        Task task = findTaskWithAccess(request.getTaskId(), user);

        // Verify commit belongs to a project the user has access to
        if (!projectRepository.hasUserAccessToProject(user, commit.getGitHubConnection().getProject().getId())) {
            throw new AuthException("You don't have access to this commit");
        }

        // Check if link already exists
        if (commitTaskLinkRepository.existsByGitHubCommitAndTask(commit, task)) {
            throw new AuthException("Link between commit and task already exists");
        }

        GitHubCommitTaskLink link = GitHubCommitTaskLink.builder()
                .gitHubCommit(commit)
                .task(task)
                .linkType(request.getLinkType())
                .referenceText(request.getReferenceText())
                .build();

        link = commitTaskLinkRepository.save(link);

        // Handle status updates based on link type
        if (request.getLinkType() == GitHubLinkType.CLOSES ||
                request.getLinkType() == GitHubLinkType.FIXES ||
                request.getLinkType() == GitHubLinkType.RESOLVES) {

            updateTaskStatusFromCommit(task, commit, user);
        }

        log.info("Manual commit-task link created: commit {} linked to task {} by user: {}",
                commit.getCommitSha(), task.getId(), user.getUsername());

        return mapToTaskLinkSummary(link);
    }

    /**
     * Create manual PR task link
     */
    public TaskLinkSummary createPRTaskLink(Long prId, CreateTaskLinkRequest request, User user) {
        GitHubPullRequest pullRequest = pullRequestRepository.findById(prId)
                .orElseThrow(() -> new AuthException("Pull request not found"));

        Task task = findTaskWithAccess(request.getTaskId(), user);

        // Verify PR belongs to a project the user has access to
        if (!projectRepository.hasUserAccessToProject(user, pullRequest.getGitHubConnection().getProject().getId())) {
            throw new AuthException("You don't have access to this pull request");
        }

        // Check if link already exists
        if (prTaskLinkRepository.existsByGitHubPullRequestAndTask(pullRequest, task)) {
            throw new AuthException("Link between pull request and task already exists");
        }

        GitHubPRTaskLink link = GitHubPRTaskLink.builder()
                .gitHubPullRequest(pullRequest)
                .task(task)
                .linkType(request.getLinkType())
                .referenceText(request.getReferenceText())
                .autoStatusUpdate(request.getAutoStatusUpdate() != null ? request.getAutoStatusUpdate() : true)
                .build();

        link = prTaskLinkRepository.save(link);

        // Handle status updates
        if (link.getAutoStatusUpdate()) {
            updateTaskStatusFromPR(task, pullRequest, user);
        }

        log.info("Manual PR-task link created: PR {} linked to task {} by user: {}",
                pullRequest.getPrNumber(), task.getId(), user.getUsername());

        return mapToTaskLinkSummary(link);
    }

    /**
     * Get GitHub statistics for a project
     */
    @Transactional(readOnly = true)
    public GitHubStatistics getProjectStatistics(Long projectId, User user) {
        Project project = findProjectWithAccess(projectId, user);
        LocalDateTime since = LocalDateTime.now().minusDays(30);

        // Get connection statistics
        List<GitHubConnection> connections = connectionRepository.findByProjectOrderByCreatedAtDesc(project);
        ConnectionStatistics connectionStats = buildConnectionStatistics(connections);

        // Get commit statistics  
        @SuppressWarnings("unchecked")
        java.util.Map<String, Object> commitStatsRaw = (java.util.Map<String, Object>)
                commitRepository.getCommitStatistics(project, since);
        CommitStatistics commitStats = buildCommitStatistics(commitStatsRaw);

        // Get PR statistics
        @SuppressWarnings("unchecked")
        java.util.Map<String, Object> prStatsRaw = (java.util.Map<String, Object>)
                pullRequestRepository.getPRStatistics(project, since);
        PullRequestStatistics prStats = buildPRStatistics(prStatsRaw);

        // Get task link statistics
        List<GitHubCommitTaskLink> commitLinks = commitTaskLinkRepository.findByProject(project);
        List<GitHubPRTaskLink> prLinks = prTaskLinkRepository.findByProject(project);
        TaskLinkStatistics linkStats = buildTaskLinkStatistics(commitLinks, prLinks);

        return GitHubStatistics.builder()
                .connections(connectionStats)
                .commits(commitStats)
                .pullRequests(prStats)
                .taskLinks(linkStats)
                .build();
    }

    // Async methods

    @Async
    public void syncConnectionAsync(Long connectionId) {
        try {
            GitHubConnection connection = connectionRepository.findById(connectionId).orElse(null);
            if (connection != null) {
                taskLinkingService.syncConnection(connection);
                connection.setLastSyncAt(LocalDateTime.now());
                connectionRepository.save(connection);
            }
        } catch (Exception e) {
            log.error("Async sync failed for connection {}: {}", connectionId, e.getMessage());
        }
    }

    // Private helper methods

    private Project findProjectWithAccess(Long projectId, User user) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new AuthException("Project not found"));

        if (!projectRepository.hasUserAccessToProject(user, projectId)) {
            throw new AuthException("You don't have access to this project");
        }

        return project;
    }

    private Task findTaskWithAccess(Long taskId, User user) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new AuthException("Task not found"));

        if (!taskRepository.hasUserAccessToTask(user, taskId)) {
            throw new AuthException("You don't have access to this task");
        }

        return task;
    }

    private GitHubConnection findConnectionWithAccess(Long connectionId, User user) {
        GitHubConnection connection = connectionRepository.findById(connectionId)
                .orElseThrow(() -> new AuthException("GitHub connection not found"));

        if (!projectRepository.hasUserAccessToProject(user, connection.getProject().getId())) {
            throw new AuthException("You don't have access to this connection");
        }

        return connection;
    }

    private boolean canUserManageConnections(User user, Project project) {
        return project.getOwner().equals(user) ||
                user.getRole() == Role.ADMIN;
    }

    private void updateTaskStatusFromCommit(Task task, GitHubCommit commit, User user) {
        if (commit.isFromMainBranch() && task.getStatus() != TaskStatus.DONE) {
            TaskStatus oldStatus = task.getStatus();
            task.setStatus(TaskStatus.DONE);
            task.setCompletedDate(LocalDateTime.now());
            task.setProgress(100);
            taskRepository.save(task);

            activityService.createTaskStatusChangedActivity(user, task, oldStatus, TaskStatus.DONE);
            activityService.createTaskCompletedActivity(user, task);
        }
    }

    private void updateTaskStatusFromPR(Task task, GitHubPullRequest pullRequest, User user) {
        TaskStatus suggestedStatus = pullRequest.suggestTaskStatus();

        if (task.getStatus() != suggestedStatus) {
            TaskStatus oldStatus = task.getStatus();
            task.setStatus(suggestedStatus);

            if (suggestedStatus == TaskStatus.DONE) {
                task.setCompletedDate(LocalDateTime.now());
                task.setProgress(100);
            }

            taskRepository.save(task);

            activityService.createTaskStatusChangedActivity(user, task, oldStatus, suggestedStatus);

            if (suggestedStatus == TaskStatus.DONE) {
                activityService.createTaskCompletedActivity(user, task);
            }
        }
    }

    // Mapping methods

    private ConnectionResponse mapToConnectionResponse(GitHubConnection connection) {
        return ConnectionResponse.builder()
                .id(connection.getId())
                .repositoryFullName(connection.getRepositoryFullName())
                .repositoryUrl(connection.getRepositoryUrl())
                .repositoryId(connection.getRepositoryId())
                .status(connection.getStatus())
                .webhookStatus(connection.getWebhookStatus())
                .webhookId(connection.getWebhookId())
                .installationId(connection.getInstallationId())
                .lastSyncAt(connection.getLastSyncAt())
                .lastWebhookAt(connection.getLastWebhookAt())
                .errorMessage(connection.getErrorMessage())
                .errorCount(connection.getErrorCount())
                .createdAt(connection.getCreatedAt())
                .updatedAt(connection.getUpdatedAt())
                .project(mapToProjectSummary(connection.getProject()))
                .connectedBy(mapToUserSummary(connection.getConnectedBy()))
                .health(buildConnectionHealth(connection))
                .build();
    }

    private CommitResponse mapToCommitResponse(GitHubCommit commit) {
        return CommitResponse.builder()
                .id(commit.getId())
                .commitSha(commit.getCommitSha())
                .shortSha(commit.getShortSha())
                .commitMessage(commit.getCommitMessage())
                .authorName(commit.getAuthorName())
                .authorEmail(commit.getAuthorEmail())
                .authorUsername(commit.getAuthorUsername())
                .committerName(commit.getCommitterName())
                .committerEmail(commit.getCommitterEmail())
                .commitDate(commit.getCommitDate())
                .commitUrl(commit.getCommitUrl())
                .branchName(commit.getBranchName())
                .additions(commit.getAdditions())
                .deletions(commit.getDeletions())
                .changedFiles(commit.getChangedFiles())
                .createdAt(commit.getCreatedAt())
                .connection(mapToConnectionSummary(commit.getGitHubConnection()))
                .taskLinks(commit.getTaskLinks().stream()
                        .map(this::mapToTaskLinkSummary)
                        .collect(Collectors.toList()))
                .isFromMainBranch(commit.isFromMainBranch())
                .build();
    }

    private PullRequestResponse mapToPullRequestResponse(GitHubPullRequest pr) {
        return PullRequestResponse.builder()
                .id(pr.getId())
                .prNumber(pr.getPrNumber())
                .title(pr.getTitle())
                .description(pr.getDescription())
                .status(pr.getStatus())
                .mergeState(pr.getMergeState())
                .authorUsername(pr.getAuthorUsername())
                .authorName(pr.getAuthorName())
                .headBranch(pr.getHeadBranch())
                .baseBranch(pr.getBaseBranch())
                .headSha(pr.getHeadSha())
                .mergeCommitSha(pr.getMergeCommitSha())
                .prUrl(pr.getPrUrl())
                .createdDate(pr.getCreatedDate())
                .updatedDate(pr.getUpdatedDate())
                .mergedDate(pr.getMergedDate())
                .closedDate(pr.getClosedDate())
                .additions(pr.getAdditions())
                .deletions(pr.getDeletions())
                .changedFiles(pr.getChangedFiles())
                .commitsCount(pr.getCommitsCount())
                .reviewCommentsCount(pr.getReviewCommentsCount())
                .commentsCount(pr.getCommentsCount())
                .createdAt(pr.getCreatedAt())
                .updatedAt(pr.getUpdatedAt())
                .connection(mapToConnectionSummary(pr.getGitHubConnection()))
                .taskLinks(pr.getTaskLinks().stream()
                        .map(this::mapToTaskLinkSummary)
                        .collect(Collectors.toList()))
                .isOpen(pr.isOpen())
                .isMerged(pr.isMerged())
                .isDraft(pr.isDraft())
                .suggestedTaskStatus(pr.suggestTaskStatus())
                .build();
    }

    private TaskLinkSummary mapToTaskLinkSummary(GitHubCommitTaskLink link) {
        return TaskLinkSummary.builder()
                .id(link.getId())
                .linkType(link.getLinkType())
                .referenceText(link.getReferenceText())
                .createdAt(link.getCreatedAt())
                .task(mapToTaskSummary(link.getTask()))
                .build();
    }

    private TaskLinkSummary mapToTaskLinkSummary(GitHubPRTaskLink link) {
        return TaskLinkSummary.builder()
                .id(link.getId())
                .linkType(link.getLinkType())
                .referenceText(link.getReferenceText())
                .createdAt(link.getCreatedAt())
                .task(mapToTaskSummary(link.getTask()))
                .build();
    }

    private ConnectionSummary mapToConnectionSummary(GitHubConnection connection) {
        return ConnectionSummary.builder()
                .id(connection.getId())
                .repositoryFullName(connection.getRepositoryFullName())
                .status(connection.getStatus())
                .webhookStatus(connection.getWebhookStatus())
                .lastWebhookAt(connection.getLastWebhookAt())
                .errorCount(connection.getErrorCount())
                .createdAt(connection.getCreatedAt())
                .build();
    }

    private ProjectSummary mapToProjectSummary(Project project) {
        return ProjectSummary.builder()
                .id(project.getId())
                .name(project.getName())
                .color(project.getColor())
                .build();
    }

    private UserSummary mapToUserSummary(User user) {
        return UserSummary.builder()
                .id(user.getId())
                .username(user.getUsername())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .avatar(user.getAvatar())
                .jobTitle(user.getJobTitle())
                .build();
    }

    private TaskSummary mapToTaskSummary(Task task) {
        return TaskSummary.builder()
                .id(task.getId())
                .title(task.getTitle())
                .status(task.getStatus())
                .priority(task.getPriority())
                .dueDate(task.getDueDate())
                .isOverdue(task.isOverdue())
                .build();
    }

    private ConnectionHealth buildConnectionHealth(GitHubConnection connection) {
        List<String> issues = new ArrayList<>();

        if (connection.getStatus() != GitHubConnectionStatus.ACTIVE) {
            issues.add("Connection is not active");
        }

        if (connection.getWebhookStatus() != GitHubWebhookStatus.ACTIVE) {
            issues.add("Webhook is not active");
        }

        if (connection.getErrorCount() != null && connection.getErrorCount() > 0) {
            issues.add("Recent errors detected (" + connection.getErrorCount() + ")");
        }

        if (connection.getLastWebhookAt() != null &&
                connection.getLastWebhookAt().isBefore(LocalDateTime.now().minusHours(24))) {
            issues.add("No recent webhook activity");
        }

        return ConnectionHealth.builder()
                .isHealthy(issues.isEmpty())
                .status(issues.isEmpty() ? "Healthy" : "Issues detected")
                .issues(issues)
                .lastCheck(LocalDateTime.now())
                .build();
    }

    private ConnectionStatistics buildConnectionStatistics(List<GitHubConnection> connections) {
        long total = connections.size();
        long active = connections.stream()
                .filter(conn -> conn.getStatus() == GitHubConnectionStatus.ACTIVE)
                .count();
        long webhooksActive = connections.stream()
                .filter(conn -> conn.getWebhookStatus() == GitHubWebhookStatus.ACTIVE)
                .count();
        long withErrors = connections.stream()
                .filter(conn -> conn.getErrorCount() != null && conn.getErrorCount() > 0)
                .count();
        long recentActivity = connections.stream()
                .filter(conn -> conn.getLastWebhookAt() != null &&
                        conn.getLastWebhookAt().isAfter(LocalDateTime.now().minusHours(24)))
                .count();

        return ConnectionStatistics.builder()
                .totalConnections(total)
                .activeConnections(active)
                .webhooksActive(webhooksActive)
                .connectionsWithErrors(withErrors)
                .recentActivity(recentActivity)
                .build();
    }

    private CommitStatistics buildCommitStatistics(java.util.Map<String, Object> stats) {
        return CommitStatistics.builder()
                .totalCommits(getLongValue(stats, "totalCommits"))
                .uniqueAuthors(getLongValue(stats, "uniqueAuthors"))
                .uniqueBranches(getLongValue(stats, "uniqueBranches"))
                .totalAdditions(getLongValue(stats, "totalAdditions"))
                .totalDeletions(getLongValue(stats, "totalDeletions"))
                .totalChangedFiles(getLongValue(stats, "totalChangedFiles"))
                .build();
    }

    private PullRequestStatistics buildPRStatistics(java.util.Map<String, Object> stats) {
        return PullRequestStatistics.builder()
                .totalPRs(getLongValue(stats, "totalPRs"))
                .openPRs(getLongValue(stats, "openPRs"))
                .mergedPRs(getLongValue(stats, "mergedPRs"))
                .closedPRs(getLongValue(stats, "closedPRs"))
                .uniqueAuthors(getLongValue(stats, "uniqueAuthors"))
                .avgAdditions(getDoubleValue(stats, "avgAdditions"))
                .avgDeletions(getDoubleValue(stats, "avgDeletions"))
                .build();
    }

    private TaskLinkStatistics buildTaskLinkStatistics(List<GitHubCommitTaskLink> commitLinks,
                                                       List<GitHubPRTaskLink> prLinks) {
        long commitLinksCount = commitLinks.size();
        long prLinksCount = prLinks.size();

        long references = commitLinks.stream()
                .filter(link -> link.getLinkType() == GitHubLinkType.REFERENCE)
                .count() +
                prLinks.stream()
                        .filter(link -> link.getLinkType() == GitHubLinkType.REFERENCE)
                        .count();

        long closes = commitLinks.stream()
                .filter(link -> link.getLinkType() == GitHubLinkType.CLOSES)
                .count() +
                prLinks.stream()
                        .filter(link -> link.getLinkType() == GitHubLinkType.CLOSES)
                        .count();

        long fixes = commitLinks.stream()
                .filter(link -> link.getLinkType() == GitHubLinkType.FIXES)
                .count() +
                prLinks.stream()
                        .filter(link -> link.getLinkType() == GitHubLinkType.FIXES)
                        .count();

        long resolves = commitLinks.stream()
                .filter(link -> link.getLinkType() == GitHubLinkType.RESOLVES)
                .count() +
                prLinks.stream()
                        .filter(link -> link.getLinkType() == GitHubLinkType.RESOLVES)
                        .count();

        return TaskLinkStatistics.builder()
                .totalLinks(commitLinksCount + prLinksCount)
                .commitLinks(commitLinksCount)
                .prLinks(prLinksCount)
                .references(references)
                .closes(closes)
                .fixes(fixes)
                .resolves(resolves)
                .build();
    }

    private Long getLongValue(java.util.Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (value instanceof Number) {
            return ((Number) value).longValue();
        }
        return 0L;
    }

    private Double getDoubleValue(java.util.Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        return 0.0;
    }
}