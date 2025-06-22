// GitHubScheduledTasks.java
package com.devflow.backend.service;

import com.devflow.backend.entity.GitHubConnection;
import com.devflow.backend.entity.GitHubConnectionStatus;
import com.devflow.backend.repository.GitHubConnectionRepository;
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
public class GitHubScheduledTasks {

    private final GitHubConnectionRepository connectionRepository;
    private final GitHubTaskLinkingService taskLinkingService;

    /**
     * Sync active connections every hour
     */
    @Scheduled(fixedRate = 3600000) // 1 hour
    @Transactional
    public void syncActiveConnections() {
        log.info("Starting scheduled sync of active GitHub connections");

        try {
            List<GitHubConnection> activeConnections = connectionRepository
                    .findByStatusOrderByCreatedAtDesc(GitHubConnectionStatus.ACTIVE);

            int syncedCount = 0;
            int errorCount = 0;

            for (GitHubConnection connection : activeConnections) {
                try {
                    // Only sync if last sync was more than 1 hour ago
                    if (connection.getLastSyncAt() == null ||
                            connection.getLastSyncAt().isBefore(LocalDateTime.now().minusHours(1))) {

                        taskLinkingService.syncConnection(connection);
                        connection.setLastSyncAt(LocalDateTime.now());
                        connection.clearErrors();
                        connectionRepository.save(connection);
                        syncedCount++;
                    }
                } catch (Exception e) {
                    log.error("Failed to sync connection {}: {}",
                            connection.getRepositoryFullName(), e.getMessage());
                    connection.recordError("Scheduled sync failed: " + e.getMessage());
                    connectionRepository.save(connection);
                    errorCount++;
                }
            }

            log.info("Scheduled sync completed: {} synced, {} errors out of {} active connections",
                    syncedCount, errorCount, activeConnections.size());

        } catch (Exception e) {
            log.error("Failed to run scheduled GitHub sync: {}", e.getMessage(), e);
        }
    }

    /**
     * Check for stale connections every 6 hours
     */
    @Scheduled(fixedRate = 21600000) // 6 hours
    @Transactional
    public void checkStaleConnections() {
        log.info("Checking for stale GitHub connections");

        try {
            LocalDateTime threshold = LocalDateTime.now().minusHours(24);
            List<GitHubConnection> staleConnections = connectionRepository.findStaleConnections(threshold);

            for (GitHubConnection connection : staleConnections) {
                log.warn("Stale connection detected: {} (last webhook: {})",
                        connection.getRepositoryFullName(), connection.getLastWebhookAt());

                connection.recordError("No webhook activity for 24+ hours");
                connectionRepository.save(connection);
            }

            if (!staleConnections.isEmpty()) {
                log.warn("Found {} stale GitHub connections", staleConnections.size());
            }

        } catch (Exception e) {
            log.error("Failed to check for stale connections: {}", e.getMessage(), e);
        }
    }

    /**
     * Clean up old disconnected connections daily
     */
    @Scheduled(cron = "0 2 0 * * ?") // 2 AM daily
    @Transactional
    public void cleanupOldConnections() {
        log.info("Cleaning up old disconnected GitHub connections");

        try {
            LocalDateTime cutoff = LocalDateTime.now().minusDays(30);
            connectionRepository.deleteOldDisconnectedConnections(cutoff);
            log.info("Cleaned up disconnected connections older than {}", cutoff);

        } catch (Exception e) {
            log.error("Failed to cleanup old connections: {}", e.getMessage(), e);
        }
    }

    /**
     * Health check for all connections every 30 minutes
     */
    @Scheduled(fixedRate = 1800000) // 30 minutes
    @Transactional(readOnly = true)
    public void healthCheckConnections() {
        try {
            LocalDateTime recentThreshold = LocalDateTime.now().minusHours(1);
            Object healthStats = connectionRepository.getHealthStatistics(recentThreshold);

            // Log health statistics for monitoring
            log.debug("GitHub connections health check completed: {}", healthStats);

        } catch (Exception e) {
            log.error("Failed to perform health check: {}", e.getMessage(), e);
        }
    }
}