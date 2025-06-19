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


    private final Map<String, ActivitySubscription> activeSubscriptions = new ConcurrentHashMap<>();
    private final Map<Long, Set<String>> userSubscriptions = new ConcurrentHashMap<>();
    private final Map<Long, Set<String>> projectSubscriptions = new ConcurrentHashMap<>();
    private final Map<Long, Set<String>> taskSubscriptions = new ConcurrentHashMap<>();



    public void broadcastActivity(Activity activity) {
        try {
            ActivityBroadcast broadcast = createActivityBroadcast(activity);


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


    public SubscriptionResponse subscribeToGlobalActivities(User user, String sessionId) {
        String subscriptionId = generateSubscriptionId("global", null, user.getId());

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

        log.info("User {} subscribed to global activities with session {}", user.getUsername(), sessionId);

        return SubscriptionResponse.builder()
                .status("success")
                .message("Subscribed to global activities")
                .subscriptionId(subscriptionId)
                .summary(summary)
                .build();
    }


    public SubscriptionResponse subscribeToProjectActivities(User user, Long projectId, String sessionId) {

        if (!projectRepository.hasUserAccessToProject(user, projectId)) {
            return SubscriptionResponse.builder()
                    .status("error")
                    .message("Access denied to project")
                    .build();
        }

        String subscriptionId = generateSubscriptionId("project", projectId, user.getId());

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

        log.info("User {} subscribed to project {} activities", user.getUsername(), projectId);

        return SubscriptionResponse.builder()
                .status("success")
                .message("Subscribed to project activities")
                .subscriptionId(subscriptionId)
                .summary(summary)
                .build();
    }



    public SubscriptionResponse subscribeToTaskActivities(User user, Long taskId, String sessionId) {

        if (!taskRepository.hasUserAccessToTask(user, taskId)) {
            return SubscriptionResponse.builder()
                    .status("error")
                    .message("Access denied to task")
                    .build();
        }

        String subscriptionId = generateSubscriptionId("task", taskId, user.getId());

        ActivitySubscription subscription = ActivitySubscription.builder()
                .subscriptionId(subscriptionId)
                .userId(user.getId())
                .scope("task")
                .entityId(taskId)
                .subscribedAt(LocalDateTime.now())
                .sessionId(sessionId)
                .build();

        activeSubscriptions.put(subscriptionId, subscription);
        userSubscriptions.computeIfAbsent(user.getId(), k -> ConcurrentHashMap.newKeySet()).add(subscriptionId);
        taskSubscriptions.computeIfAbsent(taskId, k -> ConcurrentHashMap.newKeySet()).add(subscriptionId);


        ActivitySummary summary = getTaskActivitySummary(user, taskId);

        log.info("User {} subscribed to task {} activities", user.getUsername(), taskId);

        return SubscriptionResponse.builder()
                .status("success")
                .message("Subscribed to task activities")
                .subscriptionId(subscriptionId)
                .summary(summary)
                .build();
    }


    public void unsubscribe(String subscriptionId) {
        ActivitySubscription subscription = activeSubscriptions.remove(subscriptionId);

        if (subscription != null) {

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

            log.info("Unsubscribed from activities: {}", subscriptionId);
        }
    }

    public void cleanupUserSession(Long userId, String sessionId) {
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
        List<Activity> activities;

        switch (scope) {
            case "global":
                activities = getGlobalActivities(user, since);
                break;
            case "project":
                activities = getProjectActivities(user, entityId, since);
                break;
            case "task":
                activities = getTaskActivities(user, entityId, since);
                break;
            default:
                activities = new ArrayList<>();
        }

        return activities.stream()
                .map(this::createActivityBroadcast)
                .collect(Collectors.toList());
    }

    public void cleanupStaleSubscriptions() {
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(30);

        activeSubscriptions.entrySet().removeIf(entry -> {
            ActivitySubscription subscription = entry.getValue();
            if (subscription.getSubscribedAt().isBefore(threshold)) {
                log.debug("Removing stale subscription: {}", entry.getKey());
                return true;
            }
            return false;
        });


        projectSubscriptions.values().forEach(subscriptions ->
                subscriptions.removeIf(subId -> !activeSubscriptions.containsKey(subId)));

        taskSubscriptions.values().forEach(subscriptions ->
                subscriptions.removeIf(subId -> !activeSubscriptions.containsKey(subId)));

        userSubscriptions.values().forEach(subscriptions ->
                subscriptions.removeIf(subId -> !activeSubscriptions.containsKey(subId)));

        projectSubscriptions.entrySet().removeIf(entry -> entry.getValue().isEmpty());
        taskSubscriptions.entrySet().removeIf(entry -> entry.getValue().isEmpty());
        userSubscriptions.entrySet().removeIf(entry -> entry.getValue().isEmpty());

        log.debug("Subscription cleanup completed. Active subscriptions: {}", activeSubscriptions.size());
    }



    public void sendHeartbeatToActiveConnections() {
        HeartbeatMessage heartbeat = HeartbeatMessage.builder()
                .timestamp(LocalDateTime.now())
                .build();

        Set<Long> activeUserIds = userSubscriptions.keySet();

        for (Long userId : activeUserIds) {
            try {
                String destination = "/user/" + userId + "/queue/activities/heartbeat";
                messagingTemplate.convertAndSend(destination, heartbeat);
            } catch (Exception e) {
                log.warn("Failed to send heartbeat to user {}: {}", userId, e.getMessage());
            }
        }

        if (!activeUserIds.isEmpty()) {
            log.debug("Sent heartbeat to {} active users", activeUserIds.size());
        }
    }


    public void cleanupInactiveSessions() {
        LocalDateTime inactiveThreshold = LocalDateTime.now().minusMinutes(30);

        List<String> sessionsToRemove = activeSubscriptions.entrySet().stream()
                .filter(entry -> entry.getValue().getSubscribedAt().isBefore(inactiveThreshold))
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());

        for (String subscriptionId : sessionsToRemove) {
            ActivitySubscription subscription = activeSubscriptions.get(subscriptionId);
            if (subscription != null) {
                log.debug("Cleaning up inactive session: user={}, session={}",
                        subscription.getUserId(), subscription.getSessionId());
                unsubscribe(subscriptionId);
            }
        }

        if (!sessionsToRemove.isEmpty()) {
            log.info("Cleaned up {} inactive sessions", sessionsToRemove.size());
        }
    }


    public Map<String, Object> getSubscriptionStatistics() {
        Map<String, Object> stats = new HashMap<>();

        stats.put("totalActiveSubscriptions", activeSubscriptions.size());
        stats.put("uniqueActiveUsers", userSubscriptions.size());
        stats.put("projectSubscriptions", projectSubscriptions.size());
        stats.put("taskSubscriptions", taskSubscriptions.size());


        Map<String, Long> scopeStats = activeSubscriptions.values().stream()
                .collect(Collectors.groupingBy(
                        ActivitySubscription::getScope,
                        Collectors.counting()
                ));
        stats.put("subscriptionsByScope", scopeStats);


        LocalDateTime oldestSubscription = activeSubscriptions.values().stream()
                .map(ActivitySubscription::getSubscribedAt)
                .min(LocalDateTime::compareTo)
                .orElse(null);
        stats.put("oldestSubscriptionTime", oldestSubscription);

        return stats;
    }


    public void forceActivity(Long userId, String message, ActivityType type) {
        ActivityBroadcast broadcast = ActivityBroadcast.builder()
                .activityId(-1L)
                .type(type)
                .description(message)
                .timestamp(LocalDateTime.now())
                .eventId("system_" + System.currentTimeMillis())
                .displayMessage(message)
                .iconType("system")
                .priority("high")
                .color("blue")
                .build();

        String destination = "/user/" + userId + "/queue/activities/global";
        messagingTemplate.convertAndSend(destination, broadcast);

        log.info("Force broadcasted activity to user {}: {}", userId, message);
    }



    public void broadcastSystemAnnouncement(String message, String priority) {
        ActivityBroadcast announcement = ActivityBroadcast.builder()
                .activityId(-1L)
                .type(ActivityType.PROJECT_UPDATED)
                .description(message)
                .timestamp(LocalDateTime.now())
                .eventId("announcement_" + System.currentTimeMillis())
                .displayMessage(message)
                .iconType("megaphone")
                .priority(priority)
                .color("orange")
                .build();


        Set<Long> activeUserIds = userSubscriptions.keySet();
        for (Long userId : activeUserIds) {
            try {
                String destination = "/user/" + userId + "/queue/activities/system";
                messagingTemplate.convertAndSend(destination, announcement);
            } catch (Exception e) {
                log.warn("Failed to send system announcement to user {}: {}", userId, e.getMessage());
            }
        }

        log.info("Broadcasted system announcement to {} users: {}", activeUserIds.size(), message);
    }

    public List<ActivityBroadcast> getActivitiesInRange(User user, String scope, Long entityId,
                                                        LocalDateTime startTime, LocalDateTime endTime,
                                                        List<ActivityType> typeFilters) {
        List<Activity> activities;

        switch (scope) {
            case "global":
                activities = getGlobalActivitiesInRange(user, startTime, endTime);
                break;
            case "project":
                activities = getProjectActivitiesInRange(user, entityId, startTime, endTime);
                break;
            case "task":
                activities = getTaskActivitiesInRange(user, entityId, startTime, endTime);
                break;
            default:
                activities = new ArrayList<>();
        }


        if (typeFilters != null && !typeFilters.isEmpty()) {
            activities = activities.stream()
                    .filter(activity -> typeFilters.contains(activity.getType()))
                    .collect(Collectors.toList());
        }

        return activities.stream()
                .map(this::createActivityBroadcast)
                .collect(Collectors.toList());
    }


    public Map<ActivityType, Long> getActivityCountsByType(User user, String scope, Long entityId,
                                                           LocalDateTime since) {
        List<Activity> activities;

        switch (scope) {
            case "global":
                activities = getGlobalActivities(user, since);
                break;
            case "project":
                activities = getProjectActivities(user, entityId, since);
                break;
            case "task":
                activities = getTaskActivities(user, entityId, since);
                break;
            default:
                activities = new ArrayList<>();
        }

        return activities.stream()
                .collect(Collectors.groupingBy(
                        Activity::getType,
                        Collectors.counting()
                ));
    }



    private void broadcastToGlobalSubscribers(ActivityBroadcast broadcast) {
        if (broadcast.getProject() == null) return;


        Project project = projectRepository.findById(broadcast.getProject().getId()).orElse(null);
        if (project == null) return;

        Set<Long> authorizedUserIds = getProjectAuthorizedUsers(project);

        authorizedUserIds.forEach(userId -> {
            Set<String> userSubs = userSubscriptions.get(userId);
            if (userSubs != null) {
                userSubs.stream()
                        .map(activeSubscriptions::get)
                        .filter(Objects::nonNull)
                        .filter(sub -> "global".equals(sub.getScope()))
                        .forEach(sub -> {
                            String destination = "/user/" + userId + "/queue/activities/global";
                            messagingTemplate.convertAndSend(destination, broadcast);
                        });
            }
        });
    }

    private void broadcastToProjectSubscribers(Long projectId, ActivityBroadcast broadcast) {
        Set<String> subscriptions = projectSubscriptions.get(projectId);
        if (subscriptions != null) {
            subscriptions.forEach(subId -> {
                ActivitySubscription sub = activeSubscriptions.get(subId);
                if (sub != null) {
                    String destination = "/user/" + sub.getUserId() + "/queue/activities/project/" + projectId;
                    messagingTemplate.convertAndSend(destination, broadcast);
                }
            });
        }
    }

    private void broadcastToTaskSubscribers(Long taskId, ActivityBroadcast broadcast) {
        Set<String> subscriptions = taskSubscriptions.get(taskId);
        if (subscriptions != null) {
            subscriptions.forEach(subId -> {
                ActivitySubscription sub = activeSubscriptions.get(subId);
                if (sub != null) {
                    String destination = "/user/" + sub.getUserId() + "/queue/activities/task/" + taskId;
                    messagingTemplate.convertAndSend(destination, broadcast);
                }
            });
        }
    }

    private ActivityBroadcast createActivityBroadcast(Activity activity) {
        String eventId = generateEventId(activity);

        return ActivityBroadcast.builder()
                .activityId(activity.getId())
                .type(activity.getType())
                .description(activity.getDescription())
                .timestamp(activity.getCreatedAt())
                .eventId(eventId)
                .user(mapToUserInfo(activity.getUser()))
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

    private Set<Long> getProjectAuthorizedUsers(Project project) {
        Set<Long> userIds = new HashSet<>();


        userIds.add(project.getOwner().getId());


        List<ProjectMember> members = projectMemberRepository.findByProjectOrderByJoinedAtAsc(project);
        userIds.addAll(members.stream().map(member -> member.getUser().getId()).collect(Collectors.toSet()));

        return userIds;
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

    private List<Activity> getTaskActivities(User user, Long taskId, LocalDateTime since) {
        Task task = taskRepository.findById(taskId).orElse(null);
        if (task == null || !taskRepository.hasUserAccessToTask(user, taskId)) {
            return new ArrayList<>();
        }

        LocalDateTime cutoff = since != null ? since : LocalDateTime.now().minusHours(24);
        return activityRepository.findByTaskOrderByCreatedAtDesc(task).stream()
                .filter(activity -> activity.getCreatedAt().isAfter(cutoff))
                .limit(50)
                .collect(Collectors.toList());
    }

    private ActivitySummary getGlobalActivitySummary(User user) {
        LocalDateTime since = LocalDateTime.now().minusDays(7);
        List<Activity> activities = getGlobalActivities(user, since);

        return ActivitySummary.builder()
                .totalActivities((long) activities.size())
                .unreadActivities((long) activities.size())
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
                .unreadActivities((long) activities.size())
                .lastActivityTime(activities.isEmpty() ? null : activities.get(0).getCreatedAt())
                .scope("project")
                .entityId(projectId)
                .build();
    }

    private ActivitySummary getTaskActivitySummary(User user, Long taskId) {
        LocalDateTime since = LocalDateTime.now().minusDays(7);
        List<Activity> activities = getTaskActivities(user, taskId, since);

        return ActivitySummary.builder()
                .totalActivities((long) activities.size())
                .unreadActivities((long) activities.size())
                .lastActivityTime(activities.isEmpty() ? null : activities.get(0).getCreatedAt())
                .scope("task")
                .entityId(taskId)
                .build();
    }

    private String generateSubscriptionId(String scope, Long entityId, Long userId) {
        return String.format("%s_%s_%s_%d",
                scope,
                entityId != null ? entityId.toString() : "null",
                userId,
                System.currentTimeMillis());
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



    private List<Activity> getGlobalActivitiesInRange(User user, LocalDateTime startTime, LocalDateTime endTime) {
        return activityRepository.findRecentActivitiesByUserProjects(user, startTime, Pageable.unpaged())
                .getContent()
                .stream()
                .filter(activity -> activity.getCreatedAt().isBefore(endTime))
                .collect(Collectors.toList());
    }

    private List<Activity> getProjectActivitiesInRange(User user, Long projectId, LocalDateTime startTime, LocalDateTime endTime) {
        Project project = projectRepository.findById(projectId).orElse(null);
        if (project == null || !projectRepository.hasUserAccessToProject(user, projectId)) {
            return new ArrayList<>();
        }

        return activityRepository.findActivitiesByProjectAndDateRange(project, startTime, endTime);
    }

    private List<Activity> getTaskActivitiesInRange(User user, Long taskId, LocalDateTime startTime, LocalDateTime endTime) {
        Task task = taskRepository.findById(taskId).orElse(null);
        if (task == null || !taskRepository.hasUserAccessToTask(user, taskId)) {
            return new ArrayList<>();
        }

        return activityRepository.findByTaskOrderByCreatedAtDesc(task).stream()
                .filter(activity -> activity.getCreatedAt().isAfter(startTime) &&
                        activity.getCreatedAt().isBefore(endTime))
                .collect(Collectors.toList());
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


        if (activity.getTask() != null) {
            metadata.put("taskStatus", activity.getTask().getStatus().name());
            metadata.put("taskPriority", activity.getTask().getPriority().name());
        }

        if (activity.getProject() != null) {
            metadata.put("projectStatus", activity.getProject().getStatus().name());
            metadata.put("projectPriority", activity.getProject().getPriority().name());
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

}