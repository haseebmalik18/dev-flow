package com.devflow.backend.service;

import com.devflow.backend.entity.*;
import com.devflow.backend.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ActivityService {

    private final ActivityRepository activityRepository;
    private final RealtimeActivityService realtimeActivityService;
    private final ObjectMapper objectMapper;

    public Activity createProjectCreatedActivity(User user, Project project) {
        String description = String.format("%s created project \"%s\"", user.getFullName(), project.getName());

        Map<String, Object> metadata = createProjectMetadataMap(project);

        Activity activity = Activity.builder()
                .type(ActivityType.PROJECT_CREATED)
                .description(description)
                .user(user)
                .project(project)
                .metadata(serializeMetadata(metadata))
                .build();

        activity = activityRepository.save(activity);
        realtimeActivityService.broadcastActivity(activity);

        log.debug("Project created activity broadcasted: {}", activity.getId());
        return activity;
    }

    public Activity createProjectUpdatedActivity(User user, Project project, Map<String, Object> changes) {
        StringBuilder description = new StringBuilder();
        description.append(user.getFullName()).append(" updated project \"").append(project.getName()).append("\"");

        if (!changes.isEmpty()) {
            description.append(" (").append(String.join(", ", changes.keySet())).append(")");
        }

        Map<String, Object> metadata = createProjectMetadataMap(project);
        metadata.put("changes", changes);

        Activity activity = Activity.builder()
                .type(ActivityType.PROJECT_UPDATED)
                .description(description.toString())
                .user(user)
                .project(project)
                .metadata(serializeMetadata(metadata))
                .build();

        activity = activityRepository.save(activity);
        realtimeActivityService.broadcastActivity(activity);

        log.debug("Project updated activity broadcasted: {}", activity.getId());
        return activity;
    }

    public Activity createProjectStatusChangedActivity(User user, Project project, ProjectStatus oldStatus, ProjectStatus newStatus) {
        String description = String.format("%s changed project \"%s\" status from %s to %s",
                user.getFullName(), project.getName(), oldStatus.name(), newStatus.name());

        Map<String, Object> metadata = createProjectMetadataMap(project);
        metadata.put("oldStatus", oldStatus.name());
        metadata.put("newStatus", newStatus.name());

        Activity activity = Activity.builder()
                .type(ActivityType.PROJECT_STATUS_CHANGED)
                .description(description)
                .user(user)
                .project(project)
                .metadata(serializeMetadata(metadata))
                .build();

        activity = activityRepository.save(activity);
        realtimeActivityService.broadcastActivity(activity);

        log.debug("Project status changed activity broadcasted: {}", activity.getId());
        return activity;
    }

    public Activity createProjectArchivedActivity(User user, Project project) {
        String description = String.format("%s archived project \"%s\"", user.getFullName(), project.getName());

        Map<String, Object> metadata = createProjectMetadataMap(project);

        Activity activity = Activity.builder()
                .type(ActivityType.PROJECT_ARCHIVED)
                .description(description)
                .user(user)
                .project(project)
                .metadata(serializeMetadata(metadata))
                .build();

        activity = activityRepository.save(activity);
        realtimeActivityService.broadcastActivity(activity);

        log.debug("Project archived activity broadcasted: {}", activity.getId());
        return activity;
    }

    public Activity createMemberAddedActivity(User inviter, User newMember, Project project, ProjectRole role) {
        String description = String.format("%s added %s to project \"%s\" as %s",
                inviter.getFullName(), newMember.getFullName(), project.getName(), role.name());

        Map<String, Object> metadata = createProjectMetadataMap(project);
        metadata.put("newMemberId", newMember.getId());
        metadata.put("newMemberName", newMember.getFullName());
        metadata.put("newMemberRole", role.name());

        Activity activity = Activity.builder()
                .type(ActivityType.MEMBER_ADDED)
                .description(description)
                .user(inviter)
                .project(project)
                .targetUser(newMember)
                .metadata(serializeMetadata(metadata))
                .build();

        activity = activityRepository.save(activity);
        realtimeActivityService.broadcastActivity(activity);

        log.debug("Member added activity broadcasted: {}", activity.getId());
        return activity;
    }

    public Activity createMemberRemovedActivity(User remover, User removedMember, Project project) {
        String description = String.format("%s removed %s from project \"%s\"",
                remover.getFullName(), removedMember.getFullName(), project.getName());

        Map<String, Object> metadata = createProjectMetadataMap(project);
        metadata.put("removedMemberId", removedMember.getId());
        metadata.put("removedMemberName", removedMember.getFullName());

        Activity activity = Activity.builder()
                .type(ActivityType.MEMBER_REMOVED)
                .description(description)
                .user(remover)
                .project(project)
                .targetUser(removedMember)
                .metadata(serializeMetadata(metadata))
                .build();

        activity = activityRepository.save(activity);
        realtimeActivityService.broadcastActivity(activity);

        log.debug("Member removed activity broadcasted: {}", activity.getId());
        return activity;
    }

    public Activity createTaskCreatedActivity(User user, Task task) {
        String description = String.format("%s created task \"%s\"", user.getFullName(), task.getTitle());

        Map<String, Object> metadata = createTaskMetadataMap(task);

        Activity activity = Activity.builder()
                .type(ActivityType.TASK_CREATED)
                .description(description)
                .user(user)
                .project(task.getProject())
                .task(task)
                .metadata(serializeMetadata(metadata))
                .build();

        activity = activityRepository.save(activity);
        realtimeActivityService.broadcastActivity(activity);

        log.debug("Task created activity broadcasted: {}", activity.getId());
        return activity;
    }

    public Activity createTaskUpdatedActivity(User user, Task task, Map<String, Object> changes) {
        StringBuilder description = new StringBuilder();
        description.append(user.getFullName()).append(" updated task \"").append(task.getTitle()).append("\"");

        if (!changes.isEmpty()) {
            description.append(" (").append(String.join(", ", changes.keySet())).append(")");
        }

        Map<String, Object> metadata = createTaskMetadataMap(task);
        metadata.put("changes", changes);

        Activity activity = Activity.builder()
                .type(ActivityType.TASK_UPDATED)
                .description(description.toString())
                .user(user)
                .project(task.getProject())
                .task(task)
                .metadata(serializeMetadata(metadata))
                .build();

        activity = activityRepository.save(activity);
        realtimeActivityService.broadcastActivity(activity);

        log.debug("Task updated activity broadcasted: {}", activity.getId());
        return activity;
    }

    public Activity createTaskStatusChangedActivity(User user, Task task, TaskStatus oldStatus, TaskStatus newStatus) {
        String description = String.format("%s changed task \"%s\" status from %s to %s",
                user.getFullName(), task.getTitle(), oldStatus.name(), newStatus.name());

        Map<String, Object> metadata = createTaskMetadataMap(task);
        metadata.put("oldStatus", oldStatus.name());
        metadata.put("newStatus", newStatus.name());

        Activity activity = Activity.builder()
                .type(ActivityType.TASK_STATUS_CHANGED)
                .description(description)
                .user(user)
                .project(task.getProject())
                .task(task)
                .metadata(serializeMetadata(metadata))
                .build();

        activity = activityRepository.save(activity);
        realtimeActivityService.broadcastActivity(activity);

        log.debug("Task status changed activity broadcasted: {}", activity.getId());
        return activity;
    }

    public Activity createTaskCompletedActivity(User user, Task task) {
        String description = String.format("%s completed task \"%s\"", user.getFullName(), task.getTitle());

        Map<String, Object> metadata = createTaskMetadataMap(task);

        Activity activity = Activity.builder()
                .type(ActivityType.TASK_COMPLETED)
                .description(description)
                .user(user)
                .project(task.getProject())
                .task(task)
                .metadata(serializeMetadata(metadata))
                .build();

        activity = activityRepository.save(activity);
        realtimeActivityService.broadcastActivity(activity);

        log.debug("Task completed activity broadcasted: {}", activity.getId());
        return activity;
    }

    public Activity createTaskAssignedActivity(User assigner, User assignee, Task task) {
        String description = String.format("%s assigned task \"%s\" to %s",
                assigner.getFullName(), task.getTitle(), assignee.getFullName());

        Map<String, Object> metadata = createTaskMetadataMap(task);
        metadata.put("assigneeId", assignee.getId());
        metadata.put("assigneeName", assignee.getFullName());

        Activity activity = Activity.builder()
                .type(ActivityType.TASK_ASSIGNED)
                .description(description)
                .user(assigner)
                .project(task.getProject())
                .task(task)
                .targetUser(assignee)
                .metadata(serializeMetadata(metadata))
                .build();

        activity = activityRepository.save(activity);
        realtimeActivityService.broadcastActivity(activity);

        log.debug("Task assigned activity broadcasted: {}", activity.getId());
        return activity;
    }

    public Activity createTaskPriorityChangedActivity(User user, Task task, Priority oldPriority, Priority newPriority) {
        String description = String.format("%s changed task \"%s\" priority from %s to %s",
                user.getFullName(), task.getTitle(), oldPriority.name(), newPriority.name());

        Map<String, Object> metadata = createTaskMetadataMap(task);
        metadata.put("oldPriority", oldPriority.name());
        metadata.put("newPriority", newPriority.name());

        Activity activity = Activity.builder()
                .type(ActivityType.TASK_PRIORITY_CHANGED)
                .description(description)
                .user(user)
                .project(task.getProject())
                .task(task)
                .metadata(serializeMetadata(metadata))
                .build();

        activity = activityRepository.save(activity);
        realtimeActivityService.broadcastActivity(activity);

        log.debug("Task priority changed activity broadcasted: {}", activity.getId());
        return activity;
    }

    public Activity createCommentAddedActivity(User user, Comment comment, Task task) {
        String description = String.format("%s added a comment to task \"%s\"",
                user.getFullName(), task.getTitle());

        Map<String, Object> metadata = createTaskMetadataMap(task);
        metadata.put("commentId", comment.getId());
        metadata.put("commentPreview", truncateText(comment.getContent(), 100));

        Activity activity = Activity.builder()
                .type(ActivityType.COMMENT_ADDED)
                .description(description)
                .user(user)
                .project(task.getProject())
                .task(task)
                .metadata(serializeMetadata(metadata))
                .build();

        activity = activityRepository.save(activity);
        realtimeActivityService.broadcastActivity(activity);

        log.debug("Comment added activity broadcasted: {}", activity.getId());
        return activity;
    }

    public Activity createCommentMentionedActivity(User commenter, User mentionedUser, Comment comment, Task task) {
        String description = String.format("%s mentioned you in a comment on task \"%s\"",
                commenter.getFullName(), task.getTitle());

        Map<String, Object> metadata = createTaskMetadataMap(task);
        metadata.put("commentId", comment.getId());
        metadata.put("commentPreview", truncateText(comment.getContent(), 100));
        metadata.put("mentionedUserId", mentionedUser.getId());

        Activity activity = Activity.builder()
                .type(ActivityType.COMMENT_MENTIONED)
                .description(description)
                .user(commenter)
                .project(task.getProject())
                .task(task)
                .targetUser(mentionedUser)
                .metadata(serializeMetadata(metadata))
                .build();

        activity = activityRepository.save(activity);
        realtimeActivityService.broadcastActivity(activity);

        log.debug("Comment mentioned activity broadcasted: {}", activity.getId());
        return activity;
    }

    public Activity createFileUploadedActivity(User user, String fileName, Task task) {
        String description = String.format("%s uploaded file \"%s\" to task \"%s\"",
                user.getFullName(), fileName, task.getTitle());

        Map<String, Object> metadata = createTaskMetadataMap(task);
        metadata.put("fileName", fileName);

        Activity activity = Activity.builder()
                .type(ActivityType.FILE_UPLOADED)
                .description(description)
                .user(user)
                .project(task.getProject())
                .task(task)
                .metadata(serializeMetadata(metadata))
                .build();

        activity = activityRepository.save(activity);
        realtimeActivityService.broadcastActivity(activity);

        log.debug("File uploaded activity broadcasted: {}", activity.getId());
        return activity;
    }

    public Activity createDeadlineMissedActivity(Task task) {
        String description = String.format("Task \"%s\" has missed its deadline", task.getTitle());

        Map<String, Object> metadata = createTaskMetadataMap(task);
        metadata.put("dueDate", task.getDueDate().toString());

        Activity activity = Activity.builder()
                .type(ActivityType.DEADLINE_MISSED)
                .description(description)
                .user(null)
                .project(task.getProject())
                .task(task)
                .metadata(serializeMetadata(metadata))
                .build();

        activity = activityRepository.save(activity);
        realtimeActivityService.broadcastActivity(activity);

        log.debug("Deadline missed activity broadcasted: {}", activity.getId());
        return activity;
    }

    private Map<String, Object> createProjectMetadataMap(Project project) {
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("projectId", project.getId());
        metadata.put("projectName", project.getName());
        metadata.put("projectStatus", project.getStatus().name());
        metadata.put("projectPriority", project.getPriority().name());
        metadata.put("projectProgress", project.getProgress());
        metadata.put("teamSize", project.getTeamSize());
        metadata.put("totalTasks", project.getTotalTasksCount());
        metadata.put("completedTasks", project.getCompletedTasksCount());
        metadata.put("healthStatus", project.getHealthStatus().name());

        if (project.getDueDate() != null) {
            metadata.put("dueDate", project.getDueDate().toString());
        }

        return metadata;
    }

    private Map<String, Object> createTaskMetadataMap(Task task) {
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("taskId", task.getId());
        metadata.put("taskTitle", task.getTitle());
        metadata.put("taskStatus", task.getStatus().name());
        metadata.put("taskPriority", task.getPriority().name());
        metadata.put("taskProgress", task.getProgress());
        metadata.put("isOverdue", task.isOverdue());

        if (task.getAssignee() != null) {
            metadata.put("assigneeId", task.getAssignee().getId());
            metadata.put("assigneeName", task.getAssignee().getFullName());
        }

        if (task.getDueDate() != null) {
            metadata.put("dueDate", task.getDueDate().toString());
        }

        if (task.getProject() != null) {
            metadata.put("projectId", task.getProject().getId());
            metadata.put("projectName", task.getProject().getName());
        }

        return metadata;
    }

    private String serializeMetadata(Map<String, Object> metadata) {
        try {
            return objectMapper.writeValueAsString(metadata);
        } catch (Exception e) {
            log.warn("Failed to serialize activity metadata: {}", e.getMessage());
            return "{}";
        }
    }

    private String truncateText(String text, int maxLength) {
        if (text == null || text.length() <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength - 3) + "...";
    }

    public Activity createFileDeletedActivity(User user, TaskAttachment attachment) {
        String description = String.format("%s deleted file \"%s\" from task \"%s\"",
                user.getFullName(), attachment.getOriginalFileName(), attachment.getTask().getTitle());

        Map<String, Object> metadata = createTaskMetadataMap(attachment.getTask());
        metadata.put("fileName", attachment.getOriginalFileName());
        metadata.put("fileSize", attachment.getFileSize());
        metadata.put("contentType", attachment.getContentType());
        metadata.put("attachmentId", attachment.getId());
        metadata.put("fileExtension", attachment.getFileExtension());

        Activity activity = Activity.builder()
                .type(ActivityType.FILE_DELETED)
                .description(description)
                .user(user)
                .project(attachment.getTask().getProject())
                .task(attachment.getTask())
                .metadata(serializeMetadata(metadata))
                .build();

        activity = activityRepository.save(activity);
        realtimeActivityService.broadcastActivity(activity);

        log.debug("File deleted activity broadcasted: {}", activity.getId());
        return activity;
    }

    public Activity createFileDownloadedActivity(User user, TaskAttachment attachment) {
        String description = String.format("%s downloaded file \"%s\" from task \"%s\"",
                user.getFullName(), attachment.getOriginalFileName(), attachment.getTask().getTitle());

        Map<String, Object> metadata = createTaskMetadataMap(attachment.getTask());
        metadata.put("fileName", attachment.getOriginalFileName());
        metadata.put("fileSize", attachment.getFileSize());
        metadata.put("contentType", attachment.getContentType());
        metadata.put("attachmentId", attachment.getId());
        metadata.put("downloadTimestamp", LocalDateTime.now().toString());

        Activity activity = Activity.builder()
                .type(ActivityType.FILE_DOWNLOADED)
                .description(description)
                .user(user)
                .project(attachment.getTask().getProject())
                .task(attachment.getTask())
                .metadata(serializeMetadata(metadata))
                .build();

        activity = activityRepository.save(activity);
        realtimeActivityService.broadcastActivity(activity);

        log.debug("File downloaded activity broadcasted: {}", activity.getId());
        return activity;
    }

    public Activity createBulkFileUploadActivity(User user, Task task, int fileCount, long totalSize) {
        String description = String.format("%s uploaded %d files to task \"%s\" (%s total)",
                user.getFullName(), fileCount, task.getTitle(), formatFileSize(totalSize));

        Map<String, Object> metadata = createTaskMetadataMap(task);
        metadata.put("fileCount", fileCount);
        metadata.put("totalSize", totalSize);
        metadata.put("totalSizeFormatted", formatFileSize(totalSize));

        Activity activity = Activity.builder()
                .type(ActivityType.FILE_UPLOADED)
                .description(description)
                .user(user)
                .project(task.getProject())
                .task(task)
                .metadata(serializeMetadata(metadata))
                .build();

        activity = activityRepository.save(activity);
        realtimeActivityService.broadcastActivity(activity);

        log.debug("Bulk file upload activity broadcasted: {}", activity.getId());
        return activity;
    }

    private String formatFileSize(long bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return String.format("%.1f KB", bytes / 1024.0);
        if (bytes < 1024 * 1024 * 1024) return String.format("%.1f MB", bytes / (1024.0 * 1024.0));
        return String.format("%.1f GB", bytes / (1024.0 * 1024.0 * 1024.0));
    }
}