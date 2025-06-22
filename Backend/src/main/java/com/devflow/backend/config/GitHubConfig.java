package com.devflow.backend.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.client.DefaultResponseErrorHandler;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.time.Duration;

@Configuration
@EnableAsync
@EnableScheduling
@Slf4j
public class GitHubConfig {

    @Value("${github.api.timeout:30000}")
    private int apiTimeout;

    @Value("${github.api.max-connections:50}")
    private int maxConnections;

    /**
     * RestTemplate configured for GitHub API calls with proper error handling
     */
    @Bean("githubRestTemplate")
    public RestTemplate githubRestTemplate() {
        HttpComponentsClientHttpRequestFactory factory = new HttpComponentsClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(apiTimeout));
        factory.setConnectionRequestTimeout(Duration.ofMillis(apiTimeout));

        RestTemplate restTemplate = new RestTemplate(factory);
        restTemplate.setErrorHandler(new GitHubApiErrorHandler());

        log.info("GitHub RestTemplate configured with timeout: {}ms, max connections: {}",
                apiTimeout, maxConnections);
        return restTemplate;
    }

    /**
     * Custom error handler for GitHub API responses
     * Extends DefaultResponseErrorHandler to use the modern, non-deprecated handleError method
     */
    private static class GitHubApiErrorHandler extends DefaultResponseErrorHandler {

        @Override
        @SuppressWarnings("deprecation")
        public void handleError(ClientHttpResponse response) throws IOException {
            HttpStatusCode statusCode = response.getStatusCode();
            String responseBody = "";
            try {
                responseBody = new String(response.getBody().readAllBytes());
            } catch (Exception e) {
                log.warn("Failed to read GitHub API error response body", e);
            }

            log.error("GitHub API error: {} - {}", statusCode, responseBody);

            // Handle specific GitHub API error cases
            if (statusCode.equals(HttpStatus.UNAUTHORIZED)) {
                throw new GitHubAuthenticationException("GitHub authentication failed - invalid or expired token");
            } else if (statusCode.equals(HttpStatus.FORBIDDEN)) {
                if (responseBody.contains("rate limit")) {
                    throw new GitHubRateLimitException("GitHub API rate limit exceeded");
                } else {
                    throw new GitHubPermissionException("Insufficient GitHub permissions");
                }
            } else if (statusCode.equals(HttpStatus.NOT_FOUND)) {
                throw new GitHubResourceNotFoundException("GitHub resource not found");
            } else if (statusCode.equals(HttpStatus.UNPROCESSABLE_ENTITY)) {
                throw new GitHubValidationException("GitHub API validation error: " + responseBody);
            } else {
                throw new GitHubApiException("GitHub API error: " + statusCode + " - " + responseBody);
            }
        }
    }

    // Custom GitHub exception classes for better error handling
    public static class GitHubApiException extends RuntimeException {
        public GitHubApiException(String message) {
            super(message);
        }
    }

    public static class GitHubAuthenticationException extends GitHubApiException {
        public GitHubAuthenticationException(String message) {
            super(message);
        }
    }

    public static class GitHubRateLimitException extends GitHubApiException {
        public GitHubRateLimitException(String message) {
            super(message);
        }
    }

    public static class GitHubPermissionException extends GitHubApiException {
        public GitHubPermissionException(String message) {
            super(message);
        }
    }

    public static class GitHubResourceNotFoundException extends GitHubApiException {
        public GitHubResourceNotFoundException(String message) {
            super(message);
        }
    }

    public static class GitHubValidationException extends GitHubApiException {
        public GitHubValidationException(String message) {
            super(message);
        }
    }
}