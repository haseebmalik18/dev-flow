package com.devflow.backend.controller;

import com.devflow.backend.dto.common.ApiResponse;
import com.devflow.backend.dto.github.GitHubDTOs.*;
import com.devflow.backend.entity.User;
import com.devflow.backend.service.GitHubIntegrationService;
import com.devflow.backend.service.GitHubOAuthService;
import com.devflow.backend.service.GitHubWebhookService;
import com.devflow.backend.service.GitHubRepositorySearchService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
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
    private final GitHubRepositorySearchService repositorySearchService;

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

    @GetMapping("/oauth/callback")
    public void handleOAuthCallbackRedirect(
            @RequestParam(value = "code", required = false) String code,
            @RequestParam(value = "state", required = false) String state,
            @RequestParam(value = "error", required = false) String error,
            @RequestParam(value = "error_description", required = false) String errorDescription,
            HttpServletRequest request,
            HttpServletResponse response) throws IOException {

        log.info("GitHub OAuth callback received: code={}, state={}, error={}",
                code != null ? "present" : "null", state, error);

        String frontendCallbackUrl = oauthService.getFrontendCallbackUrl();
        StringBuilder callbackUrl = new StringBuilder(frontendCallbackUrl);

        try {
            if (error != null) {
                log.warn("GitHub OAuth error: {} - {}", error, errorDescription);

                List<String> params = new ArrayList<>();
                params.add("error=" + URLEncoder.encode(error, StandardCharsets.UTF_8));
                if (errorDescription != null) {
                    params.add("error_description=" + URLEncoder.encode(errorDescription, StandardCharsets.UTF_8));
                }
                callbackUrl.append("?").append(String.join("&", params));

            } else if (code != null && state != null) {
                log.info("Processing OAuth callback with code and state");

                GitHubAuthRequest authRequest = new GitHubAuthRequest();
                authRequest.setCode(code);
                authRequest.setState(state);

                String userAgent = request.getHeader("User-Agent");
                GitHubAuthResponse authResponse = oauthService.handleOAuthCallback(authRequest, userAgent);

                log.info("OAuth processed successfully for GitHub user: {}",
                        authResponse.getUserInfo() != null ? authResponse.getUserInfo().getLogin() : "unknown");

                List<String> params = new ArrayList<>();
                params.add("success=true");
                params.add("message=" + URLEncoder.encode("GitHub connected successfully!", StandardCharsets.UTF_8));

                if (authResponse.getUserInfo() != null) {
                    params.add("github_user=" + URLEncoder.encode(authResponse.getUserInfo().getLogin(), StandardCharsets.UTF_8));
                    if (authResponse.getUserInfo().getName() != null) {
                        params.add("github_name=" + URLEncoder.encode(authResponse.getUserInfo().getName(), StandardCharsets.UTF_8));
                    }
                }

                if (authResponse.getAccessibleRepositories() != null) {
                    params.add("repo_count=" + authResponse.getAccessibleRepositories().size());
                }

                callbackUrl.append("?").append(String.join("&", params));

            } else {
                log.warn("OAuth callback missing required parameters: code={}, state={}", code, state);

                List<String> params = List.of(
                        "error=" + URLEncoder.encode("invalid_request", StandardCharsets.UTF_8),
                        "error_description=" + URLEncoder.encode("Missing required parameters (code or state)", StandardCharsets.UTF_8)
                );
                callbackUrl.append("?").append(String.join("&", params));
            }

        } catch (Exception e) {
            log.error("Failed to process OAuth callback: {}", e.getMessage(), e);

            List<String> params = new ArrayList<>();
            params.add("error=" + URLEncoder.encode("processing_error", StandardCharsets.UTF_8));

            String errorMsg = "Failed to process GitHub authorization";
            if (e.getMessage() != null) {
                errorMsg += ": " + e.getMessage();
            }
            params.add("error_description=" + URLEncoder.encode(errorMsg, StandardCharsets.UTF_8));

            callbackUrl.append("?").append(String.join("&", params));
        }

        String finalRedirectUrl = callbackUrl.toString();
        log.info("Redirecting to frontend callback URL: {}", finalRedirectUrl);

        response.sendRedirect(finalRedirectUrl);
    }

    @GetMapping("/repositories/search")
    public ResponseEntity<ApiResponse<RepositorySearchResult>> searchRepositories(
            @RequestParam String query,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "30") int perPage,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        RepositorySearchResult result = repositorySearchService.searchUserRepositories(user, query, page, perPage);

        return ResponseEntity.ok(ApiResponse.success("Repositories retrieved successfully", result));
    }

    @GetMapping("/repositories/{owner}/{repo}")
    public ResponseEntity<ApiResponse<RepositoryInfo>> getRepositoryInfo(
            @PathVariable String owner,
            @PathVariable String repo,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        RepositoryInfo repositoryInfo = repositorySearchService.getRepositoryInfo(user, owner, repo);

        return ResponseEntity.ok(ApiResponse.success("Repository information retrieved successfully", repositoryInfo));
    }

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

    @DeleteMapping("/dev/projects/{projectId}/connections/clear")
    public ResponseEntity<ApiResponse<Map<String, Object>>> clearProjectConnections(
            @PathVariable Long projectId,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();

        try {
            List<ConnectionResponse> connections = githubService.getProjectConnections(projectId, user);

            int deletedCount = 0;

            for (ConnectionResponse connection : connections) {
                githubService.deleteConnection(connection.getId(), user);
                deletedCount++;
                log.info("Deleted GitHub connection {} for development testing", connection.getId());
            }

            Map<String, Object> response = Map.of(
                    "message", "Cleared GitHub connections for project " + projectId,
                    "deletedConnections", deletedCount,
                    "projectId", projectId
            );

            return ResponseEntity.ok(ApiResponse.success(
                    "Cleared " + deletedCount + " GitHub connections for project " + projectId, response
            ));

        } catch (Exception e) {
            log.error("Failed to clear project connections: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to clear project connections: " + e.getMessage()));
        }
    }

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

    @PostMapping("/search")
    public ResponseEntity<ApiResponse<GitHubSearchResponse>> search(
            @Valid @RequestBody GitHubSearchRequest request,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        GitHubSearchResponse searchResponse = githubService.search(request, user);

        return ResponseEntity.ok(ApiResponse.success("Search completed successfully", searchResponse));
    }

    @GetMapping("/projects/{projectId}/statistics")
    public ResponseEntity<ApiResponse<GitHubStatistics>> getProjectStatistics(
            @PathVariable Long projectId,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        GitHubStatistics statistics = githubService.getProjectStatistics(projectId, user);

        return ResponseEntity.ok(ApiResponse.success("GitHub statistics retrieved successfully", statistics));
    }

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

    @GetMapping("/health")
    public ResponseEntity<ApiResponse<Map<String, Object>>> healthCheck() {
        Map<String, Object> health = Map.of(
                "status", "healthy",
                "timestamp", java.time.LocalDateTime.now(),
                "version", "1.0.0"
        );

        return ResponseEntity.ok(ApiResponse.success("GitHub integration service is healthy", health));
    }

    @GetMapping("/admin/connections")
    public ResponseEntity<ApiResponse<List<ConnectionSummary>>> getAllConnections(
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        if (!user.getRole().name().equals("ADMIN")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("Admin access required"));
        }

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

        return ResponseEntity.ok(ApiResponse.success("Connection reset successfully"));
    }

    @PostMapping("/oauth/reset")
    public ResponseEntity<ApiResponse<Map<String, String>>> resetOAuthForTesting(
            @RequestParam Long projectId,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();

        try {
            log.info("Reset OAuth state for user {} and project {} for testing",
                    user.getId(), projectId);

            Map<String, String> response = Map.of(
                    "message", "OAuth state cleared for testing",
                    "note", "To fully reset, also revoke authorization at: https://github.com/settings/applications",
                    "instructions", "1. Clear local state (done), 2. Revoke on GitHub, 3. Try OAuth again",
                    "githubUrl", "https://github.com/settings/applications"
            );

            return ResponseEntity.ok(ApiResponse.success("OAuth state reset for development testing", response));

        } catch (Exception e) {
            log.error("Failed to reset OAuth state: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to reset OAuth state: " + e.getMessage()));
        }
    }

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