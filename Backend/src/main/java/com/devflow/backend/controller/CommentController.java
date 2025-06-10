package com.devflow.backend.controller;

import com.devflow.backend.dto.comment.CommentDTOs.*;
import com.devflow.backend.dto.common.ApiResponse;
import com.devflow.backend.entity.User;
import com.devflow.backend.service.CommentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @PostMapping
    public ResponseEntity<ApiResponse<CommentResponse>> createComment(
            @Valid @RequestBody CreateCommentRequest request,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        CommentResponse comment = commentService.createComment(request, user);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Comment created successfully", comment));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CommentResponse>> getComment(
            @PathVariable Long id,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        CommentResponse comment = commentService.getCommentById(id, user);

        return ResponseEntity.ok(ApiResponse.success("Comment retrieved successfully", comment));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CommentResponse>> updateComment(
            @PathVariable Long id,
            @Valid @RequestBody UpdateCommentRequest request,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        CommentResponse comment = commentService.updateComment(id, request, user);

        return ResponseEntity.ok(ApiResponse.success("Comment updated successfully", comment));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Object>> deleteComment(
            @PathVariable Long id,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        commentService.deleteComment(id, user);

        return ResponseEntity.ok(ApiResponse.success("Comment deleted successfully"));
    }

    @GetMapping("/task/{taskId}")
    public ResponseEntity<ApiResponse<List<CommentResponse>>> getTaskComments(
            @PathVariable Long taskId,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        List<CommentResponse> comments = commentService.getTaskComments(taskId, user);

        return ResponseEntity.ok(ApiResponse.success("Task comments retrieved successfully", comments));
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<ApiResponse<List<CommentResponse>>> getProjectComments(
            @PathVariable Long projectId,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        List<CommentResponse> comments = commentService.getProjectComments(projectId, user);

        return ResponseEntity.ok(ApiResponse.success("Project comments retrieved successfully", comments));
    }

    @GetMapping("/recent")
    public ResponseEntity<ApiResponse<Page<CommentSummary>>> getRecentComments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        Page<CommentSummary> comments = commentService.getRecentComments(user, page, size);

        return ResponseEntity.ok(ApiResponse.success("Recent comments retrieved successfully", comments));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<Page<CommentSummary>>> searchComments(
            @RequestParam String query,
            @RequestParam(required = false) Long projectId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        Page<CommentSummary> comments = commentService.searchComments(query, projectId, user, page, size);

        return ResponseEntity.ok(ApiResponse.success("Comment search completed successfully", comments));
    }

    @GetMapping("/mentions")
    public ResponseEntity<ApiResponse<Page<CommentSummary>>> getMentions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        Page<CommentSummary> comments = commentService.getMentions(user, page, size);

        return ResponseEntity.ok(ApiResponse.success("Mentions retrieved successfully", comments));
    }

    @GetMapping("/users/mentionable")
    public ResponseEntity<ApiResponse<List<UserSummary>>> getMentionableUsers(
            @RequestParam String search,
            @RequestParam(required = false) Long projectId,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        List<UserSummary> users = commentService.getMentionableUsers(search, projectId, user);

        return ResponseEntity.ok(ApiResponse.success("Mentionable users retrieved successfully", users));
    }
}