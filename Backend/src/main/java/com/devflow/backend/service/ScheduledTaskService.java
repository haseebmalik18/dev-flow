package com.devflow.backend.service;

import com.devflow.backend.entity.Activity;
import com.devflow.backend.entity.ActivityType;
import com.devflow.backend.repository.ActivityRepository;
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
public class ScheduledTaskService {

    private final ActivityRepository activityRepository;
    private final RealtimeActivityService realtimeActivityService;

    @Scheduled(cron = "0 0 2 * * ?")
    @Transactional
    public void cleanupOldActivities() {
        log.info("Starting cleanup of old activities");

        try {
            LocalDateTime cutoff = LocalDateTime.now().minusDays(30);

            List<Activity> oldActivities = activityRepository.findAll().stream()
                    .filter(activity -> activity.getCreatedAt().isBefore(cutoff))
                    .filter(activity -> !isImportantActivity(activity))
                    .toList();

            if (!oldActivities.isEmpty()) {
                activityRepository.deleteAll(oldActivities);
                log.info("Cleaned up {} old activities", oldActivities.size());
            } else {
                log.info("No old activities to clean up");
            }

        } catch (Exception e) {
            log.error("Failed to cleanup old activities: {}", e.getMessage(), e);
        }
    }

    @Scheduled(fixedRate = 3600000)
    public void cleanupStaleSubscriptions() {
        try {
            realtimeActivityService.cleanupStaleSubscriptions();

        } catch (Exception e) {
            log.error("Failed to cleanup stale subscriptions: {}", e.getMessage(), e);
        }
    }

    @Scheduled(fixedRate = 30000)
    public void sendHeartbeat() {
        try {
            realtimeActivityService.sendHeartbeatToActiveConnections();

        } catch (Exception e) {
            log.error("Failed to send heartbeat: {}", e.getMessage(), e);
        }
    }

    @Scheduled(cron = "0 0 6 * * ?")
    @Transactional(readOnly = true)
    public void generateDailyActivitySummary() {
        log.info("Generating daily activity summary");

        try {
            LocalDateTime yesterday = LocalDateTime.now().minusDays(1);
            LocalDateTime startOfDay = yesterday.toLocalDate().atStartOfDay();
            LocalDateTime endOfDay = yesterday.toLocalDate().atTime(23, 59, 59);

            List<Activity> yesterdayActivities = activityRepository.findAll().stream()
                    .filter(activity -> activity.getCreatedAt().isAfter(startOfDay) &&
                            activity.getCreatedAt().isBefore(endOfDay))
                    .toList();

            if (!yesterdayActivities.isEmpty()) {
                long totalActivities = yesterdayActivities.size();
                long uniqueUsers = yesterdayActivities.stream()
                        .map(activity -> activity.getUser().getId())
                        .distinct()
                        .count();
                long uniqueProjects = yesterdayActivities.stream()
                        .filter(activity -> activity.getProject() != null)
                        .map(activity -> activity.getProject().getId())
                        .distinct()
                        .count();

                log.info("Daily summary for {}: {} activities, {} users, {} projects",
                        yesterday.toLocalDate(), totalActivities, uniqueUsers, uniqueProjects);
            }

        } catch (Exception e) {
            log.error("Failed to generate daily activity summary: {}", e.getMessage(), e);
        }
    }

    @Scheduled(fixedRate = 900000)
    public void cleanupInactiveSessions() {
        try {
            realtimeActivityService.cleanupInactiveSessions();

        } catch (Exception e) {
            log.error("Failed to cleanup inactive sessions: {}", e.getMessage(), e);
        }
    }

    private boolean isImportantActivity(Activity activity) {
        return activity.getType() == ActivityType.PROJECT_CREATED ||
                activity.getType() == ActivityType.PROJECT_COMPLETED ||
                activity.getType() == ActivityType.TASK_COMPLETED ||
                activity.getType() == ActivityType.MEMBER_ADDED ||
                activity.getType() == ActivityType.MILESTONE_REACHED;
    }
}