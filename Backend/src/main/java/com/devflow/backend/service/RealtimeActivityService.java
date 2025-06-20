package com.devflow.backend.service;

import com.devflow.backend.dto.realtime.ActivityBroadcastDTOs.*;
import com.devflow.backend.entity.*;
import com.devflow.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class RealtimeActivityService {

    private final SimpMessagingTemplate messagingTemplate;
    private final ActivityRepository activityRepository;
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final UserRepository userRepository;

    private final Map<String, ActivitySubscription> activeSubscriptions = new ConcurrentHashMap<>();
    private final Map<Long, Set<String>> userSubscriptions = new ConcurrentHashMap<>();
    private final Map<Long, Set<String>> projectSubscriptions = new ConcurrentHashMap<>();
    private final Map<Long, Set<String>> taskSubscriptions = new ConcurrentHashMap<>();

    public void broadcastActivity(Activity activity) {
        try {
            ActivityBroadcast broadcast = createActivityBroadcast(activity);

            log.debug("Broadcasting activity: {} to all subscribers", activity.getId());

            broadcastToGlobalSubscribers(broadcast);

            if (activity.getProject() != null) {
                broadcastToProjectSubscribers(activity.getProject().getId(), broadcast);
            }

            if (activity.getTask() != null) {
                broadcastToTaskSubscribers(activity.getTask().getId(), broadcast);
            }

            log.debug("Activity broadcast completed for activity: {}", activity.getId());

        } catch (Exception e) {
            log.error("Failed to broadcast activity {}: {}", activity.getId(), e.getMessage(), e);
        }
    }

    private void broadcastToGlobalSubscribers(ActivityBroadcast broadcast) {
        log.debug("Broadcasting to global subscribers...");

        Set<Long> globalSubscriberUserIds = userSubscriptions.entrySet().stream()
                .filter(entry -> {
                    Set<String> userSubs = entry.getValue();
                    return userSubs.stream()
                            .map(activeSubscriptions::get)
                            .filter(Objects::nonNull)
                            .anyMatch(sub -> "global".equals(sub.getScope()));
                })
                .map(Map.Entry::getKey)
                .collect(Collectors.toSet());

        if (globalSubscriberUserIds.isEmpty()) {
            log.debug("No global subscribers found");
            return;
        }

        Set<Long> authorizedUserIds = globalSubscriberUserIds;
        if (broadcast.getProject() != null) {
            Project project = projectRepository.findById(broadcast.getProject().getId()).orElse(null);
            if (project != null) {
                Set<Long> projectAuthorizedUserIds = getProjectAuthorizedUsers(project);
                authorizedUserIds = globalSubscriberUserIds.stream()
                        .filter(projectAuthorizedUserIds::contains)
                        .collect(Collectors.toSet());
            }
        }

        log.debug("Broadcasting to {} authorized global subscribers", authorizedUserIds.size());

        authorizedUserIds.forEach(userId -> {
            try {
                Optional<User> userOpt = userRepository.findById(userId);
                if (userOpt.isPresent()) {
                    String username = userOpt.get().getUsername();

                    messagingTemplate.convertAndSendToUser(
                            username,
                            "/queue/activities/global",
                            broadcast
                    );

                    log.debug("Sent activity to user {} (username: {}) at destination: /user/{}/queue/activities/global",
                            userId, username, username);
                } else {
                    log.warn("User {} not found when broadcasting activity", userId);
                }
            } catch (Exception e) {
                log.error("Failed to send activity to user {}: {}", userId, e.getMessage());
            }
        });
    }

    private void broadcastToProjectSubscribers(Long projectId, ActivityBroadcast broadcast) {
        Set<String> subscriptions = projectSubscriptions.get(projectId);
        if (subscriptions != null && !subscriptions.isEmpty()) {
            log.debug("Broadcasting to {} project {} subscribers", subscriptions.size(), projectId);

            subscriptions.forEach(subId -> {
                ActivitySubscription sub = activeSubscriptions.get(subId);
                if (sub != null) {
                    try {
                        Optional<User> userOpt = userRepository.findById(sub.getUserId());
                        if (userOpt.isPresent()) {
                            String username = userOpt.get().getUsername();

                            messagingTemplate.convertAndSendToUser(
                                    username,
                                    "/queue/activities/project/" + projectId,
                                    broadcast
                            );
                            log.debug("Sent project activity to user {} (username: {})", sub.getUserId(), username);
                        }
                    } catch (Exception e) {
                        log.error("Failed to send project activity to user {}: {}", sub.getUserId(), e.getMessage());
                    }
                }
            });
        }
    }

    private void broadcastToTaskSubscribers(Long taskId, ActivityBroadcast broadcast) {
        Set<String> subscriptions = taskSubscriptions.get(taskId);
        if (subscriptions != null && !subscriptions.isEmpty()) {
            log.debug("Broadcasting to {} task {} subscribers", subscriptions.size(), taskId);

            subscriptions.forEach(subId -> {
                ActivitySubscription sub = activeSubscriptions.get(subId);
                if (sub != null) {
                    try {
                        Optional<User> userOpt = userRepository.findById(sub.getUserId());
                        if (userOpt.isPresent()) {
                            String username = userOpt.get().getUsername();

                            messagingTemplate.convertAndSendToUser(
                                    username,
                                    "/queue/activities/task/" + taskId,
                                    broadcast
                            );
                            log.debug("Sent task activity to user {} (username: {})", sub.getUserId(), username);
                        }
                    } catch (Exception e) {
                        log.error("Failed to send task activity to user {}: {}", sub.getUserId(), e.getMessage());
                    }
                }
            });
        }
    }

    public SubscriptionResponse subscribeToGlobalActivities(User user, String sessionId) {
        String subscriptionId = generateSubscriptionId("global", null, user.getId());

        log.info("User {} subscribing to global activities (session: {})", user.getUsername(), sessionId);

        ActivitySubscription subscription = ActivitySubscription.builder()
                .subscriptionId(subscriptionId)
                .userId(user.getId())
                .scope("global")
                .entityId(null)
                .subscribedAt(LocalDateTime.now())
                .sessionId(sessionId)
                .build();

        activeSubscriptions.put(subscriptionId, subscription);
        userSubscriptions.computeIfAbsent(user.getId(), k -> ConcurrentHashMap.newKeySet()).add(subscriptionId);

        ActivitySummary summary = getGlobalActivitySummary(user);

        log.info("User {} successfully subscribed to global activities", user.getUsername());

        return SubscriptionResponse.builder()
                .status("success")
                .message("Subscribed to global activities")
                .subscriptionId(subscriptionId)
                .summary(summary)
                .build();
    }

    public SubscriptionResponse subscribeToProjectActivities(User user, Long projectId, String sessionId) {
        if (!projectRepository.hasUserAccessToProject(user, projectId)) {
            log.warn("User {} denied access to project {}", user.getUsername(), projectId);
            return SubscriptionResponse.builder()
                    .status("error")
                    .message("Access denied to project")
                    .build();
        }

        String subscriptionId = generateSubscriptionId("project", projectId, user.getId());

        log.info("User {} subscribing to project {} activities", user.getUsername(), projectId);

        ActivitySubscription subscription = ActivitySubscription.builder()
                .subscriptionId(subscriptionId)
                .userId(user.getId())
                .scope("project")
                .entityId(projectId)
                .subscribedAt(LocalDateTime.now())
                .sessionId(sessionId)
                .build();

        activeSubscriptions.put(subscriptionId, subscription);
        userSubscriptions.computeIfAbsent(user.getId(), k -> ConcurrentHashMap.newKeySet()).add(subscriptionId);
        projectSubscriptions.computeIfAbsent(projectId, k -> ConcurrentHashMap.newKeySet()).add(subscriptionId);

        ActivitySummary summary = getProjectActivitySummary(user, projectId);

        log.info("User {} successfully subscribed to project {} activities", user.getUsername(), projectId);

        return SubscriptionResponse.builder()
                .status("success")
                .message("Subscribed to project activities")
                .subscriptionId(subscriptionId)
                .summary(summary)
                .build();
    }

    public void unsubscribe(String subscriptionId) {
        ActivitySubscription subscription = activeSubscriptions.remove(subscriptionId);

        if (subscription != null) {
            log.info("Unsubscribing: {}", subscriptionId);

            Set<String> userSubs = userSubscriptions.get(subscription.getUserId());
            if (userSubs != null) {
                userSubs.remove(subscriptionId);
                if (userSubs.isEmpty()) {
                    userSubscriptions.remove(subscription.getUserId());
                }
            }

            if ("project".equals(subscription.getScope()) && subscription.getEntityId() != null) {
                Set<String> projectSubs = projectSubscriptions.get(subscription.getEntityId());
                if (projectSubs != null) {
                    projectSubs.remove(subscriptionId);
                    if (projectSubs.isEmpty()) {
                        projectSubscriptions.remove(subscription.getEntityId());
                    }
                }
            } else if ("task".equals(subscription.getScope()) && subscription.getEntityId() != null) {
                Set<String> taskSubs = taskSubscriptions.get(subscription.getEntityId());
                if (taskSubs != null) {
                    taskSubs.remove(subscriptionId);
                    if (taskSubs.isEmpty()) {
                        taskSubscriptions.remove(subscription.getEntityId());
                    }
                }
            }

            log.info("Successfully unsubscribed: {}", subscriptionId);
        } else {
            log.warn("Subscription not found: {}", subscriptionId);
        }
    }

    public void cleanupUserSession(Long userId, String sessionId) {
        log.info("Cleaning up session for user {} (session: {})", userId, sessionId);

        Set<String> userSubs = userSubscriptions.get(userId);
        if (userSubs != null) {
            List<String> toRemove = userSubs.stream()
                    .filter(subId -> {
                        ActivitySubscription sub = activeSubscriptions.get(subId);
                        return sub != null && sessionId.equals(sub.getSessionId());
                    })
                    .collect(Collectors.toList());

            toRemove.forEach(this::unsubscribe);

            log.info("Cleaned up {} subscriptions for user {} session {}", toRemove.size(), userId, sessionId);
        }
    }

    public List<ActivityBroadcast> getRecentActivities(User user, String scope, Long entityId, LocalDateTime since) {
        try {
            List<Activity> activities;

            if ("global".equals(scope)) {
                activities = getGlobalActivities(user, since);
            } else if ("project".equals(scope) && entityId != null) {
                activities = getProjectActivities(user, entityId, since);
            } else {
                log.warn("Invalid scope or entityId for recent activities: scope={}, entityId={}", scope, entityId);
                return new ArrayList<>();
            }

            return activities.stream()
                    .map(this::createActivityBroadcast)
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("Failed to get recent activities for user {} (scope: {}, entityId: {}): {}",
                    user.getUsername(), scope, entityId, e.getMessage(), e);
            return new ArrayList<>();
        }
    }

    private Set<Long> getProjectAuthorizedUsers(Project project) {
        Set<Long> userIds = new HashSet<>();
        userIds.add(project.getOwner().getId());

        List<ProjectMember> members = projectMemberRepository.findByProjectOrderByJoinedAtAsc(project);
        userIds.addAll(members.stream().map(member -> member.getUser().getId()).collect(Collectors.toSet()));

        return userIds;
    }

    private String generateSubscriptionId(String scope, Long entityId, Long userId) {
        return String.format("%s_%s_%s_%d",
                scope,
                entityId != null ? entityId.toString() : "null",
                userId,
                System.currentTimeMillis());
    }

    private ActivityBroadcast createActivityBroadcast(Activity activity) {
        String eventId = generateEventId(activity);

        return ActivityBroadcast.builder()
                .activityId(activity.getId())
                .type(activity.getType())
                .description(activity.getDescription())
                .timestamp(activity.getCreatedAt())
                .eventId(eventId)
                .user(activity.getUser() != null ? mapToUserInfo(activity.getUser()) : null)
                .project(activity.getProject() != null ? mapToProjectInfo(activity.getProject()) : null)
                .task(activity.getTask() != null ? mapToTaskInfo(activity.getTask()) : null)
                .targetEntity(determineTargetEntity(activity))
                .targetEntityId(determineTargetEntityId(activity))
                .metadata(extractMetadata(activity))
                .changeType(determineChangeType(activity))
                .displayMessage(generateDisplayMessage(activity))
                .iconType(determineIconType(activity))
                .priority(determinePriority(activity))
                .color(determineColor(activity))
                .build();
    }

    private String generateEventId(Activity activity) {
        return String.format("activity_%d_%d", activity.getId(), activity.getCreatedAt().toEpochSecond(
                java.time.ZoneOffset.UTC));
    }

    private UserInfo mapToUserInfo(User user) {
        return UserInfo.builder()
                .id(user.getId())
                .username(user.getUsername())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .fullName(user.getFullName())
                .avatar(user.getAvatar())
                .initials(user.getInitials())
                .jobTitle(user.getJobTitle())
                .build();
    }

    private ProjectInfo mapToProjectInfo(Project project) {
        return ProjectInfo.builder()
                .id(project.getId())
                .name(project.getName())
                .color(project.getColor())
                .status(project.getStatus().name())
                .priority(project.getPriority().name())
                .build();
    }

    private TaskInfo mapToTaskInfo(Task task) {
        return TaskInfo.builder()
                .id(task.getId())
                .title(task.getTitle())
                .status(task.getStatus().name())
                .priority(task.getPriority().name())
                .dueDate(task.getDueDate())
                .progress(task.getProgress())
                .isOverdue(task.isOverdue())
                .build();
    }

    private ActivitySummary getGlobalActivitySummary(User user) {
        LocalDateTime since = LocalDateTime.now().minusDays(7);
        List<Activity> activities = getGlobalActivities(user, since);

        return ActivitySummary.builder()
                .totalActivities((long) activities.size())
                .lastActivityTime(activities.isEmpty() ? null : activities.get(0).getCreatedAt())
                .scope("global")
                .entityId(null)
                .build();
    }

    private ActivitySummary getProjectActivitySummary(User user, Long projectId) {
        LocalDateTime since = LocalDateTime.now().minusDays(7);
        List<Activity> activities = getProjectActivities(user, projectId, since);

        return ActivitySummary.builder()
                .totalActivities((long) activities.size())
                .lastActivityTime(activities.isEmpty() ? null : activities.get(0).getCreatedAt())
                .scope("project")
                .entityId(projectId)
                .build();
    }

    private List<Activity> getGlobalActivities(User user, LocalDateTime since) {
        LocalDateTime cutoff = since != null ? since : LocalDateTime.now().minusHours(24);
        return activityRepository.findRecentActivitiesByUserProjects(user, cutoff,
                org.springframework.data.domain.PageRequest.of(0, 50)).getContent();
    }

    private List<Activity> getProjectActivities(User user, Long projectId, LocalDateTime since) {
        Project project = projectRepository.findById(projectId).orElse(null);
        if (project == null || !projectRepository.hasUserAccessToProject(user, projectId)) {
            return new ArrayList<>();
        }

        LocalDateTime cutoff = since != null ? since : LocalDateTime.now().minusHours(24);
        return activityRepository.findActivitiesByProjectAndDateRange(project, cutoff, LocalDateTime.now());
    }

    private String determineTargetEntity(Activity activity) {
        if (activity.getTask() != null) return "task";
        if (activity.getProject() != null) return "project";
        return "system";
    }

    private Long determineTargetEntityId(Activity activity) {
        if (activity.getTask() != null) return activity.getTask().getId();
        if (activity.getProject() != null) return activity.getProject().getId();
        return null;
    }

    private Map<String, Object> extractMetadata(Activity activity) {
        Map<String, Object> metadata = new HashMap<>();
        if (activity.getMetadata() != null) {
            try {
                metadata.put("raw", activity.getMetadata());
            } catch (Exception e) {
                log.warn("Failed to parse activity metadata: {}", e.getMessage());
            }
        }
        return metadata;
    }

    private String determineChangeType(Activity activity) {
        String typeName = activity.getType().name().toLowerCase();
        if (typeName.contains("created")) return "created";
        if (typeName.contains("updated") || typeName.contains("changed")) return "updated";
        if (typeName.contains("deleted") || typeName.contains("removed")) return "deleted";
        if (typeName.contains("completed")) return "completed";
        if (typeName.contains("assigned")) return "assigned";
        if (typeName.contains("added")) return "added";
        return "modified";
    }

    private String generateDisplayMessage(Activity activity) {
        String baseMessage = activity.getDescription();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime activityTime = activity.getCreatedAt();
        long minutesAgo = java.time.Duration.between(activityTime, now).toMinutes();

        String timeInfo;
        if (minutesAgo < 1) {
            timeInfo = "just now";
        } else if (minutesAgo < 60) {
            timeInfo = minutesAgo + " minute" + (minutesAgo == 1 ? "" : "s") + " ago";
        } else if (minutesAgo < 1440) {
            long hoursAgo = minutesAgo / 60;
            timeInfo = hoursAgo + " hour" + (hoursAgo == 1 ? "" : "s") + " ago";
        } else {
            long daysAgo = minutesAgo / 1440;
            timeInfo = daysAgo + " day" + (daysAgo == 1 ? "" : "s") + " ago";
        }

        return baseMessage + " • " + timeInfo;
    }

    private String determineIconType(Activity activity) {
        switch (activity.getType()) {
            case TASK_CREATED:
            case TASK_UPDATED:
                return "task";
            case TASK_COMPLETED:
                return "check-circle";
            case TASK_ASSIGNED:
                return "user-plus";
            case PROJECT_CREATED:
            case PROJECT_UPDATED:
                return "folder";
            case COMMENT_ADDED:
                return "message-circle";
            case FILE_UPLOADED:
                return "file-plus";
            case MEMBER_ADDED:
                return "users";
            case TASK_STATUS_CHANGED:
                return "refresh-cw";
            case TASK_PRIORITY_CHANGED:
                return "alert-triangle";
            default:
                return "activity";
        }
    }

    private String determinePriority(Activity activity) {
        switch (activity.getType()) {
            case TASK_ASSIGNED:
            case COMMENT_MENTIONED:
            case DEADLINE_MISSED:
                return "high";
            case TASK_COMPLETED:
            case TASK_STATUS_CHANGED:
            case COMMENT_ADDED:
                return "medium";
            case PROJECT_UPDATED:
            case TASK_UPDATED:
            case FILE_UPLOADED:
                return "low";
            default:
                return "medium";
        }
    }

    private String determineColor(Activity activity) {
        switch (activity.getType()) {
            case TASK_COMPLETED:
                return "green";
            case TASK_ASSIGNED:
            case TASK_CREATED:
                return "blue";
            case TASK_STATUS_CHANGED:
                return "orange";
            case COMMENT_ADDED:
                return "purple";
            case FILE_UPLOADED:
                return "cyan";
            case MEMBER_ADDED:
                return "indigo";
            case PROJECT_CREATED:
                return "emerald";
            case DEADLINE_MISSED:
                return "red";
            default:
                return "gray";
        }
    }

    public void cleanupStaleSubscriptions() {
        try {
            log.debug("Cleaning up stale subscriptions...");

            LocalDateTime cutoff = LocalDateTime.now().minusMinutes(30);
            List<String> staleSubscriptions = activeSubscriptions.entrySet().stream()
                    .filter(entry -> entry.getValue().getSubscribedAt().isBefore(cutoff))
                    .map(Map.Entry::getKey)
                    .collect(Collectors.toList());

            if (!staleSubscriptions.isEmpty()) {
                log.info("Removing {} stale subscriptions", staleSubscriptions.size());
                staleSubscriptions.forEach(this::unsubscribe);
            }

            log.debug("Stale subscription cleanup completed");
        } catch (Exception e) {
            log.error("Failed to cleanup stale subscriptions: {}", e.getMessage(), e);
        }
    }

    public void sendHeartbeatToActiveConnections() {
        try {
            log.debug("Sending heartbeat to active connections...");

            HeartbeatMessage heartbeat = HeartbeatMessage.builder()
                    .type("heartbeat")
                    .timestamp(LocalDateTime.now())
                    .build();

            activeSubscriptions.values().stream()
                    .map(ActivitySubscription::getUserId)
                    .distinct()
                    .forEach(userId -> {
                        try {
                            Optional<User> userOpt = userRepository.findById(userId);
                            if (userOpt.isPresent()) {
                                String username = userOpt.get().getUsername();
                                messagingTemplate.convertAndSendToUser(
                                        username,
                                        "/queue/activities/heartbeat",
                                        heartbeat
                                );
                            }
                        } catch (Exception e) {
                            log.warn("Failed to send heartbeat to user {}: {}", userId, e.getMessage());
                        }
                    });

            log.debug("Heartbeat sent to {} active users",
                    activeSubscriptions.values().stream().map(ActivitySubscription::getUserId).distinct().count());
        } catch (Exception e) {
            log.error("Failed to send heartbeat: {}", e.getMessage(), e);
        }
    }

    public void cleanupInactiveSessions() {
        try {
            log.debug("Cleaning up inactive sessions...");

            LocalDateTime cutoff = LocalDateTime.now().minusHours(2);
            List<String> inactiveSessions = activeSubscriptions.entrySet().stream()
                    .filter(entry -> entry.getValue().getSubscribedAt().isBefore(cutoff))
                    .map(entry -> entry.getValue().getSessionId())
                    .distinct()
                    .collect(Collectors.toList());

            if (!inactiveSessions.isEmpty()) {
                log.info("Cleaning up {} inactive sessions", inactiveSessions.size());
                inactiveSessions.forEach(sessionId -> {
                    try {
                        List<String> sessionSubscriptions = activeSubscriptions.entrySet().stream()
                                .filter(entry -> sessionId.equals(entry.getValue().getSessionId()))
                                .map(Map.Entry::getKey)
                                .collect(Collectors.toList());

                        sessionSubscriptions.forEach(this::unsubscribe);
                    } catch (Exception e) {
                        log.warn("Failed to cleanup session {}: {}", sessionId, e.getMessage());
                    }
                });
            }

            log.debug("Inactive session cleanup completed");
        } catch (Exception e) {
            log.error("Failed to cleanup inactive sessions: {}", e.getMessage(), e);
        }
    }

    public Map<String, Object> getSubscriptionStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalActiveSubscriptions", activeSubscriptions.size());
        stats.put("totalUsersWithSubscriptions", userSubscriptions.size());
        stats.put("totalProjectSubscriptions", projectSubscriptions.size());
        stats.put("totalTaskSubscriptions", taskSubscriptions.size());

        Map<String, Long> scopeBreakdown = activeSubscriptions.values().stream()
                .collect(Collectors.groupingBy(ActivitySubscription::getScope, Collectors.counting()));
        stats.put("subscriptionsByScope", scopeBreakdown);

        return stats;
    }
}