package com.devflow.backend.service;

import com.devflow.backend.dto.github.GitHubDTOs.*;
import com.devflow.backend.entity.*;
import com.devflow.backend.repository.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class GitHubWebhookService {

    private final GitHubConnectionRepository connectionRepository;
    private final GitHubCommitRepository commitRepository;
    private final GitHubPullRequestRepository pullRequestRepository;
    private final GitHubTaskLinkingService taskLinkingService;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${github.webhook.secret}")
    private String defaultWebhookSecret;

    @Value("${app.base-url}")
    private String baseUrl;

    @lombok.Data
    @lombok.Builder
    @lombok.AllArgsConstructor
    public static class WebhookCreationResult {
        private String webhookId;
        private String secret;
    }

    public WebhookCreationResult createWebhook(String repositoryFullName, String accessToken) {
        try {
            String webhookUrl = baseUrl + "/api/v1/github/webhook";
            String secret = generateWebhookSecret();

            log.info("=== Creating GitHub Webhook ===");
            log.info("Repository: {}", repositoryFullName);
            log.info("Webhook URL: {}", webhookUrl);
            log.info("Generated secret: {}", secret);

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            headers.setContentType(MediaType.APPLICATION_JSON);

            WebhookConfig config = WebhookConfig.builder()
                    .url(webhookUrl)
                    .content_type("json")
                    .secret(secret)
                    .insecure_ssl("0")
                    .build();

            CreateWebhookRequest request = CreateWebhookRequest.builder()
                    .name("web")
                    .active(true)
                    .events(List.of("push", "pull_request", "pull_request_review"))
                    .config(config)
                    .build();

            HttpEntity<CreateWebhookRequest> entity = new HttpEntity<>(request, headers);

            String url = String.format("https://api.github.com/repos/%s/hooks", repositoryFullName);

            log.info("Sending webhook creation request to: {}", url);

            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    url, HttpMethod.POST, entity, JsonNode.class
            );

            if (response.getStatusCode() == HttpStatus.CREATED && response.getBody() != null) {
                String webhookId = response.getBody().get("id").asText();
                log.info("Webhook created successfully with ID: {}", webhookId);

                return WebhookCreationResult.builder()
                        .webhookId(webhookId)
                        .secret(secret)
                        .build();
            }

            throw new RuntimeException("Failed to create webhook");

        } catch (Exception e) {
            log.error("Failed to create webhook for {}: {}", repositoryFullName, e.getMessage());
            throw new RuntimeException("Failed to create webhook: " + e.getMessage());
        }
    }

    public void deleteWebhook(String repositoryFullName, String webhookId) {
        try {
            log.info("Webhook {} marked for deletion for repository: {}", webhookId, repositoryFullName);

        } catch (Exception e) {
            log.warn("Failed to delete webhook {} for {}: {}", webhookId, repositoryFullName, e.getMessage());
        }
    }

    public WebhookEventResponse processWebhookEvent(WebhookEventRequest request, String signature) {
        try {
            log.info("=== Processing GitHub Webhook Event ===");
            log.info("Event type: {}", request.getEvent());
            log.info("Action: {}", request.getAction());
            log.info("Delivery ID: {}", request.getDeliveryId());
            log.info("Signature provided: {}", signature != null);

            Optional<GitHubConnection> connectionOpt = findConnectionFromPayload(request.getPayload());

            if (connectionOpt.isEmpty()) {
                log.warn("No connection found for webhook event");
                return WebhookEventResponse.builder()
                        .processed(false)
                        .message("No matching connection found")
                        .processedAt(LocalDateTime.now())
                        .build();
            }

            GitHubConnection connection = connectionOpt.get();
            log.info("Processing webhook for connection: {} (ID: {})",
                    connection.getRepositoryFullName(), connection.getId());

            // Get the raw payload as string for signature verification
            String rawPayload = getRawPayloadString(request.getPayload());

            if (!verifyWebhookSignature(rawPayload, signature, connection.getWebhookSecret())) {
                log.warn("Webhook signature verification failed for connection: {}", connection.getRepositoryFullName());
                return WebhookEventResponse.builder()
                        .processed(false)
                        .message("Invalid signature")
                        .processedAt(LocalDateTime.now())
                        .build();
            }

            log.info("Webhook signature verified successfully!");

            connection.recordWebhookReceived();
            connectionRepository.save(connection);

            List<String> actions = processEventByType(request.getEvent(), request.getAction(),
                    request.getPayload(), connection);

            log.info("Webhook processing completed. Actions performed: {}", actions);

            return WebhookEventResponse.builder()
                    .processed(true)
                    .message("Event processed successfully")
                    .actions(actions)
                    .processedAt(LocalDateTime.now())
                    .build();

        } catch (Exception e) {
            log.error("Failed to process webhook event: {}", e.getMessage(), e);
            return WebhookEventResponse.builder()
                    .processed(false)
                    .message("Processing failed: " + e.getMessage())
                    .processedAt(LocalDateTime.now())
                    .build();
        }
    }

    @Async
    public void processWebhookEventAsync(WebhookEventRequest request, String signature) {
        processWebhookEvent(request, signature);
    }

    private String getRawPayloadString(Object payload) {
        try {
            if (payload instanceof String) {
                return (String) payload;
            }
            return objectMapper.writeValueAsString(payload);
        } catch (Exception e) {
            log.error("Failed to convert payload to string for signature verification: {}", e.getMessage());
            throw new RuntimeException("Failed to process payload for signature verification");
        }
    }

    private List<String> processEventByType(String eventType, String action, Object payload,
                                            GitHubConnection connection) {
        List<String> actions = new java.util.ArrayList<>();

        try {
            JsonNode payloadNode = objectMapper.valueToTree(payload);

            switch (eventType) {
                case "push":
                    actions.addAll(processPushEvent(payloadNode, connection));
                    break;
                case "pull_request":
                    actions.addAll(processPullRequestEvent(action, payloadNode, connection));
                    break;
                case "pull_request_review":
                    actions.addAll(processPullRequestReviewEvent(action, payloadNode, connection));
                    break;
                default:
                    log.debug("Unhandled event type: {}", eventType);
            }

        } catch (Exception e) {
            log.error("Failed to process {} event: {}", eventType, e.getMessage());
            connection.recordError("Failed to process " + eventType + " event: " + e.getMessage());
            connectionRepository.save(connection);
        }

        return actions;
    }

    private List<String> processPushEvent(JsonNode payload, GitHubConnection connection) {
        List<String> actions = new java.util.ArrayList<>();

        try {
            JsonNode commits = payload.get("commits");
            String branch = payload.get("ref").asText().replace("refs/heads/", "");

            log.info("Processing push event for branch: {} with {} commits",
                    branch, commits != null ? commits.size() : 0);

            if (commits != null && commits.isArray()) {
                for (JsonNode commitNode : commits) {
                    GitHubCommit commit = processCommitFromWebhook(commitNode, branch, connection);
                    if (commit != null) {
                        actions.add("Processed commit: " + commit.getShortSha());
                        log.info("Successfully processed commit: {}", commit.getShortSha());

                        taskLinkingService.linkCommitToTasks(commit);
                    }
                }
            }

        } catch (Exception e) {
            log.error("Failed to process push event: {}", e.getMessage());
        }

        return actions;
    }

    private List<String> processPullRequestEvent(String action, JsonNode payload, GitHubConnection connection) {
        List<String> actions = new java.util.ArrayList<>();

        try {
            JsonNode prNode = payload.get("pull_request");
            GitHubPullRequest pullRequest = processPullRequestFromWebhook(prNode, connection, action);

            if (pullRequest != null) {
                actions.add("Processed PR #" + pullRequest.getPrNumber() + " - " + action);
                log.info("Successfully processed PR #{} - {}", pullRequest.getPrNumber(), action);

                taskLinkingService.linkPullRequestToTasks(pullRequest);

                if ("closed".equals(action) || "opened".equals(action) || "merged".equals(action)) {
                    taskLinkingService.updateTaskStatusFromPR(pullRequest);
                }
            }

        } catch (Exception e) {
            log.error("Failed to process pull request event: {}", e.getMessage());
        }

        return actions;
    }

    private List<String> processPullRequestReviewEvent(String action, JsonNode payload, GitHubConnection connection) {
        List<String> actions = new java.util.ArrayList<>();

        try {
            JsonNode prNode = payload.get("pull_request");
            Integer prNumber = prNode.get("number").asInt();

            Optional<GitHubPullRequest> prOpt = pullRequestRepository
                    .findByGitHubConnectionAndPrNumber(connection, prNumber);

            if (prOpt.isPresent()) {
                GitHubPullRequest pr = prOpt.get();

                if (prNode.has("review_comments")) {
                    pr.setReviewCommentsCount(prNode.get("review_comments").asInt());
                }

                pullRequestRepository.save(pr);
                actions.add("Updated PR #" + prNumber + " review status");
            }

        } catch (Exception e) {
            log.error("Failed to process pull request review event: {}", e.getMessage());
        }

        return actions;
    }

    private GitHubCommit processCommitFromWebhook(JsonNode commitNode, String branch, GitHubConnection connection) {
        try {
            String sha = commitNode.get("id").asText();

            if (commitRepository.existsByCommitSha(sha)) {
                log.info("Commit {} already exists, skipping", sha);
                return commitRepository.findByCommitSha(sha).orElse(null);
            }

            JsonNode author = commitNode.get("author");
            JsonNode committer = commitNode.get("committer");

            GitHubCommit commit = GitHubCommit.builder()
                    .gitHubConnection(connection)
                    .commitSha(sha)
                    .commitMessage(commitNode.get("message").asText())
                    .authorName(author.get("name").asText())
                    .authorEmail(author.get("email").asText())
                    .authorUsername(author.has("username") ? author.get("username").asText() : null)
                    .committerName(committer.get("name").asText())
                    .committerEmail(committer.get("email").asText())
                    .commitDate(parseGitHubDateTime(commitNode.get("timestamp").asText()))
                    .commitUrl(commitNode.get("url").asText())
                    .branchName(branch)
                    .build();

            if (commitNode.has("added") && commitNode.has("removed") && commitNode.has("modified")) {
                commit.setAdditions(commitNode.get("added").size());
                commit.setDeletions(commitNode.get("removed").size());
                commit.setChangedFiles(commitNode.get("added").size() +
                        commitNode.get("removed").size() +
                        commitNode.get("modified").size());
            }

            GitHubCommit savedCommit = commitRepository.save(commit);
            log.info("Saved new commit: {} with message: {}", sha, commit.getCommitMessage());

            return savedCommit;

        } catch (Exception e) {
            log.error("Failed to process commit from webhook: {}", e.getMessage());
            return null;
        }
    }

    private GitHubPullRequest processPullRequestFromWebhook(JsonNode prNode, GitHubConnection connection, String action) {
        try {
            Integer prNumber = prNode.get("number").asInt();

            Optional<GitHubPullRequest> existingPR = pullRequestRepository
                    .findByGitHubConnectionAndPrNumber(connection, prNumber);

            GitHubPullRequest pullRequest;

            if (existingPR.isPresent()) {
                pullRequest = existingPR.get();
                updatePullRequestFromNode(pullRequest, prNode, action);
                log.info("Updated existing PR #{}", prNumber);
            } else {
                pullRequest = createPullRequestFromNode(prNode, connection);
                log.info("Created new PR #{}", prNumber);
            }

            return pullRequestRepository.save(pullRequest);

        } catch (Exception e) {
            log.error("Failed to process pull request from webhook: {}", e.getMessage());
            return null;
        }
    }

    private GitHubPullRequest createPullRequestFromNode(JsonNode prNode, GitHubConnection connection) {
        return GitHubPullRequest.builder()
                .gitHubConnection(connection)
                .prNumber(prNode.get("number").asInt())
                .title(prNode.get("title").asText())
                .description(prNode.has("body") && !prNode.get("body").isNull() ?
                        prNode.get("body").asText() : null)
                .status(parseGitHubPRStatus(prNode.get("state").asText(), prNode.get("draft").asBoolean()))
                .mergeState(parseGitHubMergeState(prNode.has("mergeable_state") ?
                        prNode.get("mergeable_state").asText() : "unknown"))
                .authorUsername(prNode.get("user").get("login").asText())
                .authorName(prNode.get("user").has("name") && !prNode.get("user").get("name").isNull() ?
                        prNode.get("user").get("name").asText() : null)
                .headBranch(prNode.get("head").get("ref").asText())
                .baseBranch(prNode.get("base").get("ref").asText())
                .headSha(prNode.get("head").get("sha").asText())
                .prUrl(prNode.get("html_url").asText())
                .createdDate(parseGitHubDateTime(prNode.get("created_at").asText()))
                .updatedDate(parseGitHubDateTime(prNode.get("updated_at").asText()))
                .mergedDate(prNode.has("merged_at") && !prNode.get("merged_at").isNull() ?
                        parseGitHubDateTime(prNode.get("merged_at").asText()) : null)
                .closedDate(prNode.has("closed_at") && !prNode.get("closed_at").isNull() ?
                        parseGitHubDateTime(prNode.get("closed_at").asText()) : null)
                .additions(prNode.has("additions") ? prNode.get("additions").asInt() : null)
                .deletions(prNode.has("deletions") ? prNode.get("deletions").asInt() : null)
                .changedFiles(prNode.has("changed_files") ? prNode.get("changed_files").asInt() : null)
                .commitsCount(prNode.has("commits") ? prNode.get("commits").asInt() : null)
                .reviewCommentsCount(prNode.has("review_comments") ? prNode.get("review_comments").asInt() : null)
                .commentsCount(prNode.has("comments") ? prNode.get("comments").asInt() : null)
                .build();
    }

    private void updatePullRequestFromNode(GitHubPullRequest pullRequest, JsonNode prNode, String action) {
        pullRequest.setTitle(prNode.get("title").asText());
        pullRequest.setDescription(prNode.has("body") && !prNode.get("body").isNull() ?
                prNode.get("body").asText() : null);
        pullRequest.setStatus(parseGitHubPRStatus(prNode.get("state").asText(), prNode.get("draft").asBoolean()));
        pullRequest.setMergeState(parseGitHubMergeState(prNode.has("mergeable_state") ?
                prNode.get("mergeable_state").asText() : "unknown"));
        pullRequest.setUpdatedDate(parseGitHubDateTime(prNode.get("updated_at").asText()));

        if ("closed".equals(action)) {
            pullRequest.setClosedDate(LocalDateTime.now());
            if (prNode.has("merged") && prNode.get("merged").asBoolean()) {
                pullRequest.setMergedDate(LocalDateTime.now());
                pullRequest.setMergeCommitSha(prNode.has("merge_commit_sha") ?
                        prNode.get("merge_commit_sha").asText() : null);
            }
        }

        if (prNode.has("additions")) {
            pullRequest.setAdditions(prNode.get("additions").asInt());
        }
        if (prNode.has("deletions")) {
            pullRequest.setDeletions(prNode.get("deletions").asInt());
        }
        if (prNode.has("changed_files")) {
            pullRequest.setChangedFiles(prNode.get("changed_files").asInt());
        }
        if (prNode.has("commits")) {
            pullRequest.setCommitsCount(prNode.get("commits").asInt());
        }
        if (prNode.has("review_comments")) {
            pullRequest.setReviewCommentsCount(prNode.get("review_comments").asInt());
        }
        if (prNode.has("comments")) {
            pullRequest.setCommentsCount(prNode.get("comments").asInt());
        }
    }

    private Optional<GitHubConnection> findConnectionFromPayload(Object payload) {
        try {
            JsonNode payloadNode = objectMapper.valueToTree(payload);

            JsonNode repository = null;

            if (payloadNode.has("repository")) {
                repository = payloadNode.get("repository");
            } else if (payloadNode.has("pull_request") && payloadNode.get("pull_request").has("base")) {
                repository = payloadNode.get("pull_request").get("base").get("repo");
            }

            if (repository != null && repository.has("full_name")) {
                String repositoryFullName = repository.get("full_name").asText();
                log.info("Looking for connection with repository: {}", repositoryFullName);

                Optional<GitHubConnection> connection = connectionRepository.findAll().stream()
                        .filter(conn -> conn.getRepositoryFullName().equals(repositoryFullName))
                        .filter(conn -> conn.getStatus() == GitHubConnectionStatus.ACTIVE)
                        .findFirst();

                if (connection.isPresent()) {
                    log.info("Found connection ID: {}", connection.get().getId());
                    log.info("Connection webhook secret exists: {}", connection.get().getWebhookSecret() != null);
                    log.info("Connection webhook secret length: {}",
                            connection.get().getWebhookSecret() != null ? connection.get().getWebhookSecret().length() : "null");
                } else {
                    log.warn("No active connection found for repository: {}", repositoryFullName);
                }

                return connection;
            }

        } catch (Exception e) {
            log.error("Failed to find connection from payload: {}", e.getMessage());
        }

        return Optional.empty();
    }

    private boolean verifyWebhookSignature(String rawPayload, String signature, String secret) {
        log.info("=== Webhook Signature Verification Debug ===");
        log.info("Received signature: {}", signature);
        log.info("Stored secret exists: {}", secret != null);
        log.info("Stored secret length: {}", secret != null ? secret.length() : "null");

        if (signature == null) {
            log.warn("No signature provided by GitHub");
            return false;
        }

        if (secret == null) {
            log.warn("No secret stored in connection");
            return false;
        }

        try {
            log.info("Raw payload length: {}", rawPayload.length());
            log.info("Raw payload preview: {}", rawPayload.length() > 100 ?
                    rawPayload.substring(0, 100) + "..." : rawPayload);

            String calculatedHash = calculateHmacSha256(rawPayload, secret);
            String expectedSignature = "sha256=" + calculatedHash;

            log.info("Calculated HMAC hash: {}", calculatedHash);
            log.info("Expected full signature: {}", expectedSignature);
            log.info("Received signature:     {}", signature);

            // Use secure comparison to prevent timing attacks
            boolean matches = secureEquals(signature, expectedSignature);
            log.info("Signatures match: {}", matches);

            if (!matches) {
                log.warn("Signature verification failed!");
                log.warn("This could be due to:");
                log.warn("1. Wrong secret stored in database");
                log.warn("2. GitHub using different secret than stored");
                log.warn("3. Payload modification during transport");
                log.warn("4. Encoding or formatting differences");

                // Debug: Try with different approaches
                String altHash1 = calculateHmacSha256(rawPayload.trim(), secret);
                String altSig1 = "sha256=" + altHash1;
                log.info("Alternative calculation (trimmed): {}", altSig1);

                // Try with UTF-8 explicit encoding
                String altHash2 = calculateHmacSha256UTF8(rawPayload, secret);
                String altSig2 = "sha256=" + altHash2;
                log.info("Alternative calculation (UTF-8): {}", altSig2);

            } else {
                log.info("✅ Signature verification successful!");
            }

            return matches;

        } catch (Exception e) {
            log.error("Failed to verify webhook signature: {}", e.getMessage(), e);
            return false;
        }
    }

    private String calculateHmacSha256(String data, String secret) throws NoSuchAlgorithmException, InvalidKeyException {
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKeySpec = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        mac.init(secretKeySpec);
        byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(hash);
    }

    private String calculateHmacSha256UTF8(String data, String secret) throws NoSuchAlgorithmException, InvalidKeyException {
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKeySpec = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        mac.init(secretKeySpec);
        byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(hash).toLowerCase();
    }

    private boolean secureEquals(String a, String b) {
        if (a == null || b == null) {
            return a == b;
        }

        if (a.length() != b.length()) {
            return false;
        }

        int result = 0;
        for (int i = 0; i < a.length(); i++) {
            result |= a.charAt(i) ^ b.charAt(i);
        }

        return result == 0;
    }

    private GitHubPRStatus parseGitHubPRStatus(String state, boolean isDraft) {
        if (isDraft) {
            return GitHubPRStatus.DRAFT;
        }

        switch (state.toLowerCase()) {
            case "open":
                return GitHubPRStatus.OPEN;
            case "closed":
                return GitHubPRStatus.CLOSED;
            default:
                return GitHubPRStatus.OPEN;
        }
    }

    private GitHubPRMergeState parseGitHubMergeState(String mergeableState) {
        switch (mergeableState.toLowerCase()) {
            case "clean":
                return GitHubPRMergeState.CLEAN;
            case "dirty":
                return GitHubPRMergeState.DIRTY;
            case "unstable":
                return GitHubPRMergeState.UNSTABLE;
            case "draft":
                return GitHubPRMergeState.DRAFT;
            case "blocked":
                return GitHubPRMergeState.BLOCKED;
            default:
                return GitHubPRMergeState.CLEAN;
        }
    }

    private LocalDateTime parseGitHubDateTime(String dateTimeString) {
        try {
            return LocalDateTime.parse(dateTimeString.replace("Z", ""));
        } catch (Exception e) {
            log.warn("Failed to parse GitHub datetime: {}", dateTimeString);
            return LocalDateTime.now();
        }
    }

    private String generateWebhookSecret() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    private static class CreateWebhookRequest {
        private String name;
        private boolean active;
        private List<String> events;
        private WebhookConfig config;
    }

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    private static class WebhookConfig {
        private String url;
        private String content_type;
        private String secret;
        private String insecure_ssl;
    }
}