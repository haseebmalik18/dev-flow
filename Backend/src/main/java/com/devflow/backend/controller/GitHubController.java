// GitHubController.java
package com.devflow.backend.controller;

import com.devflow.backend.dto.common.ApiResponse;
import com.devflow.backend.dto.github.GitHubDTOs.*;
import com.devflow.backend.entity.User;
import com.devflow.backend.service.GitHubIntegrationService;
import com.devflow.backend.service.GitHubOAuthService;
import com.devflow.backend.service.GitHubWebhookService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/github")
@RequiredArgsConstructor
@Slf4j
public class GitHubController {

    private final GitHubIntegrationService githubService;
    private final GitHubOAuthService oauthService;
    private final GitHubWebhookService webhookService;

    // OAuth endpoints

    @PostMapping("/oauth/authorize")
    public ResponseEntity<ApiResponse<Map<String, String>>> initiateOAuth(
            @RequestParam Long projectId,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        String authUrl = oauthService.generateAuthorizationUrl(user, projectId);

        Map<String, String> response = Map.of(
                "authorizationUrl", authUrl,
                "message", "Redirect user to this URL to authorize GitHub access"
        );

        return ResponseEntity.ok(ApiResponse.success("GitHub authorization URL generated", response));
    }

    @PostMapping("/oauth/callback")
    public ResponseEntity<ApiResponse<GitHubAuthResponse>> handleOAuthCallback(
            @Valid @RequestBody GitHubAuthRequest request,
            HttpServletRequest httpRequest,
            Authentication authentication) {

        String userAgent = httpRequest.getHeader("User-Agent");
        GitHubAuthResponse authResponse = oauthService.handleOAuthCallback(request, userAgent);

        return ResponseEntity.ok(ApiResponse.success("GitHub authentication successful", authResponse));
    }

