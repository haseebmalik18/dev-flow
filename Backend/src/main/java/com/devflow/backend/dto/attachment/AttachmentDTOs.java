package com.devflow.backend.dto.attachment;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

public class AttachmentDTOs {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AttachmentUploadRequest {
        @NotNull(message = "Task ID is required")
        private Long taskId;


    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AttachmentResponse {
        private Long id;
        private String fileName;
        private String originalFileName;
        private Long fileSize;
        private String fileSizeFormatted;
        private String contentType;
        private String fileExtension;
        private String downloadUrl;
        private LocalDateTime urlExpiresAt;
        private Boolean isImage;
        private Boolean isDocument;
        private Boolean isArchive;
        private LocalDateTime createdAt;


        private TaskSummary task;


        private UserSummary uploadedBy;
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
    public static class TaskSummary {
        private Long id;
        private String title;
        private String status;
        private ProjectSummary project;
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
    public static class AttachmentStatsResponse {
        private Long totalAttachments;
        private Long totalSizeBytes;
        private String totalSizeFormatted;
        private Long imageCount;
        private Long documentCount;
        private Long archiveCount;
        private Long otherCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UploadResponse {
        private boolean success;
        private String message;
        private AttachmentResponse attachment;
        private String error;
    }
}