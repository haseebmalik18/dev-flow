package com.devflow.backend.service;

import com.devflow.backend.entity.GitHubUserToken;
import com.devflow.backend.repository.GitHubUserTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class GitHubTokenCleanupService {

    private final GitHubUserTokenRepository userTokenRepository;

    @Scheduled(fixedRate = 3600000)
    @Transactional
    public void cleanupExpiredTokens() {
        try {
            log.debug("Starting cleanup of expired GitHub tokens");

            List<GitHubUserToken> expiredTokens = userTokenRepository
                    .findByActiveTrueAndExpiresAtBefore(LocalDateTime.now());

            int deactivatedCount = 0;
            for (GitHubUserToken token : expiredTokens) {
                token.deactivate();
                userTokenRepository.save(token);
                deactivatedCount++;
            }

            if (deactivatedCount > 0) {
                log.info("Deactivated {} expired GitHub tokens", deactivatedCount);
            }

        } catch (Exception e) {
            log.error("Failed to cleanup expired GitHub tokens: {}", e.getMessage(), e);
        }
    }

    @Scheduled(cron = "0 0 2 * * ?")
    @Transactional
    public void removeOldInactiveTokens() {
        try {
            log.info("Starting cleanup of old inactive GitHub tokens");

            LocalDateTime cutoff = LocalDateTime.now().minusDays(90);

            List<GitHubUserToken> oldTokens = userTokenRepository
                    .findAll()
                    .stream()
                    .filter(token -> !token.getActive() && token.getUpdatedAt().isBefore(cutoff))
                    .toList();

            userTokenRepository.deleteAll(oldTokens);

            if (!oldTokens.isEmpty()) {
                log.info("Removed {} old inactive GitHub tokens", oldTokens.size());
            }

        } catch (Exception e) {
            log.error("Failed to remove old inactive GitHub tokens: {}", e.getMessage(), e);
        }
    }

    @Scheduled(fixedRate = 43200000)
    @Transactional(readOnly = true)
    public void logTokenStatistics() {
        try {
            long activeTokens = userTokenRepository.countActiveTokens();
            long recentlyUsed = userTokenRepository.countRecentlyUsedTokens(
                    LocalDateTime.now().minusHours(24)
            );

            log.info("GitHub token statistics: {} active tokens, {} used in last 24h",
                    activeTokens, recentlyUsed);

        } catch (Exception e) {
            log.error("Failed to log token statistics: {}", e.getMessage(), e);
        }
    }
}