package com.devflow.backend.dto.realtime;

import com.devflow.backend.entity.ActivityType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

public class ActivityBroadcastDTOs {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ActivityBroadcast {
        private Long activityId;
        private ActivityType type;
        private String description;
        private LocalDateTime timestamp;
        private String eventId;

        private UserInfo user;
        private ProjectInfo project;
        private TaskInfo task;
        private String targetEntity;
        private Long targetEntityId;

        private Map<String, Object> metadata;
        private String changeType;
        private Map<String, Object> oldValues;
        private Map<String, Object> newValues;

        private String displayMessage;
        private String iconType;
        private String priority;
        private String color;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserInfo {
        private Long id;
        private String username;
        private String firstName;
        private String lastName;
        private String fullName;
        private String avatar;
        private String initials;
        private String jobTitle;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProjectInfo {
        private Long id;
        private String name;
        private String color;
        private String status;
        private String priority;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TaskInfo {
        private Long id;
        private String title;
        private String status;
        private String priority;
        private LocalDateTime dueDate;
        private Integer progress;
        private Boolean isOverdue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ActivitySubscription {
        private String subscriptionId;
        private Long userId;
        private String scope;
        private Long entityId;
        private LocalDateTime subscribedAt;
        private String sessionId;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubscriptionRequest {
        private String scope;
        private Long entityId;
        private LocalDateTime lastSeen;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubscriptionResponse {
        private String status;
        private String message;
        private String subscriptionId;
        private ActivitySummary summary;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ActivitySummary {
        private Long totalActivities;
        private LocalDateTime lastActivityTime;
        private String scope;
        private Long entityId;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BulkActivityUpdate {
        private String updateType;
        private Long affectedCount;
        private String description;
        private UserInfo performedBy;
        private ProjectInfo project;
        private LocalDateTime timestamp;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ActivityError {
        private String error;
        private String message;
        private String subscriptionId;
        private LocalDateTime timestamp;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HeartbeatMessage {
        private String type = "heartbeat";
        private LocalDateTime timestamp;
        private String sessionId;
        private Long userId;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConnectionStatus {
        private String status;
        private String sessionId;
        private LocalDateTime timestamp;
        private Integer activeSubscriptions;
        private String message;
    }
}