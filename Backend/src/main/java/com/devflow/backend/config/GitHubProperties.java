// GitHubProperties.java
package com.devflow.backend.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.util.List;

@Configuration
@ConfigurationProperties(prefix = "github")
@Data
public class GitHubProperties {

    private OAuth oauth = new OAuth();
    private Api api = new Api();
    private Webhook webhook = new Webhook();
    private Sync sync = new Sync();

    @Data
    public static class OAuth {
        private String clientId;
        private String clientSecret;
        private String redirectUri;
        private String scope = "repo,user:email";
        private Duration stateExpiration = Duration.ofMinutes(15);
    }

    @Data
    public static class Api {
        private String baseUrl = "https://api.github.com";
        private Duration timeout = Duration.ofSeconds(30);
        private int maxRetries = 3;
        private Duration retryDelay = Duration.ofSeconds(1);
        private int rateLimitBuffer = 100; // Keep this many requests in reserve
    }

    @Data
    public static class Webhook {
        private String secret;
        private List<String> events = List.of("push", "pull_request", "pull_request_review");
        private boolean verifySignature = true;
        private Duration processingTimeout = Duration.ofMinutes(5);
    }

    @Data
    public static class Sync {
        private Duration initialSyncPeriod = Duration.ofDays(30);
        private Duration regularSyncInterval = Duration.ofHours(1);
        private int batchSize = 100;
        private boolean autoLinkTasks = true;
        private boolean autoUpdateTaskStatus = true;
        private List<String> mainBranches = List.of("main", "master", "develop");
    }
}