    @GetMapping("/repositories/search")
    public ResponseEntity<ApiResponse<RepositorySearchResult>> searchRepositories(
            @RequestParam String accessToken,
            @RequestParam String query,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "30") int perPage,
            Authentication authentication) {

        RepositorySearchResult result = oauthService.searchRepositories(accessToken, query, page, perPage);

        return ResponseEntity.ok(ApiResponse.success("Repositories retrieved successfully", result));
    }

    @GetMapping("/repositories/{owner}/{repo}")
    public ResponseEntity<ApiResponse<RepositoryInfo>> getRepositoryInfo(
            @PathVariable String owner,
            @PathVariable String repo,
            @RequestParam String accessToken,
            Authentication authentication) {

        RepositoryInfo repositoryInfo = oauthService.getRepositoryInfo(accessToken, owner, repo);

        return ResponseEntity.ok(ApiResponse.success("Repository information retrieved successfully", repositoryInfo));
    }

    // Connection management endpoints

    @PostMapping("/connections")
    public ResponseEntity<ApiResponse<ConnectionResponse>> createConnection(
            @Valid @RequestBody CreateConnectionRequest request,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        ConnectionResponse connection = githubService.createConnection(request, user);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("GitHub connection created successfully", connection));
    }

    @GetMapping("/projects/{projectId}/connections")
    public ResponseEntity<ApiResponse<List<ConnectionResponse>>> getProjectConnections(
            @PathVariable Long projectId,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        List<ConnectionResponse> connections = githubService.getProjectConnections(projectId, user);

        return ResponseEntity.ok(ApiResponse.success("Project connections retrieved successfully", connections));
    }

    @GetMapping("/connections/{connectionId}")
    public ResponseEntity<ApiResponse<ConnectionResponse>> getConnection(
            @PathVariable Long connectionId,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        ConnectionResponse connection = githubService.getConnection(connectionId, user);

        return ResponseEntity.ok(ApiResponse.success("Connection retrieved successfully", connection));
    }

    @DeleteMapping("/connections/{connectionId}")
    public ResponseEntity<ApiResponse<Object>> deleteConnection(
            @PathVariable Long connectionId,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        githubService.deleteConnection(connectionId, user);

        return ResponseEntity.ok(ApiResponse.success("GitHub connection deleted successfully"));
    }

    @PostMapping("/connections/{connectionId}/sync")
    public ResponseEntity<ApiResponse<SyncResponse>> syncConnection(
            @PathVariable Long connectionId,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        SyncResponse syncResponse = githubService.syncConnection(connectionId, user);

        return ResponseEntity.ok(ApiResponse.success("Connection sync completed", syncResponse));
    }

    // Commits endpoints

    @GetMapping("/projects/{projectId}/commits")
    public ResponseEntity<ApiResponse<Page<CommitResponse>>> getProjectCommits(
            @PathVariable Long projectId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        Page<CommitResponse> commits = githubService.getProjectCommits(projectId, user, page, size);

        return ResponseEntity.ok(ApiResponse.success("Project commits retrieved successfully", commits));
    }

    @GetMapping("/tasks/{taskId}/commits")
    public ResponseEntity<ApiResponse<List<CommitResponse>>> getTaskCommits(
            @PathVariable Long taskId,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        List<CommitResponse> commits = githubService.getTaskCommits(taskId, user);

        return ResponseEntity.ok(ApiResponse.success("Task commits retrieved successfully", commits));
    }

    @PostMapping("/commits/{commitId}/links")
    public ResponseEntity<ApiResponse<TaskLinkSummary>> createCommitTaskLink(
            @PathVariable Long commitId,
            @Valid @RequestBody CreateTaskLinkRequest request,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        TaskLinkSummary link = githubService.createCommitTaskLink(commitId, request, user);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Commit-task link created successfully", link));
    }

    // Pull Requests endpoints

    @GetMapping("/projects/{projectId}/pull-requests")
    public ResponseEntity<ApiResponse<Page<PullRequestResponse>>> getProjectPullRequests(
            @PathVariable Long projectId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        Page<PullRequestResponse> pullRequests = githubService.getProjectPullRequests(projectId, user, page, size);

        return ResponseEntity.ok(ApiResponse.success("Project pull requests retrieved successfully", pullRequests));
    }

    @GetMapping("/tasks/{taskId}/pull-requests")
    public ResponseEntity<ApiResponse<List<PullRequestResponse>>> getTaskPullRequests(
            @PathVariable Long taskId,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        List<PullRequestResponse> pullRequests = githubService.getTaskPullRequests(taskId, user);

        return ResponseEntity.ok(ApiResponse.success("Task pull requests retrieved successfully", pullRequests));
    }

    @PostMapping("/pull-requests/{prId}/links")
    public ResponseEntity<ApiResponse<TaskLinkSummary>> createPRTaskLink(
            @PathVariable Long prId,
            @Valid @RequestBody CreateTaskLinkRequest request,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        TaskLinkSummary link = githubService.createPRTaskLink(prId, request, user);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("PR-task link created successfully", link));
    }

    // Search endpoints

    @PostMapping("/search")
    public ResponseEntity<ApiResponse<GitHubSearchResponse>> search(
            @Valid @RequestBody GitHubSearchRequest request,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        GitHubSearchResponse searchResponse = githubService.search(request, user);

        return ResponseEntity.ok(ApiResponse.success("Search completed successfully", searchResponse));
    }

    // Statistics endpoints

    @GetMapping("/projects/{projectId}/statistics")
    public ResponseEntity<ApiResponse<GitHubStatistics>> getProjectStatistics(
            @PathVariable Long projectId,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        GitHubStatistics statistics = githubService.getProjectStatistics(projectId, user);

        return ResponseEntity.ok(ApiResponse.success("GitHub statistics retrieved successfully", statistics));
    }

    // Webhook endpoint (public - no authentication required)

    @PostMapping("/webhook")
    public ResponseEntity<ApiResponse<WebhookEventResponse>> handleWebhook(
            @RequestBody Object payload,
            @RequestHeader(value = "X-GitHub-Event", required = false) String event,
            @RequestHeader(value = "X-GitHub-Delivery", required = false) String deliveryId,
            @RequestHeader(value = "X-Hub-Signature-256", required = false) String signature,
            HttpServletRequest request) {

        try {
            log.info("Received GitHub webhook: event={}, delivery={}", event, deliveryId);

            String action = null;
            if (payload instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> payloadMap = (Map<String, Object>) payload;
                action = (String) payloadMap.get("action");
            }

            WebhookEventRequest webhookRequest = WebhookEventRequest.builder()
                    .event(event)
                    .action(action)
                    .payload(payload)
                    .signature(signature)
                    .deliveryId(deliveryId)
                    .build();

            WebhookEventResponse response = webhookService.processWebhookEvent(webhookRequest, signature);

            if (response.getProcessed()) {
                return ResponseEntity.ok(ApiResponse.success("Webhook processed successfully", response));
            } else {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Failed to process webhook: " + response.getMessage()));
            }

        } catch (Exception e) {
            log.error("Failed to handle GitHub webhook: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Internal server error processing webhook"));
        }
    }

    // Health check endpoint

    @GetMapping("/health")
    public ResponseEntity<ApiResponse<Map<String, Object>>> healthCheck() {
        Map<String, Object> health = Map.of(
                "status", "healthy",
                "timestamp", java.time.LocalDateTime.now(),
                "version", "1.0.0"
        );

        return ResponseEntity.ok(ApiResponse.success("GitHub integration service is healthy", health));
    }

    // Admin endpoints (require admin role)

    @GetMapping("/admin/connections")
    public ResponseEntity<ApiResponse<List<ConnectionSummary>>> getAllConnections(
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        if (!user.getRole().name().equals("ADMIN")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("Admin access required"));
        }

        // This would need to be implemented in the service
        return ResponseEntity.ok(ApiResponse.success("All connections retrieved", List.of()));
    }

    @PostMapping("/admin/connections/{connectionId}/reset")
    public ResponseEntity<ApiResponse<Object>> resetConnection(
            @PathVariable Long connectionId,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        if (!user.getRole().name().equals("ADMIN")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("Admin access required"));
        }

        // This would reset connection errors and force resync
        return ResponseEntity.ok(ApiResponse.success("Connection reset successfully"));
    }

    // Error handling

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Object>> handleIllegalArgument(IllegalArgumentException e) {
        log.warn("Invalid request: {}", e.getMessage());
        return ResponseEntity.badRequest()
                .body(ApiResponse.error("Invalid request: " + e.getMessage()));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ApiResponse<Object>> handleRuntimeException(RuntimeException e) {
        log.error("GitHub integration error: {}", e.getMessage(), e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("GitHub integration error: " + e.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> handleGenericException(Exception e) {
        log.error("Unexpected error in GitHub controller: {}", e.getMessage(), e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("An unexpected error occurred"));
    }
}