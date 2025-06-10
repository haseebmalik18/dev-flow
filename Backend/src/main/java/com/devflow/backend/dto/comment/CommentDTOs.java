package com.devflow.backend.dto.comment;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

public class CommentDTOs {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateCommentRequest {
        @NotBlank(message = "Comment content is required")
        @Size(min = 1, max = 5000, message = "Comment must be between 1 and 5000 characters")
        private String content;

        private Long taskId;
        private Long projectId;
        private Long parentCommentId;
        private List<Long> mentionedUserIds;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateCommentRequest {
        @NotBlank(message = "Comment content is required")
        @Size(min = 1, max = 5000, message = "Comment must be between 1 and 5000 characters")
        private String content;

        private List<Long> mentionedUserIds;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CommentResponse {
        private Long id;
        private String content;
        private Boolean isEdited;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;


        private TaskSummary task;
        private ProjectSummary project;
        private UserSummary author;
        private CommentSummary parentComment;


        private List<CommentResponse> replies;
        private List<UserSummary> mentionedUsers;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CommentSummary {
        private Long id;
        private String content;
        private Boolean isEdited;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        private UserSummary author;
        private TaskSummary task;
        private ProjectSummary project;
        private Integer repliesCount;
        private List<UserSummary> mentionedUsers;
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
        private String status;
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
    public static class CommentStatsResponse {
        private Long totalComments;
        private Long commentsThisWeek;
        private Long commentsThisMonth;
        private Long mentionsCount;
        private Double averageCommentsPerTask;
        private List<UserSummary> mostActiveCommenters;
    }
}