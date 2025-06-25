// GitHubOAuthService.java
package com.devflow.backend.service;

import com.devflow.backend.dto.github.GitHubDTOs.*;
import com.devflow.backend.entity.User;
import com.devflow.backend.exception.AuthException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class GitHubOAuthService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${github.oauth.client-id}")
    private String clientId;

    @Value("${github.oauth.client-secret}")
    private String clientSecret;

    @Value("${github.oauth.redirect-uri:}")
    private String configuredRedirectUri;

    @Value("${github.oauth.scope:repo,user:email}")
    private String scope;

    @Value("${app.base-url:}")
    private String baseUrl;

    // Add ngrok URL support
    @Value("${app.ngrok-url:}")
    private String ngrokUrl;

    @Value("${app.backend-base-url:}")
    private String backendBaseUrl;

    // Add ngrok frontend URL support
    @Value("${app.ngrok-frontend-url:}")
    private String ngrokFrontendUrl;

    // Store temporary state for OAuth flow security
    private final Map<String, OAuthState> stateStore = new ConcurrentHashMap<>();

    @lombok.Data
    @lombok.AllArgsConstructor
    private static class OAuthState {
        private User user;
        private Long projectId;
        private LocalDateTime createdAt;
        private String userAgent;
    }

    /**
     * Generate GitHub OAuth authorization URL
     */
    public String generateAuthorizationUrl(User user, Long projectId) {
        String state = generateSecureState(user, projectId);
        String redirectUri = getRedirectUri();

        String authUrl = UriComponentsBuilder
                .fromHttpUrl("https://github.com/login/oauth/authorize")
                .queryParam("client_id", clientId)
                .queryParam("redirect_uri", redirectUri)
                .queryParam("scope", scope)
                .queryParam("state", state)
                .queryParam("allow_signup", "true")
                .build()
                .toUriString();

        log.info("Generated GitHub OAuth URL for user: {} and project: {} with redirect URI: {}",
                user.getUsername(), projectId, redirectUri);
        return authUrl;
    }

    /**
     * Handle OAuth callback and exchange code for access token
     */
    public GitHubAuthResponse handleOAuthCallback(GitHubAuthRequest request, String userAgent) {
        try {
            log.info("Handling GitHub OAuth callback with code: {} and state: {}",
                    request.getCode() != null ? "present" : "null", request.getState());

            // Validate state
            OAuthState oauthState = validateState(request.getState(), userAgent);
            if (oauthState == null) {
                throw new AuthException("Invalid or expired OAuth state");
            }

            // Exchange code for access token
            String accessToken = exchangeCodeForToken(request.getCode());

            // Get user info from GitHub
            UserInfo githubUser = getGitHubUserInfo(accessToken);

            // Get accessible repositories
            List<RepositoryInfo> repositories = getAccessibleRepositories(accessToken);

            // Clean up state
            stateStore.remove(request.getState());

            log.info("Successfully authenticated GitHub user: {} for DevFlow user: {}",
                    githubUser.getLogin(), oauthState.getUser().getUsername());

            return GitHubAuthResponse.builder()
                    .accessToken(accessToken)
                    .tokenType("Bearer")
                    .scope(scope)
                    .userInfo(githubUser)
                    .accessibleRepositories(repositories)
                    .build();

        } catch (Exception e) {
            log.error("Failed to handle GitHub OAuth callback: {}", e.getMessage(), e);
            throw new AuthException("Failed to authenticate with GitHub: " + e.getMessage());
        }
    }

    /**
     * Search repositories accessible to the user
     */
    public RepositorySearchResult searchRepositories(String accessToken, String query, int page, int perPage) {
        try {
            log.info("Searching GitHub repositories with query: {}, page: {}, perPage: {}", query, page, perPage);

            HttpHeaders headers = createAuthHeaders(accessToken);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            String url = UriComponentsBuilder
                    .fromHttpUrl("https://api.github.com/search/repositories")
                    .queryParam("q", query + " user:@me")
                    .queryParam("sort", "updated")
                    .queryParam("order", "desc")
                    .queryParam("page", page)
                    .queryParam("per_page", Math.min(perPage, 100))
                    .build()
                    .toUriString();

            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    url, HttpMethod.GET, entity, JsonNode.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode body = response.getBody();
                List<RepositoryInfo> repositories = parseRepositories(body.get("items"));

                return RepositorySearchResult.builder()
                        .repositories(repositories)
                        .totalCount(body.get("total_count").asInt())
                        .hasMore(body.get("total_count").asInt() > (page * perPage))
                        .build();
            }

            throw new RuntimeException("Failed to search repositories");

        } catch (Exception e) {
            log.error("Failed to search GitHub repositories: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to search repositories: " + e.getMessage());
        }
    }

    /**
     * Get repository details
     */
    public RepositoryInfo getRepositoryInfo(String accessToken, String owner, String repo) {
        try {
            log.info("Getting repository info for {}/{}", owner, repo);

            HttpHeaders headers = createAuthHeaders(accessToken);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            String url = String.format("https://api.github.com/repos/%s/%s", owner, repo);

            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    url, HttpMethod.GET, entity, JsonNode.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                return parseRepository(response.getBody());
            }

            throw new RuntimeException("Repository not found or not accessible");

        } catch (Exception e) {
            log.error("Failed to get repository info for {}/{}: {}", owner, repo, e.getMessage());
            throw new RuntimeException("Failed to get repository info: " + e.getMessage());
        }
    }

    /**
     * Validate GitHub access token
     */
    public boolean validateAccessToken(String accessToken) {
        try {
            HttpHeaders headers = createAuthHeaders(accessToken);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    "https://api.github.com/user", HttpMethod.GET, entity, JsonNode.class
            );

            return response.getStatusCode() == HttpStatus.OK;

        } catch (Exception e) {
            log.debug("Invalid GitHub access token: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Revoke GitHub access token
     */
    public void revokeAccessToken(String accessToken) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setBasicAuth(clientId, clientSecret);
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, String> body = Map.of("access_token", accessToken);
            HttpEntity<Map<String, String>> entity = new HttpEntity<>(body, headers);

            restTemplate.exchange(
                    "https://api.github.com/applications/" + clientId + "/grant",
                    HttpMethod.DELETE, entity, String.class
            );

            log.info("Successfully revoked GitHub access token");

        } catch (Exception e) {
            log.warn("Failed to revoke GitHub access token: {}", e.getMessage());
        }
    }

    // Private helper methods

    /**
     * Get the appropriate redirect URI based on configuration and environment
     */
    private String getRedirectUri() {
        // Priority order: configured redirect URI > ngrok URL > backend base URL > base URL
        String redirectUri;

        if (configuredRedirectUri != null && !configuredRedirectUri.trim().isEmpty()) {
            redirectUri = configuredRedirectUri;
        } else if (ngrokUrl != null && !ngrokUrl.trim().isEmpty()) {
            redirectUri = ngrokUrl + "/api/v1/github/oauth/callback";
        } else if (backendBaseUrl != null && !backendBaseUrl.trim().isEmpty()) {
            redirectUri = backendBaseUrl + "/api/v1/github/oauth/callback";
        } else if (baseUrl != null && !baseUrl.trim().isEmpty()) {
            redirectUri = baseUrl + "/api/v1/github/oauth/callback";
        } else {
            // Fallback for development
            redirectUri = "http://localhost:3000/api/v1/github/oauth/callback";
        }

        log.info("Using GitHub OAuth redirect URI: {}", redirectUri);
        return redirectUri;
    }

    private String generateSecureState(User user, Long projectId) {
        String state = UUID.randomUUID().toString();
        OAuthState oauthState = new OAuthState(user, projectId, LocalDateTime.now(), "web");
        stateStore.put(state, oauthState);

        // Schedule cleanup of old states
        cleanupExpiredStates();

        log.debug("Generated OAuth state for user {} and project {}", user.getId(), projectId);
        return state;
    }

    private OAuthState validateState(String state, String userAgent) {
        if (state == null || state.trim().isEmpty()) {
            log.warn("Received null or empty state parameter");
            return null;
        }

        OAuthState oauthState = stateStore.get(state);

        if (oauthState == null) {
            log.warn("Invalid or already consumed state parameter: {}", state);
            return null;
        }

        // Check if state is expired (15 minutes)
        if (oauthState.getCreatedAt().isBefore(LocalDateTime.now().minusMinutes(15))) {
            stateStore.remove(state);
            log.warn("Expired state parameter: {}", state);
            return null;
        }

        log.debug("Validated OAuth state for user {} and project {}",
                oauthState.getUser().getId(), oauthState.getProjectId());
        return oauthState;
    }

    private String exchangeCodeForToken(String code) {
        try {
            log.info("Exchanging authorization code for access token");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
            headers.set("User-Agent", "DevFlow-App/1.0");

            String body = String.format(
                    "client_id=%s&client_secret=%s&code=%s&redirect_uri=%s",
                    clientId, clientSecret, code, getRedirectUri()
            );

            HttpEntity<String> entity = new HttpEntity<>(body, headers);

            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    "https://github.com/login/oauth/access_token",
                    HttpMethod.POST, entity, JsonNode.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode responseBody = response.getBody();

                if (responseBody.has("error")) {
                    String error = responseBody.get("error").asText();
                    String errorDescription = responseBody.has("error_description")
                            ? responseBody.get("error_description").asText()
                            : "Unknown error";
                    throw new RuntimeException("GitHub OAuth error: " + error + " - " + errorDescription);
                }

                if (!responseBody.has("access_token")) {
                    throw new RuntimeException("No access token received from GitHub");
                }

                String accessToken = responseBody.get("access_token").asText();
                log.info("Successfully obtained access token");
                return accessToken;
            }

            throw new RuntimeException("Failed to exchange code for token");

        } catch (Exception e) {
            log.error("Failed to exchange OAuth code for token: {}", e.getMessage());
            throw new RuntimeException("Failed to exchange code for token: " + e.getMessage());
        }
    }

    private UserInfo getGitHubUserInfo(String accessToken) {
        try {
            log.info("Getting user info from GitHub");

            HttpHeaders headers = createAuthHeaders(accessToken);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    "https://api.github.com/user", HttpMethod.GET, entity, JsonNode.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode user = response.getBody();

                return UserInfo.builder()
                        .id(user.get("id").asLong())
                        .login(user.get("login").asText())
                        .name(user.has("name") && !user.get("name").isNull() ? user.get("name").asText() : null)
                        .email(user.has("email") && !user.get("email").isNull() ? user.get("email").asText() : null)
                        .avatarUrl(user.get("avatar_url").asText())
                        .htmlUrl(user.get("html_url").asText())
                        .type(user.get("type").asText())
                        .build();
            }

            throw new RuntimeException("Failed to get user info");

        } catch (Exception e) {
            log.error("Failed to get GitHub user info: {}", e.getMessage());
            throw new RuntimeException("Failed to get user info: " + e.getMessage());
        }
    }

    private List<RepositoryInfo> getAccessibleRepositories(String accessToken) {
        try {
            log.info("Getting accessible repositories from GitHub");

            HttpHeaders headers = createAuthHeaders(accessToken);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            String url = UriComponentsBuilder
                    .fromHttpUrl("https://api.github.com/user/repos")
                    .queryParam("sort", "updated")
                    .queryParam("direction", "desc")
                    .queryParam("per_page", "100")
                    .queryParam("affiliation", "owner,collaborator")
                    .build()
                    .toUriString();

            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    url, HttpMethod.GET, entity, JsonNode.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                return parseRepositories(response.getBody());
            }

            return new ArrayList<>();

        } catch (Exception e) {
            log.error("Failed to get accessible repositories: {}", e.getMessage());
            return new ArrayList<>();
        }
    }

    private List<RepositoryInfo> parseRepositories(JsonNode repositoriesNode) {
        List<RepositoryInfo> repositories = new ArrayList<>();

        if (repositoriesNode != null && repositoriesNode.isArray()) {
            for (JsonNode repoNode : repositoriesNode) {
                repositories.add(parseRepository(repoNode));
            }
        }

        return repositories;
    }

    private RepositoryInfo parseRepository(JsonNode repoNode) {
        return RepositoryInfo.builder()
                .id(repoNode.get("id").asLong())
                .fullName(repoNode.get("full_name").asText())
                .name(repoNode.get("name").asText())
                .owner(repoNode.get("owner").get("login").asText())
                .description(repoNode.has("description") && !repoNode.get("description").isNull()
                        ? repoNode.get("description").asText() : null)
                .url(repoNode.get("html_url").asText())
                .cloneUrl(repoNode.get("clone_url").asText())
                .defaultBranch(repoNode.get("default_branch").asText())
                .isPrivate(repoNode.get("private").asBoolean())
                .isFork(repoNode.get("fork").asBoolean())
                .stargazersCount(repoNode.get("stargazers_count").asInt())
                .forksCount(repoNode.get("forks_count").asInt())
                .language(repoNode.has("language") && !repoNode.get("language").isNull()
                        ? repoNode.get("language").asText() : null)
                .createdAt(parseGitHubDateTime(repoNode.get("created_at").asText()))
                .updatedAt(parseGitHubDateTime(repoNode.get("updated_at").asText()))
                .pushedAt(repoNode.has("pushed_at") && !repoNode.get("pushed_at").isNull()
                        ? parseGitHubDateTime(repoNode.get("pushed_at").asText()) : null)
                .build();
    }

    private HttpHeaders createAuthHeaders(String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
        headers.set("User-Agent", "DevFlow-App/1.0");
        return headers;
    }

    private LocalDateTime parseGitHubDateTime(String dateTimeString) {
        try {
            return LocalDateTime.parse(dateTimeString.replace("Z", ""));
        } catch (Exception e) {
            log.warn("Failed to parse GitHub datetime: {}", dateTimeString);
            return LocalDateTime.now();
        }
    }

    private void cleanupExpiredStates() {
        LocalDateTime expiry = LocalDateTime.now().minusMinutes(15);
        int removed = 0;
        Iterator<Map.Entry<String, OAuthState>> iterator = stateStore.entrySet().iterator();
        while (iterator.hasNext()) {
            Map.Entry<String, OAuthState> entry = iterator.next();
            if (entry.getValue().getCreatedAt().isBefore(expiry)) {
                iterator.remove();
                removed++;
            }
        }
        if (removed > 0) {
            log.debug("Cleaned up {} expired OAuth states", removed);
        }
    }

    /**
     * Get the project ID from stored OAuth state
     */
    public Long getProjectIdFromState(String state) {
        OAuthState oauthState = stateStore.get(state);
        return oauthState != null ? oauthState.getProjectId() : null;
    }

    /**
     * Get the user from stored OAuth state
     */
    public User getUserFromState(String state) {
        OAuthState oauthState = stateStore.get(state);
        return oauthState != null ? oauthState.getUser() : null;
    }
}