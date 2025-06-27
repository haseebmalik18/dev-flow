package com.devflow.backend.service;

import com.devflow.backend.dto.github.GitHubDTOs.*;
import com.devflow.backend.entity.*;
import com.devflow.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class GitHubTaskLinkingService {

    private final GitHubCommitRepository commitRepository;
    private final GitHubPullRequestRepository pullRequestRepository;
    private final GitHubCommitTaskLinkRepository commitTaskLinkRepository;
    private final GitHubPRTaskLinkRepository prTaskLinkRepository;
    private final TaskRepository taskRepository;
    private final ActivityService activityService;

    private static final List<TaskReferencePattern> TASK_PATTERNS = List.of(
            new TaskReferencePattern(Pattern.compile("#(\\d+)"), GitHubLinkType.REFERENCE, 1),
            new TaskReferencePattern(Pattern.compile("(?i)(TASK|DEV|ISSUE|BUG|FEAT|FIX)[-_]?(\\d+)"), GitHubLinkType.REFERENCE, 2),
            new TaskReferencePattern(Pattern.compile("(?i)closes?\\s*:?\\s*#(\\d+)"), GitHubLinkType.CLOSES, 1),
            new TaskReferencePattern(Pattern.compile("(?i)fixes?\\s*:?\\s*#(\\d+)"), GitHubLinkType.FIXES, 1),
            new TaskReferencePattern(Pattern.compile("(?i)resolves?\\s*:?\\s*#(\\d+)"), GitHubLinkType.RESOLVES, 1),
            new TaskReferencePattern(Pattern.compile("(?i)closes?\\s*:?\\s*(TASK|DEV|ISSUE|BUG|FEAT|FIX)[-_]?(\\d+)"), GitHubLinkType.CLOSES, 2),
            new TaskReferencePattern(Pattern.compile("(?i)fixes?\\s*:?\\s*(TASK|DEV|ISSUE|BUG|FEAT|FIX)[-_]?(\\d+)"), GitHubLinkType.FIXES, 2),
            new TaskReferencePattern(Pattern.compile("(?i)resolves?\\s*:?\\s*(TASK|DEV|ISSUE|BUG|FEAT|FIX)[-_]?(\\d+)"), GitHubLinkType.RESOLVES, 2),
            new TaskReferencePattern(Pattern.compile("(?i)\\b(fix|fixed|fixing)\\s*:?\\s*#(\\d+)"), GitHubLinkType.FIXES, 2),
            new TaskReferencePattern(Pattern.compile("(?i)\\b(close|closed|closing)\\s*:?\\s*#(\\d+)"), GitHubLinkType.CLOSES, 2),
            new TaskReferencePattern(Pattern.compile("(?i)\\b(resolve|resolved|resolving)\\s*:?\\s*#(\\d+)"), GitHubLinkType.RESOLVES, 2)
    );

    @lombok.AllArgsConstructor
    private static class TaskReferencePattern {
        Pattern pattern;
        GitHubLinkType linkType;
        int taskIdGroup;
    }

    @lombok.AllArgsConstructor
    private static class TaskReference {
        String taskId;
        GitHubLinkType linkType;
        String referenceText;
    }

    public void linkCommitToTasks(GitHubCommit commit) {
        try {
            log.info("=== LINKING COMMIT TO TASKS ===");
            log.info("Commit: {} - {}", commit.getShortSha(), commit.getCommitMessage());

            List<TaskReference> references = extractTaskReferences(commit.getCommitMessage());
            log.info("Found {} task references in commit message", references.size());

            for (TaskReference reference : references) {
                log.info("Processing reference: Task {}, Type: {}, Text: '{}'",
                        reference.taskId, reference.linkType, reference.referenceText);

                Optional<Task> taskOpt = findTaskById(reference.taskId, commit.getGitHubConnection().getProject());

                if (taskOpt.isPresent()) {
                    Task task = taskOpt.get();
                    log.info("Found task: {} - {}", task.getId(), task.getTitle());

                    if (!commitTaskLinkRepository.existsByGitHubCommitAndTask(commit, task)) {
                        GitHubCommitTaskLink link = GitHubCommitTaskLink.builder()
                                .gitHubCommit(commit)
                                .task(task)
                                .linkType(reference.linkType)
                                .referenceText(reference.referenceText)
                                .build();

                        commitTaskLinkRepository.save(link);

                        updateTaskStatusFromCommit(task, commit, reference.linkType);

                        createCommitLinkActivity(commit, task, reference.linkType);

                        log.info("Linked commit {} to task {} ({})",
                                commit.getShortSha(), task.getId(), reference.linkType);
                    } else {
                        log.info("Link already exists between commit {} and task {}",
                                commit.getShortSha(), task.getId());
                    }
                } else {
                    log.warn("Task {} not found in project {}",
                            reference.taskId, commit.getGitHubConnection().getProject().getId());
                }
            }

        } catch (Exception e) {
            log.error("Failed to link commit {} to tasks: {}", commit.getCommitSha(), e.getMessage());
        }
    }

    public void linkPullRequestToTasks(GitHubPullRequest pullRequest) {
        try {
            log.info("=== LINKING PULL REQUEST TO TASKS ===");
            log.info("PR: #{} - {}", pullRequest.getPrNumber(), pullRequest.getTitle());

            List<TaskReference> references = new ArrayList<>();

            references.addAll(extractTaskReferences(pullRequest.getTitle()));

            if (pullRequest.getDescription() != null) {
                references.addAll(extractTaskReferences(pullRequest.getDescription()));
            }

            log.info("Found {} task references in PR title and description", references.size());

            for (TaskReference reference : references) {
                log.info("Processing reference: Task {}, Type: {}, Text: '{}'",
                        reference.taskId, reference.linkType, reference.referenceText);

                Optional<Task> taskOpt = findTaskById(reference.taskId, pullRequest.getGitHubConnection().getProject());

                if (taskOpt.isPresent()) {
                    Task task = taskOpt.get();
                    log.info("Found task: {} - {}", task.getId(), task.getTitle());

                    if (!prTaskLinkRepository.existsByGitHubPullRequestAndTask(pullRequest, task)) {
                        GitHubPRTaskLink link = GitHubPRTaskLink.builder()
                                .gitHubPullRequest(pullRequest)
                                .task(task)
                                .linkType(reference.linkType)
                                .referenceText(reference.referenceText)
                                .autoStatusUpdate(true)
                                .build();

                        prTaskLinkRepository.save(link);

                        updateTaskStatusFromPR(task, pullRequest, reference.linkType);

                        createPRLinkActivity(pullRequest, task, reference.linkType);

                        log.info("Linked PR #{} to task {} ({})",
                                pullRequest.getPrNumber(), task.getId(), reference.linkType);
                    } else {
                        log.info("Link already exists between PR #{} and task {}",
                                pullRequest.getPrNumber(), task.getId());
                    }
                } else {
                    log.warn("Task {} not found in project {}",
                            reference.taskId, pullRequest.getGitHubConnection().getProject().getId());
                }
            }

        } catch (Exception e) {
            log.error("Failed to link PR #{} to tasks: {}", pullRequest.getPrNumber(), e.getMessage());
        }
    }

    public void updateTaskStatusFromPR(GitHubPullRequest pullRequest) {
        try {
            List<GitHubPRTaskLink> links = prTaskLinkRepository.findByGitHubPullRequest(pullRequest);

            for (GitHubPRTaskLink link : links) {
                if (link.getAutoStatusUpdate()) {
                    updateTaskStatusFromPR(link.getTask(), pullRequest, link.getLinkType());
                }
            }

        } catch (Exception e) {
            log.error("Failed to update task status from PR #{}: {}", pullRequest.getPrNumber(), e.getMessage());
        }
    }

    public SyncResults syncConnection(GitHubConnection connection) {
        LocalDateTime since = connection.getLastSyncAt() != null ?
                connection.getLastSyncAt() : LocalDateTime.now().minusDays(30);

        SyncResults results = SyncResults.builder()
                .commitsProcessed(0)
                .pullRequestsProcessed(0)
                .taskLinksCreated(0)
                .taskLinksUpdated(0)
                .tasksUpdated(0)
                .errors(new ArrayList<>())
                .build();

        try {
            List<GitHubCommit> commits = commitRepository.findCommitsNeedingTaskLinking(connection, since);
            for (GitHubCommit commit : commits) {
                try {
                    linkCommitToTasks(commit);
                    results.setCommitsProcessed(results.getCommitsProcessed() + 1);
                } catch (Exception e) {
                    results.getErrors().add("Failed to process commit " + commit.getShortSha() + ": " + e.getMessage());
                }
            }

            List<GitHubPullRequest> pullRequests = pullRequestRepository.findPRsNeedingTaskLinking(connection, since);
            for (GitHubPullRequest pr : pullRequests) {
                try {
                    linkPullRequestToTasks(pr);
                    results.setPullRequestsProcessed(results.getPullRequestsProcessed() + 1);
                } catch (Exception e) {
                    results.getErrors().add("Failed to process PR #" + pr.getPrNumber() + ": " + e.getMessage());
                }
            }

            log.info("Sync completed for connection {}: {} commits, {} PRs processed",
                    connection.getRepositoryFullName(), results.getCommitsProcessed(), results.getPullRequestsProcessed());

        } catch (Exception e) {
            log.error("Failed to sync connection {}: {}", connection.getRepositoryFullName(), e.getMessage());
            results.getErrors().add("Sync failed: " + e.getMessage());
        }

        return results;
    }

    @Transactional(readOnly = true)
    public GitHubSearchResponse search(GitHubSearchRequest request) {
        try {
            switch (request.getType()) {
                case "commits":
                    return searchCommits(request);
                case "pullRequests":
                case "prs":
                    return searchPullRequests(request);
                default:
                    throw new IllegalArgumentException("Unsupported search type: " + request.getType());
            }
        } catch (Exception e) {
            log.error("Failed to search GitHub content: {}", e.getMessage());
            return GitHubSearchResponse.builder()
                    .type(request.getType())
                    .results(new ArrayList<>())
                    .totalCount(0L)
                    .currentPage(request.getPage() != null ? request.getPage() : 0)
                    .totalPages(0)
                    .hasMore(false)
                    .build();
        }
    }

    private List<TaskReference> extractTaskReferences(String text) {
        List<TaskReference> references = new ArrayList<>();

        if (text == null || text.trim().isEmpty()) {
            return references;
        }

        log.info("Extracting task references from text: '{}'", text);

        for (TaskReferencePattern patternInfo : TASK_PATTERNS) {
            Matcher matcher = patternInfo.pattern.matcher(text);
            while (matcher.find()) {
                String taskId = matcher.group(patternInfo.taskIdGroup);
                String referenceText = matcher.group(0);

                TaskReference ref = new TaskReference(taskId, patternInfo.linkType, referenceText);
                references.add(ref);

                log.info("Found reference: Pattern '{}' matched '{}' -> Task {}, Type {}",
                        patternInfo.pattern.pattern(), referenceText, taskId, patternInfo.linkType);
            }
        }

        List<TaskReference> uniqueReferences = references.stream()
                .distinct()
                .collect(Collectors.toList());

        log.info("Extracted {} unique task references", uniqueReferences.size());

        return uniqueReferences;
    }

    private Optional<Task> findTaskById(String taskIdString, Project project) {
        try {
            Long taskId = Long.parseLong(taskIdString);
            return taskRepository.findById(taskId)
                    .filter(task -> task.getProject().equals(project))
                    .filter(task -> !task.getIsArchived());
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
    }

    private void updateTaskStatusFromCommit(Task task, GitHubCommit commit, GitHubLinkType linkType) {
        log.info("=== TASK STATUS UPDATE FROM COMMIT ===");
        log.info("Task ID: {}, Current Status: {}", task.getId(), task.getStatus());
        log.info("Commit SHA: {}, Branch: {}, Is Main Branch: {}",
                commit.getCommitSha(), commit.getBranchName(), commit.isFromMainBranch());
        log.info("Link Type: {}", linkType);

        if (!commit.isFromMainBranch()) {
            log.info("Skipping status update - commit not from main branch");
            return;
        }

        TaskStatus newStatus = null;
        boolean shouldComplete = false;

        switch (linkType) {
            case CLOSES:
            case FIXES:
            case RESOLVES:
                if (task.getStatus() != TaskStatus.DONE) {
                    newStatus = TaskStatus.DONE;
                    shouldComplete = true;
                    log.info("Will update task status from {} to DONE", task.getStatus());
                } else {
                    log.info("Task already DONE, no status update needed");
                }
                break;
            case REFERENCE:
                if (task.getStatus() == TaskStatus.TODO) {
                    newStatus = TaskStatus.IN_PROGRESS;
                    log.info("Will update task status from TODO to IN_PROGRESS");
                } else {
                    log.info("Task not in TODO status, no status update for REFERENCE");
                }
                break;
        }

        if (newStatus != null) {
            TaskStatus oldStatus = task.getStatus();
            task.setStatus(newStatus);

            if (shouldComplete) {
                task.setCompletedDate(LocalDateTime.now());
                task.setProgress(100);
                log.info("Set task completion date and 100% progress");
            }

            taskRepository.save(task);
            log.info("✅ Task status updated: {} -> {}", oldStatus, newStatus);

            User systemUser = task.getCreator();
            activityService.createTaskStatusChangedActivity(systemUser, task, oldStatus, newStatus);

            if (shouldComplete) {
                activityService.createTaskCompletedActivity(systemUser, task);
            }

            log.info("Created activity logs for status change");
        } else {
            log.info("No status update required");
        }

        log.info("=== END TASK STATUS UPDATE ===");
    }

    private void updateTaskStatusFromPR(Task task, GitHubPullRequest pullRequest, GitHubLinkType linkType) {
        log.info("=== TASK STATUS UPDATE FROM PR ===");
        log.info("Task ID: {}, Current Status: {}", task.getId(), task.getStatus());
        log.info("PR #{}: {}, Status: {}, Is Merged: {}",
                pullRequest.getPrNumber(), pullRequest.getTitle(), pullRequest.getStatus(), pullRequest.isMerged());
        log.info("Link Type: {}", linkType);

        TaskStatus newStatus = null;
        boolean shouldComplete = false;

        switch (pullRequest.getStatus()) {
            case OPEN:
                if (pullRequest.isDraft()) {
                    if (task.getStatus() == TaskStatus.TODO) {
                        newStatus = TaskStatus.IN_PROGRESS;
                        log.info("Will update task status from TODO to IN_PROGRESS (draft PR)");
                    }
                } else {
                    if (task.getStatus() != TaskStatus.REVIEW && task.getStatus() != TaskStatus.DONE) {
                        newStatus = TaskStatus.REVIEW;
                        log.info("Will update task status to REVIEW (open PR)");
                    }
                }
                break;

            case CLOSED:
                if (pullRequest.isMerged()) {
                    if (linkType == GitHubLinkType.CLOSES ||
                            linkType == GitHubLinkType.FIXES ||
                            linkType == GitHubLinkType.RESOLVES) {
                        if (task.getStatus() != TaskStatus.DONE) {
                            newStatus = TaskStatus.DONE;
                            shouldComplete = true;
                            log.info("Will update task status to DONE (merged PR with {} link)", linkType);
                        }
                    }
                } else {
                    if (task.getStatus() == TaskStatus.REVIEW) {
                        newStatus = TaskStatus.IN_PROGRESS;
                        log.info("Will update task status from REVIEW to IN_PROGRESS (closed but not merged PR)");
                    }
                }
                break;
        }

        if (newStatus != null) {
            TaskStatus oldStatus = task.getStatus();
            task.setStatus(newStatus);

            if (shouldComplete) {
                task.setCompletedDate(LocalDateTime.now());
                task.setProgress(100);
                log.info("Set task completion date and 100% progress");
            }

            taskRepository.save(task);
            log.info("✅ Task status updated: {} -> {}", oldStatus, newStatus);

            User systemUser = task.getCreator();
            activityService.createTaskStatusChangedActivity(systemUser, task, oldStatus, newStatus);

            if (shouldComplete) {
                activityService.createTaskCompletedActivity(systemUser, task);
            }

            log.info("Created activity logs for status change");
        } else {
            log.info("No status update required");
        }

        log.info("=== END TASK STATUS UPDATE FROM PR ===");
    }

    private void createCommitLinkActivity(GitHubCommit commit, Task task, GitHubLinkType linkType) {
        try {
            String description = String.format("Commit %s %s task \"%s\"",
                    commit.getShortSha(),
                    linkType.name().toLowerCase(),
                    task.getTitle());

            Activity activity = Activity.builder()
                    .type(ActivityType.TASK_UPDATED)
                    .description(description)
                    .user(task.getCreator())
                    .project(task.getProject())
                    .task(task)
                    .build();

        } catch (Exception e) {
            log.warn("Failed to create commit link activity: {}", e.getMessage());
        }
    }

    private void createPRLinkActivity(GitHubPullRequest pullRequest, Task task, GitHubLinkType linkType) {
        try {
            String description = String.format("Pull request #%d %s task \"%s\"",
                    pullRequest.getPrNumber(),
                    linkType.name().toLowerCase(),
                    task.getTitle());

            Activity activity = Activity.builder()
                    .type(ActivityType.TASK_UPDATED)
                    .description(description)
                    .user(task.getCreator())
                    .project(task.getProject())
                    .task(task)
                    .build();

        } catch (Exception e) {
            log.warn("Failed to create PR link activity: {}", e.getMessage());
        }
    }

    private GitHubSearchResponse searchCommits(GitHubSearchRequest request) {
        Project project = null;
        if (request.getProjectId() != null) {

        }

        int page = request.getPage() != null ? request.getPage() : 0;
        int size = request.getSize() != null ? request.getSize() : 20;
        Pageable pageable = PageRequest.of(page, size);

        Page<GitHubCommit> commits;
        if (project != null && request.getQuery() != null) {
            commits = commitRepository.searchCommitsByMessage(project, request.getQuery(), pageable);
        } else if (project != null) {
            commits = commitRepository.findByProjectOrderByCommitDateDesc(project, pageable);
        } else {
            commits = Page.empty(pageable);
        }

        List<CommitSummary> results = commits.getContent().stream()
                .map(this::mapToCommitSummary)
                .collect(Collectors.toList());

        return GitHubSearchResponse.builder()
                .type("commits")
                .results(results)
                .totalCount(commits.getTotalElements())
                .currentPage(page)
                .totalPages(commits.getTotalPages())
                .hasMore(commits.hasNext())
                .build();
    }

    private GitHubSearchResponse searchPullRequests(GitHubSearchRequest request) {
        Project project = null;
        if (request.getProjectId() != null) {

        }

        int page = request.getPage() != null ? request.getPage() : 0;
        int size = request.getSize() != null ? request.getSize() : 20;
        Pageable pageable = PageRequest.of(page, size);

        Page<GitHubPullRequest> pullRequests;
        if (project != null && request.getQuery() != null) {
            pullRequests = pullRequestRepository.searchPRs(project, request.getQuery(), pageable);
        } else if (project != null) {
            pullRequests = pullRequestRepository.findByProjectOrderByCreatedDateDesc(project, pageable);
        } else {
            pullRequests = Page.empty(pageable);
        }

        List<PullRequestSummary> results = pullRequests.getContent().stream()
                .map(this::mapToPullRequestSummary)
                .collect(Collectors.toList());

        return GitHubSearchResponse.builder()
                .type("pullRequests")
                .results(results)
                .totalCount(pullRequests.getTotalElements())
                .currentPage(page)
                .totalPages(pullRequests.getTotalPages())
                .hasMore(pullRequests.hasNext())
                .build();
    }

    private CommitSummary mapToCommitSummary(GitHubCommit commit) {
        return CommitSummary.builder()
                .id(commit.getId())
                .commitSha(commit.getCommitSha())
                .shortSha(commit.getShortSha())
                .commitMessage(commit.getCommitMessage())
                .authorName(commit.getAuthorName())
                .authorUsername(commit.getAuthorUsername())
                .commitDate(commit.getCommitDate())
                .branchName(commit.getBranchName())
                .taskLinksCount(commit.getTaskLinks().size())
                .isFromMainBranch(commit.isFromMainBranch())
                .build();
    }

    private PullRequestSummary mapToPullRequestSummary(GitHubPullRequest pr) {
        return PullRequestSummary.builder()
                .id(pr.getId())
                .prNumber(pr.getPrNumber())
                .title(pr.getTitle())
                .status(pr.getStatus())
                .authorUsername(pr.getAuthorUsername())
                .headBranch(pr.getHeadBranch())
                .baseBranch(pr.getBaseBranch())
                .createdDate(pr.getCreatedDate())
                .mergedDate(pr.getMergedDate())
                .taskLinksCount(pr.getTaskLinks().size())
                .isOpen(pr.isOpen())
                .isMerged(pr.isMerged())
                .build();
    }
}