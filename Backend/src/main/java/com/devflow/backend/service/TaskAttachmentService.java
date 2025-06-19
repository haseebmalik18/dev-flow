package com.devflow.backend.service;

import com.devflow.backend.dto.attachment.AttachmentDTOs.*;
import com.devflow.backend.entity.*;
import com.devflow.backend.exception.AuthException;
import com.devflow.backend.repository.*;
import com.devflow.backend.service.ActivityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.Set;
import java.util.HashMap;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class TaskAttachmentService {

    private final TaskAttachmentRepository attachmentRepository;
    private final TaskRepository taskRepository;
    private final ActivityRepository activityRepository;
    private final ActivityService activityService;
    private final S3FileStorageService s3Service;

    private static final Set<String> PREVIEWABLE_IMAGE_TYPES = Set.of(
            "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/svg+xml"
    );

    private static final Set<String> PREVIEWABLE_DOCUMENT_TYPES = Set.of(
            "application/pdf", "text/plain", "text/csv", "application/json", "text/xml", "application/xml"
    );

    private static final Set<String> PREVIEWABLE_CODE_TYPES = Set.of(
            "text/javascript", "text/css", "text/html", "application/javascript"
    );

    @lombok.Data
    @lombok.AllArgsConstructor
    public static class StreamData {
        private byte[] data;
        private String contentType;
        private String fileName;
    }

    public UploadResponse uploadAttachment(Long taskId, MultipartFile file, User user) {
        try {
            Task task = findTaskWithAccess(taskId, user);

            if (!canUserUploadToTask(user, task)) {
                throw new AuthException("You don't have permission to upload files to this task");
            }

            S3FileStorageService.FileUploadResult uploadResult = s3Service.uploadFile(file, taskId, user.getId());
            String secureFileName = generateSecureFileName(file.getOriginalFilename());

            TaskAttachment attachment = TaskAttachment.builder()
                    .fileName(secureFileName)
                    .originalFileName(file.getOriginalFilename())
                    .fileSize(file.getSize())
                    .contentType(file.getContentType())
                    .s3Key(uploadResult.getS3Key())
                    .s3Url(uploadResult.getPresignedUrl())
                    .urlExpiresAt(uploadResult.getUrlExpiresAt())
                    .task(task)
                    .uploadedBy(user)
                    .build();

            attachment = attachmentRepository.save(attachment);


            activityService.createFileUploadedActivity(user, attachment.getOriginalFileName(), task);

            log.info("File uploaded successfully: {} by user: {} to task: {}",
                    attachment.getOriginalFileName(), user.getUsername(), task.getTitle());

            return UploadResponse.builder()
                    .success(true)
                    .message("File uploaded successfully")
                    .attachment(mapToAttachmentResponse(attachment))
                    .build();

        } catch (Exception e) {
            log.error("Failed to upload attachment: {}", e.getMessage(), e);
            return UploadResponse.builder()
                    .success(false)
                    .message("Failed to upload file")
                    .error(e.getMessage())
                    .build();
        }
    }

    public Map<String, Object> getPreviewData(Long attachmentId, User user) {
        TaskAttachment attachment = findAttachmentWithAccess(attachmentId, user);

        if (attachment.isUrlExpired()) {
            refreshAttachmentUrl(attachment);
        }

        Map<String, Object> previewData = new HashMap<>();
        previewData.put("id", attachment.getId());
        previewData.put("fileName", attachment.getOriginalFileName());
        previewData.put("contentType", attachment.getContentType());
        previewData.put("fileSize", attachment.getFileSize());
        previewData.put("fileSizeFormatted", attachment.getFileSizeFormatted());
        previewData.put("isPreviewable", isPreviewable(attachment.getContentType()));
        previewData.put("previewType", getPreviewType(attachment.getContentType()));

        String baseUrl = "http://localhost:3000/api/v1";
        String streamUrl = String.format("%s/attachments/%d/stream", baseUrl, attachment.getId());
        previewData.put("streamUrl", streamUrl);

        previewData.put("downloadUrl", attachment.getS3Url());
        previewData.put("urlExpiresAt", attachment.getUrlExpiresAt());

        return previewData;
    }

    public StreamData streamAttachment(Long attachmentId, User user) throws IOException {
        TaskAttachment attachment = findAttachmentWithAccess(attachmentId, user);

        byte[] fileData = s3Service.getFileData(attachment.getS3Key());

        return new StreamData(fileData, attachment.getContentType(), attachment.getOriginalFileName());
    }

    private boolean isPreviewable(String contentType) {
        if (contentType == null) return false;

        return PREVIEWABLE_IMAGE_TYPES.contains(contentType.toLowerCase()) ||
                PREVIEWABLE_DOCUMENT_TYPES.contains(contentType.toLowerCase()) ||
                PREVIEWABLE_CODE_TYPES.contains(contentType.toLowerCase());
    }

    private String getPreviewType(String contentType) {
        if (contentType == null) return "unsupported";

        String lowerType = contentType.toLowerCase();

        if (PREVIEWABLE_IMAGE_TYPES.contains(lowerType)) {
            return "image";
        } else if (lowerType.equals("application/pdf")) {
            return "pdf";
        } else if (PREVIEWABLE_DOCUMENT_TYPES.contains(lowerType)) {
            return "text";
        } else if (PREVIEWABLE_CODE_TYPES.contains(lowerType)) {
            return "code";
        }

        return "unsupported";
    }

    @Transactional(readOnly = true)
    public List<AttachmentSummary> getTaskAttachments(Long taskId, User user) {
        Task task = findTaskWithAccess(taskId, user);
        List<TaskAttachment> attachments = attachmentRepository.findByTaskAndIsDeletedFalseOrderByCreatedAtDesc(task);

        return attachments.stream()
                .map(this::mapToAttachmentSummary)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AttachmentResponse getAttachment(Long attachmentId, User user) {
        TaskAttachment attachment = findAttachmentWithAccess(attachmentId, user);

        if (attachment.isUrlExpired()) {
            refreshAttachmentUrl(attachment);
        }

        return mapToAttachmentResponse(attachment);
    }

    public String getDownloadUrl(Long attachmentId, User user) {
        TaskAttachment attachment = findAttachmentWithAccess(attachmentId, user);
        String freshUrl = s3Service.generatePresignedUrl(attachment.getS3Key());
        updateAttachmentUrlAsync(attachment.getId(), freshUrl);


        activityService.createFileDownloadedActivity(user, attachment);

        log.info("Download URL generated for attachment: {} by user: {}",
                attachment.getOriginalFileName(), user.getUsername());

        return freshUrl;
    }

    public void deleteAttachment(Long attachmentId, User user) {
        TaskAttachment attachment = findAttachmentWithAccess(attachmentId, user);

        if (!canUserDeleteAttachment(user, attachment)) {
            throw new AuthException("You don't have permission to delete this attachment");
        }

        attachment.markAsDeleted();
        attachmentRepository.save(attachment);
        deleteFromS3Async(attachment.getS3Key());


        activityService.createFileDeletedActivity(user, attachment);

        log.info("Attachment deleted: {} by user: {} from task: {}",
                attachment.getOriginalFileName(), user.getUsername(), attachment.getTask().getTitle());
    }

    @Transactional(readOnly = true)
    public Page<AttachmentSummary> getUserAttachments(User user, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<TaskAttachment> attachments = attachmentRepository.findByUploadedByAndIsDeletedFalseOrderByCreatedAtDesc(user, pageable);

        return attachments.map(this::mapToAttachmentSummary);
    }

    @Transactional(readOnly = true)
    public AttachmentStatsResponse getTaskAttachmentStats(Long taskId, User user) {
        Task task = findTaskWithAccess(taskId, user);

        @SuppressWarnings("unchecked")
        Map<String, Object> stats = (Map<String, Object>) attachmentRepository.getAttachmentStatsByTask(task);

        long totalCount = ((Number) stats.getOrDefault("totalCount", 0L)).longValue();
        long totalSize = ((Number) stats.getOrDefault("totalSize", 0L)).longValue();
        long imageCount = ((Number) stats.getOrDefault("imageCount", 0L)).longValue();
        long documentCount = ((Number) stats.getOrDefault("documentCount", 0L)).longValue();
        long archiveCount = ((Number) stats.getOrDefault("archiveCount", 0L)).longValue();
        long otherCount = totalCount - imageCount - documentCount - archiveCount;

        return AttachmentStatsResponse.builder()
                .totalAttachments(totalCount)
                .totalSizeBytes(totalSize)
                .totalSizeFormatted(formatFileSize(totalSize))
                .imageCount(imageCount)
                .documentCount(documentCount)
                .archiveCount(archiveCount)
                .otherCount(otherCount)
                .build();
    }

    @Transactional(readOnly = true)
    public AttachmentStatsResponse getUserAttachmentStats(User user) {
        @SuppressWarnings("unchecked")
        Map<String, Object> stats = (Map<String, Object>) attachmentRepository.getAttachmentStatsByUser(user);

        long totalCount = ((Number) stats.getOrDefault("totalCount", 0L)).longValue();
        long totalSize = ((Number) stats.getOrDefault("totalSize", 0L)).longValue();
        long imageCount = ((Number) stats.getOrDefault("imageCount", 0L)).longValue();
        long documentCount = ((Number) stats.getOrDefault("documentCount", 0L)).longValue();
        long archiveCount = ((Number) stats.getOrDefault("archiveCount", 0L)).longValue();
        long otherCount = totalCount - imageCount - documentCount - archiveCount;

        return AttachmentStatsResponse.builder()
                .totalAttachments(totalCount)
                .totalSizeBytes(totalSize)
                .totalSizeFormatted(formatFileSize(totalSize))
                .imageCount(imageCount)
                .documentCount(documentCount)
                .archiveCount(archiveCount)
                .otherCount(otherCount)
                .build();
    }

    @Transactional(readOnly = true)
    public List<AttachmentSummary> searchTaskAttachments(Long taskId, String searchTerm, User user) {
        Task task = findTaskWithAccess(taskId, user);
        List<TaskAttachment> attachments = attachmentRepository.searchAttachmentsByTask(task, searchTerm);

        return attachments.stream()
                .map(this::mapToAttachmentSummary)
                .collect(Collectors.toList());
    }

    @Scheduled(fixedRate = 3600000)
    @Transactional
    public void refreshExpiringUrls() {
        LocalDateTime threshold = LocalDateTime.now().plusHours(2);
        List<TaskAttachment> expiringAttachments = attachmentRepository.findAttachmentsWithExpiredUrls(threshold);

        for (TaskAttachment attachment : expiringAttachments) {
            try {
                refreshAttachmentUrl(attachment);
                log.debug("Refreshed URL for attachment: {}", attachment.getS3Key());
            } catch (Exception e) {
                log.error("Failed to refresh URL for attachment: {}", attachment.getS3Key(), e);
            }
        }

        if (!expiringAttachments.isEmpty()) {
            log.info("Refreshed URLs for {} attachments", expiringAttachments.size());
        }
    }

    @Scheduled(fixedRate = 86400000)
    @Transactional
    public void cleanupOldDeletedAttachments() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(30);
        attachmentRepository.deleteOldDeletedAttachments(cutoff);
        log.info("Cleaned up old deleted attachments older than {}", cutoff);
    }

    private Task findTaskWithAccess(Long taskId, User user) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new AuthException("Task not found"));

        if (!taskRepository.hasUserAccessToTask(user, taskId)) {
            throw new AuthException("You don't have access to this task");
        }

        return task;
    }

    private TaskAttachment findAttachmentWithAccess(Long attachmentId, User user) {
        TaskAttachment attachment = attachmentRepository.findByIdAndIsDeletedFalse(attachmentId)
                .orElseThrow(() -> new AuthException("Attachment not found"));

        if (!attachmentRepository.hasUserAccessToAttachment(user, attachmentId)) {
            throw new AuthException("You don't have access to this attachment");
        }

        return attachment;
    }

    private boolean canUserUploadToTask(User user, Task task) {
        if (task.getAssignee() != null && task.getAssignee().equals(user)) {
            return true;
        }
        if (task.getCreator().equals(user)) {
            return true;
        }
        return true;
    }

    private boolean canUserDeleteAttachment(User user, TaskAttachment attachment) {
        if (attachment.getUploadedBy().equals(user)) {
            return true;
        }
        if (attachment.getTask().getAssignee() != null && attachment.getTask().getAssignee().equals(user)) {
            return true;
        }
        if (attachment.getTask().getProject().getOwner().equals(user)) {
            return true;
        }
        return false;
    }

    private String generateSecureFileName(String originalFileName) {
        if (originalFileName == null) {
            return "file_" + UUID.randomUUID().toString().substring(0, 8);
        }

        String baseName = originalFileName.replaceAll("[^a-zA-Z0-9._-]", "_");
        String extension = "";

        int lastDot = baseName.lastIndexOf('.');
        if (lastDot > 0) {
            extension = baseName.substring(lastDot);
            baseName = baseName.substring(0, lastDot);
        }

        baseName = baseName.substring(0, Math.min(baseName.length(), 50));
        return baseName + "_" + System.currentTimeMillis() + extension;
    }

    private void refreshAttachmentUrl(TaskAttachment attachment) {
        String newUrl = s3Service.generatePresignedUrl(attachment.getS3Key());
        LocalDateTime newExpiration = LocalDateTime.now().plusHours(24);

        attachment.setS3Url(newUrl);
        attachment.setUrlExpiresAt(newExpiration);
        attachmentRepository.save(attachment);
    }

    @Async
    private void updateAttachmentUrlAsync(Long attachmentId, String url) {
        LocalDateTime expiresAt = LocalDateTime.now().plusHours(24);
        attachmentRepository.updateAttachmentUrl(attachmentId, url, expiresAt);
    }

    @Async
    private void deleteFromS3Async(String s3Key) {
        try {
            s3Service.deleteFile(s3Key);
        } catch (Exception e) {
            log.error("Failed to delete file from S3: {}", s3Key, e);
        }
    }

    private String formatFileSize(long bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return String.format("%.1f KB", bytes / 1024.0);
        if (bytes < 1024 * 1024 * 1024) return String.format("%.1f MB", bytes / (1024.0 * 1024.0));
        return String.format("%.1f GB", bytes / (1024.0 * 1024.0 * 1024.0));
    }

    private AttachmentResponse mapToAttachmentResponse(TaskAttachment attachment) {
        return AttachmentResponse.builder()
                .id(attachment.getId())
                .fileName(attachment.getFileName())
                .originalFileName(attachment.getOriginalFileName())
                .fileSize(attachment.getFileSize())
                .fileSizeFormatted(attachment.getFileSizeFormatted())
                .contentType(attachment.getContentType())
                .fileExtension(attachment.getFileExtension())
                .downloadUrl(attachment.getS3Url())
                .urlExpiresAt(attachment.getUrlExpiresAt())
                .isImage(attachment.isImage())
                .isDocument(attachment.isDocument())
                .isArchive(attachment.isArchive())
                .createdAt(attachment.getCreatedAt())
                .task(mapToTaskSummary(attachment.getTask()))
                .uploadedBy(mapToUserSummary(attachment.getUploadedBy()))
                .build();
    }

    private AttachmentSummary mapToAttachmentSummary(TaskAttachment attachment) {
        return AttachmentSummary.builder()
                .id(attachment.getId())
                .fileName(attachment.getFileName())
                .originalFileName(attachment.getOriginalFileName())
                .fileSize(attachment.getFileSize())
                .fileSizeFormatted(attachment.getFileSizeFormatted())
                .contentType(attachment.getContentType())
                .fileExtension(attachment.getFileExtension())
                .isImage(attachment.isImage())
                .isDocument(attachment.isDocument())
                .isArchive(attachment.isArchive())
                .createdAt(attachment.getCreatedAt())
                .uploadedBy(mapToUserSummary(attachment.getUploadedBy()))
                .build();
    }

    private TaskSummary mapToTaskSummary(Task task) {
        return TaskSummary.builder()
                .id(task.getId())
                .title(task.getTitle())
                .status(task.getStatus().name())
                .project(ProjectSummary.builder()
                        .id(task.getProject().getId())
                        .name(task.getProject().getName())
                        .color(task.getProject().getColor())
                        .build())
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
}