package com.devflow.backend.controller;

import com.devflow.backend.dto.attachment.AttachmentDTOs.*;
import com.devflow.backend.dto.common.ApiResponse;
import com.devflow.backend.entity.User;
import com.devflow.backend.service.TaskAttachmentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/attachments")
@RequiredArgsConstructor
@Slf4j
public class TaskAttachmentController {

    private final TaskAttachmentService attachmentService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<AttachmentResponse>> uploadAttachment(
            @RequestParam("file") MultipartFile file,
            @RequestParam("taskId") Long taskId,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();

        log.info("Upload request received - File: {}, Size: {} bytes, Task ID: {}, User: {}",
                file.getOriginalFilename(), file.getSize(), taskId, user.getUsername());

        UploadResponse uploadResponse = attachmentService.uploadAttachment(taskId, file, user);

        if (uploadResponse.isSuccess()) {
            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(ApiResponse.success(uploadResponse.getMessage(), uploadResponse.getAttachment()));
        } else {
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(uploadResponse.getMessage()));
        }
    }

    @GetMapping("/task/{taskId}")
    public ResponseEntity<ApiResponse<List<AttachmentSummary>>> getTaskAttachments(
            @PathVariable Long taskId,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        List<AttachmentSummary> attachments = attachmentService.getTaskAttachments(taskId, user);

        return ResponseEntity.ok(ApiResponse.success("Task attachments retrieved successfully", attachments));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AttachmentResponse>> getAttachment(
            @PathVariable Long id,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        AttachmentResponse attachment = attachmentService.getAttachment(id, user);

        return ResponseEntity.ok(ApiResponse.success("Attachment retrieved successfully", attachment));
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<ApiResponse<Map<String, String>>> getDownloadUrl(
            @PathVariable Long id,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        String downloadUrl = attachmentService.getDownloadUrl(id, user);

        Map<String, String> response = Map.of(
                "downloadUrl", downloadUrl,
                "message", "Download URL generated successfully"
        );

        return ResponseEntity.ok(ApiResponse.success("Download URL generated successfully", response));
    }

    @GetMapping("/{id}/preview")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPreviewUrl(
            @PathVariable Long id,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        Map<String, Object> previewData = attachmentService.getPreviewData(id, user);

        return ResponseEntity.ok(ApiResponse.success("Preview data generated successfully", previewData));
    }

    @GetMapping("/{id}/stream")
    public ResponseEntity<byte[]> streamAttachment(
            @PathVariable Long id,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();

        try {
            var streamData = attachmentService.streamAttachment(id, user);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(streamData.getContentType()));
            headers.set("Content-Disposition", "inline; filename=\"" + streamData.getFileName() + "\"");
            headers.setContentLength(streamData.getData().length);

            headers.set("X-Content-Type-Options", "nosniff");
            headers.set("X-Frame-Options", "SAMEORIGIN");

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(streamData.getData());

        } catch (Exception e) {
            log.error("Failed to stream attachment {}: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Object>> deleteAttachment(
            @PathVariable Long id,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        attachmentService.deleteAttachment(id, user);

        return ResponseEntity.ok(ApiResponse.success("Attachment deleted successfully"));
    }

    @GetMapping("/user/my-uploads")
    public ResponseEntity<ApiResponse<Page<AttachmentSummary>>> getUserAttachments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        Page<AttachmentSummary> attachments = attachmentService.getUserAttachments(user, page, size);

        return ResponseEntity.ok(ApiResponse.success("User attachments retrieved successfully", attachments));
    }

    @GetMapping("/task/{taskId}/stats")
    public ResponseEntity<ApiResponse<AttachmentStatsResponse>> getTaskAttachmentStats(
            @PathVariable Long taskId,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        AttachmentStatsResponse stats = attachmentService.getTaskAttachmentStats(taskId, user);

        return ResponseEntity.ok(ApiResponse.success("Task attachment statistics retrieved successfully", stats));
    }

    @GetMapping("/user/stats")
    public ResponseEntity<ApiResponse<AttachmentStatsResponse>> getUserAttachmentStats(
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        AttachmentStatsResponse stats = attachmentService.getUserAttachmentStats(user);

        return ResponseEntity.ok(ApiResponse.success("User attachment statistics retrieved successfully", stats));
    }

    @GetMapping("/task/{taskId}/search")
    public ResponseEntity<ApiResponse<List<AttachmentSummary>>> searchTaskAttachments(
            @PathVariable Long taskId,
            @RequestParam String query,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        List<AttachmentSummary> attachments = attachmentService.searchTaskAttachments(taskId, query, user);

        return ResponseEntity.ok(ApiResponse.success("Attachment search completed successfully", attachments));
    }

    @PostMapping("/bulk-delete")
    public ResponseEntity<ApiResponse<Map<String, Object>>> bulkDeleteAttachments(
            @RequestBody List<Long> attachmentIds,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();

        int successCount = 0;
        int errorCount = 0;

        for (Long attachmentId : attachmentIds) {
            try {
                attachmentService.deleteAttachment(attachmentId, user);
                successCount++;
            } catch (Exception e) {
                log.error("Failed to delete attachment {}: {}", attachmentId, e.getMessage());
                errorCount++;
            }
        }

        Map<String, Object> result = Map.of(
                "total", attachmentIds.size(),
                "successful", successCount,
                "failed", errorCount,
                "message", String.format("Deleted %d of %d attachments", successCount, attachmentIds.size())
        );

        return ResponseEntity.ok(ApiResponse.success("Bulk delete operation completed", result));
    }

    @GetMapping("/admin/validate-files")
    public ResponseEntity<ApiResponse<Map<String, Object>>> validateFiles(
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();

        if (!user.getRole().name().equals("ADMIN")) {
            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("Access denied"));
        }

        Map<String, Object> validationResult = Map.of(
                "message", "File validation feature not yet implemented",
                "timestamp", java.time.LocalDateTime.now()
        );

        return ResponseEntity.ok(ApiResponse.success("File validation completed", validationResult));
    }
}