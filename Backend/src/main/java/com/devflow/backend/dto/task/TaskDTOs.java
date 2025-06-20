package com.devflow.backend.dto.task;

import com.devflow.backend.entity.Priority;
import com.devflow.backend.entity.TaskStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

public class TaskDTOs {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateTaskRequest {
        @NotBlank(message = "Task title is required")
        @Size(min = 2, max = 200, message = "Title must be between 2 and 200 characters")
        private String title;

        @Size(max = 2000, message = "Description cannot exceed 2000 characters")
        private String description;

        private Priority priority;
        private Long assigneeId;
        private LocalDateTime dueDate;
        private Integer storyPoints;
        private String tags;
        private Long parentTaskId;
        private List<Long> dependencyIds;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateTaskRequest {
        @Size(min = 2, max = 200, message = "Title must be between 2 and 200 characters")
        private String title;

        @Size(max = 2000, message = "Description cannot exceed 2000 characters")
        private String description;

        private TaskStatus status;
        private Priority priority;
        private Long assigneeId;
        private LocalDateTime dueDate;
        private Integer storyPoints;
        private String tags;
        private Integer progress;
        private List<Long> dependencyIds;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TaskResponse {
        private Long id;
        private String title;
        private String description;
        private TaskStatus status;
        private Priority priority;
        private LocalDateTime dueDate;
        private LocalDateTime completedDate;
        private String tags;
        private Integer storyPoints;
        private Integer progress;
        private Boolean isArchived;
        private Boolean isOverdue;
        private Boolean isBlocked;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        private UserSummary creator;
        private UserSummary assignee;
        private ProjectSummary project;

        private List<TaskResponse> subtasks;
        private TaskResponse parentTask;
        private List<TaskResponse> dependencies;
        private List<TaskResponse> dependentTasks;

        private Integer commentsCount;
        private List<String> tagList;


        private Integer attachmentsCount;
        private Long totalAttachmentSize;
        private String totalAttachmentSizeFormatted;
        private Boolean hasAttachments;
        private List<AttachmentSummary> recentAttachments;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TaskSummary {
        private Long id;
        private String title;
        private String description;
        private TaskStatus status;
        private Priority priority;
        private LocalDateTime dueDate;
        private Integer progress;
        private Boolean isOverdue;
        private Boolean isBlocked;
        private LocalDateTime updatedAt;

        private UserSummary assignee;
        private ProjectSummary project;
        private List<String> tagList;


        private Integer attachmentsCount;
        private Boolean hasAttachments;
        private String totalAttachmentSizeFormatted;
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
    public static class ProjectSummary {
        private Long id;
        private String name;
        private String color;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TaskStatsResponse {
        private Long totalTasks;
        private Long todoTasks;
        private Long inProgressTasks;
        private Long reviewTasks;
        private Long completedTasks;
        private Long overdueTasks;
        private Long blockedTasks;
        private Double averageProgress;


        private Long totalAttachments;
        private Long totalAttachmentSize;
        private String totalAttachmentSizeFormatted;
        private Double averageAttachmentsPerTask;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TaskFilterRequest {
        private TaskStatus status;
        private Priority priority;
        private Long assigneeId;
        private Long projectId;
        private Boolean isOverdue;
        private Boolean isBlocked;
        private String tags;
        private LocalDateTime dueDateFrom;
        private LocalDateTime dueDateTo;
        private String search;


        private Boolean hasAttachments;
        private String attachmentType; // "image", "document", "archive"
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BulkTaskUpdateRequest {
        private List<Long> taskIds;
        private TaskStatus status;
        private Priority priority;
        private Long assigneeId;
        private String tags;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TaskDependencyRequest {
        private Long dependencyTaskId;
    }


    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AttachmentSummary {
        private Long id;
        private String fileName;
        private String originalFileName;
        private Long fileSize;
        private String fileSizeFormatted;
        private String contentType;
        private String fileExtension;
        private Boolean isImage;
        private Boolean isDocument;
        private Boolean isArchive;
        private LocalDateTime createdAt;
        private UserSummary uploadedBy;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TaskWithAttachmentsResponse {
        private TaskResponse task;
        private List<AttachmentSummary> attachments;
        private AttachmentStatsResponse attachmentStats;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AttachmentStatsResponse {
        private Long totalAttachments;
        private Long totalSizeBytes;
        private String totalSizeFormatted;
        private Long imageCount;
        private Long documentCount;
        private Long archiveCount;
        private Long otherCount;
        private UserSummary topUploader;
        private String mostRecentUpload;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TaskActivitySummary {
        private TaskSummary task;
        private Integer recentCommentsCount;
        private Integer recentAttachmentsCount;
        private LocalDateTime lastActivity;
        private List<String> recentActivityTypes;
    }
}