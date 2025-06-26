
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
            new TaskReferencePattern(Pattern.compile("(?i)closes?\\s+#(\\d+)"), GitHubLinkType.CLOSES, 1),
            new TaskReferencePattern(Pattern.compile("(?i)fixes?\\s+#(\\d+)"), GitHubLinkType.FIXES, 1),
            new TaskReferencePattern(Pattern.compile("(?i)resolves?\\s+#(\\d+)"), GitHubLinkType.RESOLVES, 1),
            new TaskReferencePattern(Pattern.compile("(?i)closes?\\s+(TASK|DEV|ISSUE|BUG|FEAT|FIX)[-_]?(\\d+)"), GitHubLinkType.CLOSES, 2),
            new TaskReferencePattern(Pattern.compile("(?i)fixes?\\s+(TASK|DEV|ISSUE|BUG|FEAT|FIX)[-_]?(\\d+)"), GitHubLinkType.FIXES, 2),
            new TaskReferencePattern(Pattern.compile("(?i)resolves?\\s+(TASK|DEV|ISSUE|BUG|FEAT|FIX)[-_]?(\\d+)"), GitHubLinkType.RESOLVES, 2)
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
            List<TaskReference> references = extractTaskReferences(commit.getCommitMessage());

            for (TaskReference reference : references) {
                Optional<Task> taskOpt = findTaskById(reference.taskId, commit.getGitHubConnection().getProject());

                if (taskOpt.isPresent()) {
                    Task task = taskOpt.get();


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
                    }
                }
            }

        } catch (Exception e) {
            log.error("Failed to link commit {} to tasks: {}", commit.getCommitSha(), e.getMessage());
        }
    }

    public void linkPullRequestToTasks(GitHubPullRequest pullRequest) {
        try {
            List<TaskReference> references = new ArrayList<>();

            references.addAll(extractTaskReferences(pullRequest.getTitle()));


            if (pullRequest.getDescription() != null) {
                references.addAll(extractTaskReferences(pullRequest.getDescription()));
            }

            for (TaskReference reference : references) {
                Optional<Task> taskOpt = findTaskById(reference.taskId, pullRequest.getGitHubConnection().getProject());

                if (taskOpt.isPresent()) {
                    Task task = taskOpt.get();


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
                    }
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

        for (TaskReferencePattern patternInfo : TASK_PATTERNS) {
            Matcher matcher = patternInfo.pattern.matcher(text);
            while (matcher.find()) {
                String taskId = matcher.group(patternInfo.taskIdGroup);
                String referenceText = matcher.group(0);

                references.add(new TaskReference(taskId, patternInfo.linkType, referenceText));
            }
        }

        return references.stream()
                .distinct()
                .collect(Collectors.toList());
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
        if (!commit.isFromMainBranch()) {
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
                }
                break;
            case REFERENCE:
                if (task.getStatus() == TaskStatus.TODO) {
                    newStatus = TaskStatus.IN_PROGRESS;
                }
                break;
        }

        if (newStatus != null) {
            TaskStatus oldStatus = task.getStatus();
            task.setStatus(newStatus);

            if (shouldComplete) {
                task.setCompletedDate(LocalDateTime.now());
                task.setProgress(100);
            }

            taskRepository.save(task);

            // Create activity (using commit author as user - this is a limitation)
            // In a real implementation, might want to map GitHub users to DevFlow users
            User systemUser = task.getCreator();
            activityService.createTaskStatusChangedActivity(systemUser, task, oldStatus, newStatus);

            if (shouldComplete) {
                activityService.createTaskCompletedActivity(systemUser, task);
            }
        }
    }

    private void updateTaskStatusFromPR(Task task, GitHubPullRequest pullRequest, GitHubLinkType linkType) {
        TaskStatus newStatus = null;
        boolean shouldComplete = false;


        switch (pullRequest.getStatus()) {
            case OPEN:
                if (pullRequest.isDraft()) {
                    if (task.getStatus() == TaskStatus.TODO) {
                        newStatus = TaskStatus.IN_PROGRESS;
                    }
                } else {
                    if (task.getStatus() != TaskStatus.REVIEW && task.getStatus() != TaskStatus.DONE) {
                        newStatus = TaskStatus.REVIEW;
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
                        }
                    }
                } else {

                    if (task.getStatus() == TaskStatus.REVIEW) {
                        newStatus = TaskStatus.IN_PROGRESS;
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
            }

            taskRepository.save(task);


            User systemUser = task.getCreator();
            activityService.createTaskStatusChangedActivity(systemUser, task, oldStatus, newStatus);

            if (shouldComplete) {
                activityService.createTaskCompletedActivity(systemUser, task);
            }
        }
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

            // Note: possibly go through ActivityService

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

            // Note: possibly go through ActivityService

        } catch (Exception e) {
            log.warn("Failed to create PR link activity: {}", e.getMessage());
        }
    }

    private GitHubSearchResponse searchCommits(GitHubSearchRequest request) {
        Project project = null;
        if (request.getProjectId() != null) {
            // This would need to be validated in the calling service
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