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
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class GitHubRepositorySearchService {

    @Qualifier("githubRestTemplate")
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final GitHubUserTokenRepository userTokenRepository;

    public RepositorySearchResult searchUserRepositories(User user, String query, int page, int perPage) {
        String accessToken = getUserAccessToken(user);

        try {
            log.info("Searching GitHub repositories for user {}: query={}, page={}, perPage={}",
                    user.getUsername(), query, page, perPage);

            HttpHeaders headers = createAuthHeaders(accessToken);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            String searchQuery = buildSearchQuery(query);

            String url = UriComponentsBuilder
                    .fromHttpUrl("https://api.github.com/search/repositories")
                    .queryParam("q", searchQuery)
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
            log.error("Failed to search GitHub repositories for user {}: {}", user.getUsername(), e.getMessage(), e);
            throw new RuntimeException("Failed to search repositories: " + e.getMessage());
        }
    }

    public RepositoryInfo getRepositoryInfo(User user, String owner, String repo) {
        String accessToken = getUserAccessToken(user);

        try {
            log.info("Getting repository info for {}/{} for user {}", owner, repo, user.getUsername());

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
            log.error("Failed to get repository info for {}/{} for user {}: {}",
                    owner, repo, user.getUsername(), e.getMessage());
            throw new RuntimeException("Failed to get repository info: " + e.getMessage());
        }
    }

    public List<RepositoryInfo> getUserRepositories(User user, int page, int perPage) {
        String accessToken = getUserAccessToken(user);

        try {
            log.info("Getting repositories for user {}: page={}, perPage={}",
                    user.getUsername(), page, perPage);

            HttpHeaders headers = createAuthHeaders(accessToken);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            String url = UriComponentsBuilder
                    .fromHttpUrl("https://api.github.com/user/repos")
                    .queryParam("sort", "updated")
                    .queryParam("direction", "desc")
                    .queryParam("page", page)
                    .queryParam("per_page", Math.min(perPage, 100))
                    .queryParam("affiliation", "owner,collaborator,organization_member")
                    .queryParam("visibility", "all")
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
            log.error("Failed to get repositories for user {}: {}", user.getUsername(), e.getMessage());
            return new ArrayList<>();
        }
    }

    public boolean validateUserAccess(User user, String owner, String repo) {
        try {
            getRepositoryInfo(user, owner, repo);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private String getUserAccessToken(User user) {
        GitHubUserToken userToken = userTokenRepository.findByUserAndActiveTrue(user)
                .orElseThrow(() -> new AuthException("GitHub access token not found. Please reconnect your GitHub account."));

        if (userToken.isExpired()) {
            throw new AuthException("GitHub access token has expired. Please reconnect your GitHub account.");
        }

        return userToken.getAccessToken();
    }

    private String buildSearchQuery(String query) {
        if (query == null || query.trim().isEmpty()) {
            return "user:@me";
        }

        String trimmedQuery = query.trim();

        if (trimmedQuery.contains("user:") || trimmedQuery.contains("org:")) {
            return trimmedQuery;
        }

        return trimmedQuery + " user:@me";
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
        headers.set("X-GitHub-Api-Version", "2022-11-28");
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
}