package com.devflow.backend.service;

import com.devflow.backend.dto.github.GitHubDTOs.*;
import com.devflow.backend.entity.User;
import com.devflow.backend.entity.GitHubUserToken;
import com.devflow.backend.repository.GitHubUserTokenRepository;
import com.devflow.backend.exception.AuthException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class GitHubOAuthService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final GitHubUserTokenRepository userTokenRepository;

    @Value("${github.oauth.client-id}")
    private String clientId;

    @Value("${github.oauth.client-secret}")
    private String clientSecret;

    @Value("${github.oauth.redirect-uri:}")
    private String configuredRedirectUri;

    @Value("${github.oauth.scope:repo,user:email,admin:repo_hook}")
    private String scope;

    @Value("${app.base-url:}")
    private String baseUrl;

    @Value("${app.backend-base-url:}")
    private String backendBaseUrl;

    @Value("${app.ngrok-frontend-url:}")
    private String ngrokFrontendUrl;

    private final Map<String, OAuthState> stateStore = new ConcurrentHashMap<>();
    private final Set<String> consumedStates = ConcurrentHashMap.newKeySet();
    private final Map<String, Set<String>> userActiveStates = new ConcurrentHashMap<>();

    @lombok.Data
    @lombok.AllArgsConstructor
    private static class OAuthState {
        private User user;
        private Long projectId;
        private LocalDateTime createdAt;
        private String userAgent;
        private boolean consumed;
        private String requestId;
    }

    public String generateAuthorizationUrl(User user, Long projectId) {
        clearExistingStatesForUser(user.getId(), projectId);

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

        log.info("Generated GitHub OAuth URL for user: {} and project: {} with redirect URI: {} and scope: {}",
                user.getUsername(), projectId, redirectUri, scope);
        return authUrl;
    }

    public GitHubAuthResponse handleOAuthCallback(GitHubAuthRequest request, String userAgent) {
        try {
            log.info("Handling GitHub OAuth callback with code: {} and state: {}",
                    request.getCode() != null ? "present" : "null", request.getState());

            OAuthState oauthState = validateAndConsumeStateEnhanced(request.getState(), userAgent);
            if (oauthState == null) {
                throw new AuthException("Invalid, expired, or already consumed OAuth state");
            }

            String accessToken = exchangeCodeForToken(request.getCode());

            UserInfo githubUser = getGitHubUserInfo(accessToken);

            validateTokenPermissions(accessToken);

            storeUserToken(oauthState.getUser(), accessToken, githubUser);

            List<RepositoryInfo> repositories = getAccessibleRepositories(accessToken);

            log.info("Successfully authenticated GitHub user: {} for DevFlow user: {} with scope: {}",
                    githubUser.getLogin(), oauthState.getUser().getUsername(), scope);

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

    public boolean validateAccessToken(String accessToken) {
        try {
            HttpHeaders headers = createAuthHeaders(accessToken);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    "https://api.github.com/user", HttpMethod.GET, entity, JsonNode.class
            );

            if (response.getStatusCode() == HttpStatus.OK) {
                validateTokenPermissions(accessToken);
                return true;
            }
            return false;

        } catch (Exception e) {
            log.debug("Invalid GitHub access token: {}", e.getMessage());
            return false;
        }
    }

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

    private void validateTokenPermissions(String accessToken) {
        try {
            HttpHeaders headers = createAuthHeaders(accessToken);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                    "https://api.github.com/user", HttpMethod.HEAD, entity, String.class
            );

            String scopes = response.getHeaders().getFirst("X-OAuth-Scopes");
            if (scopes == null) {
                log.warn("Could not determine GitHub token scopes");
                return;
            }

            List<String> scopeList = Arrays.asList(scopes.split(",\\s*"));
            log.info("GitHub token has scopes: {}", scopeList);

            boolean hasRepoScope = scopeList.contains("repo") || scopeList.contains("public_repo");
            boolean hasHookScope = scopeList.contains("admin:repo_hook") || scopeList.contains("write:repo_hook");

            if (!hasRepoScope) {
                throw new AuthException("GitHub token missing repository access. Please re-authorize with proper permissions.");
            }

            if (!hasHookScope) {
                log.warn("GitHub token missing webhook permissions. Webhook creation may fail.");
            }

        } catch (AuthException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Failed to validate GitHub token permissions: {}", e.getMessage());
        }
    }

    private void storeUserToken(User user, String accessToken, UserInfo githubUser) {
        userTokenRepository.deactivateAllTokensForUser(user);

        GitHubUserToken userToken = GitHubUserToken.builder()
                .user(user)
                .accessToken(accessToken)
                .tokenType("Bearer")
                .scope(scope)
                .githubUserId(githubUser.getId())
                .githubUsername(githubUser.getLogin())
                .githubUserEmail(githubUser.getEmail())
                .active(true)
                .expiresAt(LocalDateTime.now().plusYears(1))
                .build();

        userTokenRepository.save(userToken);

        log.info("Stored GitHub token for user: {} (GitHub: {}) with scope: {}",
                user.getUsername(), githubUser.getLogin(), scope);
    }

    private void clearExistingStatesForUser(Long userId, Long projectId) {
        String userKey = userId + ":" + projectId;
        Set<String> activeStates = userActiveStates.get(userKey);

        if (activeStates != null) {
            log.info("Clearing {} existing OAuth states for user {} and project {}",
                    activeStates.size(), userId, projectId);

            for (String existingState : activeStates) {
                stateStore.remove(existingState);
                consumedStates.add(existingState);
            }

            userActiveStates.remove(userKey);
        }
    }

    private String generateSecureState(User user, Long projectId) {
        String state = UUID.randomUUID().toString();
        String requestId = UUID.randomUUID().toString();

        OAuthState oauthState = new OAuthState(user, projectId, LocalDateTime.now(), "web", false, requestId);
        stateStore.put(state, oauthState);

        String userKey = user.getId() + ":" + projectId;
        userActiveStates.computeIfAbsent(userKey, k -> ConcurrentHashMap.newKeySet()).add(state);

        cleanupExpiredStates();

        log.debug("Generated OAuth state {} (request {}) for user {} and project {}",
                state, requestId, user.getId(), projectId);
        return state;
    }

    private OAuthState validateAndConsumeStateEnhanced(String state, String userAgent) {
        if (state == null || state.trim().isEmpty()) {
            log.warn("Received null or empty state parameter");
            return null;
        }

        if (consumedStates.contains(state)) {
            log.warn("State parameter already consumed globally: {}", state);
            return null;
        }

        OAuthState oauthState = stateStore.get(state);
        if (oauthState == null) {
            log.warn("Invalid state parameter (not found in store): {}", state);
            return null;
        }

        if (oauthState.getCreatedAt().isBefore(LocalDateTime.now().minusMinutes(15))) {
            stateStore.remove(state);
            log.warn("Expired state parameter: {}", state);
            return null;
        }

        if (oauthState.isConsumed()) {
            log.warn("State parameter already consumed (marked in state): {}", state);
            return null;
        }

        String userKey = oauthState.getUser().getId() + ":" + oauthState.getProjectId();
        Set<String> userStates = userActiveStates.get(userKey);
        if (userStates == null || !userStates.contains(state)) {
            log.warn("State parameter not found in user tracking: {}", state);
            return null;
        }

        oauthState.setConsumed(true);
        consumedStates.add(state);

        stateStore.remove(state);
        if (userStates != null) {
            userStates.remove(state);
            if (userStates.isEmpty()) {
                userActiveStates.remove(userKey);
            }
        }

        log.info("✅ Successfully validated and consumed OAuth state {} (request {}) for user {} and project {}",
                state, oauthState.getRequestId(), oauthState.getUser().getId(), oauthState.getProjectId());

        return oauthState;
    }

    private void cleanupExpiredStates() {
        LocalDateTime expiry = LocalDateTime.now().minusMinutes(15);

        int removedStates = 0;
        Iterator<Map.Entry<String, OAuthState>> iterator = stateStore.entrySet().iterator();
        while (iterator.hasNext()) {
            Map.Entry<String, OAuthState> entry = iterator.next();
            if (entry.getValue().getCreatedAt().isBefore(expiry)) {
                String state = entry.getKey();
                OAuthState oauthState = entry.getValue();

                String userKey = oauthState.getUser().getId() + ":" + oauthState.getProjectId();
                Set<String> userStates = userActiveStates.get(userKey);
                if (userStates != null) {
                    userStates.remove(state);
                    if (userStates.isEmpty()) {
                        userActiveStates.remove(userKey);
                    }
                }

                iterator.remove();
                removedStates++;
            }
        }

        if (consumedStates.size() > 1000) {
            log.info("Clearing consumed states set due to size ({})", consumedStates.size());
            consumedStates.clear();
        }

        if (removedStates > 0) {
            log.debug("Cleaned up {} expired OAuth states", removedStates);
        }
    }

    public void clearStoredState(Long userId, Long projectId) {
        log.info("Clearing OAuth state for user {} and project {} (development)", userId, projectId);

        clearExistingStatesForUser(userId, projectId);

        stateStore.entrySet().removeIf(entry -> {
            OAuthState state = entry.getValue();
            return state.getUser().getId().equals(userId) &&
                    state.getProjectId().equals(projectId);
        });

        log.info("Cleared OAuth states for user {} and project {}", userId, projectId);
    }

    public boolean hasActiveOAuthStates(Long userId, Long projectId) {
        String userKey = userId + ":" + projectId;
        Set<String> activeStates = userActiveStates.get(userKey);
        boolean hasActive = activeStates != null && !activeStates.isEmpty();

        if (hasActive) {
            log.debug("User {} has {} active OAuth states for project {}", userId, activeStates.size(), projectId);
        }

        return hasActive;
    }

    private String getRedirectUri() {
        String redirectUri;

        if (configuredRedirectUri != null && !configuredRedirectUri.trim().isEmpty()) {
            redirectUri = configuredRedirectUri;
        } else {
            String backendUrl = backendBaseUrl;

            if (backendUrl == null || backendUrl.trim().isEmpty()) {
                backendUrl = "https://dev-flow-production.up.railway.app";
            }

            redirectUri = backendUrl + "/api/v1/github/oauth/callback";
        }

        log.info("Using GitHub OAuth redirect URI: {}", redirectUri);
        return redirectUri;
    }

    public String getFrontendCallbackUrl() {
        String frontendUrl = ngrokFrontendUrl;

        if (frontendUrl == null || frontendUrl.trim().isEmpty()) {
            frontendUrl = "https://f9cd-2600-4808-5392-d600-c169-c8bd-9682-5e51.ngrok-free.app";
        }

        if (frontendUrl.endsWith("/")) {
            frontendUrl = frontendUrl.substring(0, frontendUrl.length() - 1);
        }

        return frontendUrl + "/auth/github/callback";
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
                String receivedScope = responseBody.has("scope") ? responseBody.get("scope").asText() : "unknown";

                log.info("Successfully obtained access token with scope: {}", receivedScope);
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

    public Long getProjectIdFromState(String state) {
        OAuthState oauthState = stateStore.get(state);
        return oauthState != null ? oauthState.getProjectId() : null;
    }

    public User getUserFromState(String state) {
        OAuthState oauthState = stateStore.get(state);
        return oauthState != null ? oauthState.getUser() : null;
    }
}