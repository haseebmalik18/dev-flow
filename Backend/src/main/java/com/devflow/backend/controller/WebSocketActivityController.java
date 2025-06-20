package com.devflow.backend.controller;

import com.devflow.backend.dto.realtime.ActivityBroadcastDTOs.*;
import com.devflow.backend.entity.ActivityType;
import com.devflow.backend.entity.User;
import com.devflow.backend.service.RealtimeActivityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Controller
@RequiredArgsConstructor
@Slf4j
public class WebSocketActivityController {

    private final RealtimeActivityService realtimeActivityService;
    private final SimpMessagingTemplate messagingTemplate;

    private final Map<String, SessionInfo> activeSessions = new ConcurrentHashMap<>();

    @MessageMapping("/subscribe/global")
    @SendToUser("/queue/activities/response")
    public SubscriptionResponse subscribeToGlobalActivities(
            @Payload(required = false) SubscriptionRequest request,
            SimpMessageHeaderAccessor headerAccessor,
            Principal principal) {

        String sessionId = headerAccessor.getSessionId();

        try {
            User user = extractUserFromPrincipal(principal);
            if (user == null) {
                log.warn("No authenticated user found for global subscription (session: {})", sessionId);
                return createErrorResponse("Authentication required", null);
            }

            log.info("User {} subscribing to global activities (session: {})",
                    user.getUsername(), sessionId);

            activeSessions.put(sessionId, new SessionInfo(user.getId(), sessionId, LocalDateTime.now()));

            SubscriptionResponse response = realtimeActivityService.subscribeToGlobalActivities(user, sessionId);

            if (request != null && request.getLastSeen() != null) {
                sendRecentActivitiesAsync(user, "global", null, request.getLastSeen(), sessionId);
            }

            log.info("User {} successfully subscribed to global activities", user.getUsername());
            return response;

        } catch (Exception e) {
            log.error("Failed to subscribe to global activities (session: {}): {}",
                    sessionId, e.getMessage(), e);
            return createErrorResponse("Failed to subscribe: " + e.getMessage(), null);
        }
    }

    @MessageMapping("/subscribe/project/{projectId}")
    @SendToUser("/queue/activities/response")
    public SubscriptionResponse subscribeToProjectActivities(
            @DestinationVariable Long projectId,
            @Payload(required = false) SubscriptionRequest request,
            SimpMessageHeaderAccessor headerAccessor,
            Principal principal) {

        String sessionId = headerAccessor.getSessionId();

        try {
            User user = extractUserFromPrincipal(principal);
            if (user == null) {
                log.warn("No authenticated user found for project subscription (session: {})", sessionId);
                return createErrorResponse("Authentication required", null);
            }

            log.info("User {} subscribing to project {} activities (session: {})",
                    user.getUsername(), projectId, sessionId);

            activeSessions.put(sessionId, new SessionInfo(user.getId(), sessionId, LocalDateTime.now()));

            SubscriptionResponse response = realtimeActivityService.subscribeToProjectActivities(user, projectId, sessionId);

            if (request != null && request.getLastSeen() != null) {
                sendRecentActivitiesAsync(user, "project", projectId, request.getLastSeen(), sessionId);
            }

            log.info("User {} successfully subscribed to project {} activities", user.getUsername(), projectId);
            return response;

        } catch (Exception e) {
            log.error("Failed to subscribe to project {} activities (session: {}): {}",
                    projectId, sessionId, e.getMessage(), e);
            return createErrorResponse("Failed to subscribe: " + e.getMessage(), null);
        }
    }

    @MessageMapping("/heartbeat")
    @SendToUser("/queue/activities/heartbeat")
    public HeartbeatMessage heartbeat(
            @Payload(required = false) HeartbeatMessage message,
            SimpMessageHeaderAccessor headerAccessor,
            Principal principal) {

        String sessionId = headerAccessor.getSessionId();

        try {
            User user = extractUserFromPrincipal(principal);
            if (user == null) {
                return HeartbeatMessage.builder()
                        .timestamp(LocalDateTime.now())
                        .build();
            }

            SessionInfo sessionInfo = activeSessions.get(sessionId);
            if (sessionInfo != null) {
                sessionInfo.lastActivity = LocalDateTime.now();
            }

            log.debug("Heartbeat from user {} (session: {})", user.getUsername(), sessionId);

            return HeartbeatMessage.builder()
                    .timestamp(LocalDateTime.now())
                    .sessionId(sessionId)
                    .userId(user.getId())
                    .build();

        } catch (Exception e) {
            log.error("Heartbeat error (session: {}): {}", sessionId, e.getMessage());
            return HeartbeatMessage.builder()
                    .timestamp(LocalDateTime.now())
                    .build();
        }
    }

    @MessageMapping("/unsubscribe/{subscriptionId}")
    @SendToUser("/queue/activities/response")
    public SubscriptionResponse unsubscribeFromActivities(
            @DestinationVariable String subscriptionId,
            Principal principal) {

        try {
            User user = extractUserFromPrincipal(principal);
            if (user == null) {
                return createErrorResponse("Authentication required", subscriptionId);
            }

            log.info("User {} unsubscribing from {}", user.getUsername(), subscriptionId);

            realtimeActivityService.unsubscribe(subscriptionId);

            return SubscriptionResponse.builder()
                    .status("success")
                    .message("Unsubscribed successfully")
                    .subscriptionId(subscriptionId)
                    .build();

        } catch (Exception e) {
            log.error("Failed to unsubscribe from {}: {}", subscriptionId, e.getMessage());
            return createErrorResponse("Failed to unsubscribe: " + e.getMessage(), subscriptionId);
        }
    }

    @MessageMapping("/status")
    @SendToUser("/queue/activities/status")
    public Map<String, Object> getSubscriptionStatus(Principal principal) {
        try {
            User user = extractUserFromPrincipal(principal);
            if (user == null) {
                return Map.of("error", "Authentication required");
            }

            return Map.of(
                    "status", "connected",
                    "userId", user.getId(),
                    "username", user.getUsername(),
                    "timestamp", LocalDateTime.now(),
                    "message", "WebSocket connection active"
            );
        } catch (Exception e) {
            return Map.of("error", "Failed to get status: " + e.getMessage());
        }
    }

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectEvent event) {
        String sessionId = event.getMessage().getHeaders().get("simpSessionId").toString();
        log.info("WebSocket connection established: {}", sessionId);

        ConnectionStatus status = ConnectionStatus.builder()
                .status("connected")
                .sessionId(sessionId)
                .timestamp(LocalDateTime.now())
                .activeSubscriptions(0)
                .message("WebSocket connection established")
                .build();
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        String sessionId = event.getSessionId();
        log.info("WebSocket connection closed: {}", sessionId);

        SessionInfo sessionInfo = activeSessions.remove(sessionId);
        if (sessionInfo != null) {
            realtimeActivityService.cleanupUserSession(sessionInfo.userId, sessionId);
            log.info("Cleaned up session for user {}: {}", sessionInfo.userId, sessionId);
        }
    }

    private User extractUserFromPrincipal(Principal principal) {
        if (principal == null) {
            return null;
        }

        try {
            if (principal instanceof Authentication) {
                Authentication auth = (Authentication) principal;
                Object principalObj = auth.getPrincipal();

                if (principalObj instanceof User) {
                    return (User) principalObj;
                }
            }
            return null;
        } catch (Exception e) {
            log.error("Failed to extract user from principal: {}", e.getMessage());
            return null;
        }
    }

    private SubscriptionResponse createErrorResponse(String message, String subscriptionId) {
        return SubscriptionResponse.builder()
                .status("error")
                .message(message)
                .subscriptionId(subscriptionId)
                .build();
    }

    private void sendRecentActivitiesAsync(User user, String scope, Long entityId,
                                           LocalDateTime since, String sessionId) {
        CompletableFuture.runAsync(() -> {
            try {
                List<ActivityBroadcast> activities = realtimeActivityService.getRecentActivities(
                        user, scope, entityId, since);

                if (!activities.isEmpty()) {
                    messagingTemplate.convertAndSendToUser(
                            user.getUsername(),
                            "/queue/activities/recent",
                            activities
                    );
                    log.debug("Sent {} recent activities to user {} (session: {})",
                            activities.size(), user.getUsername(), sessionId);
                }
            } catch (Exception e) {
                log.error("Failed to send recent activities to user {} (session: {}): {}",
                        user.getUsername(), sessionId, e.getMessage());
            }
        });
    }

    private static class SessionInfo {
        Long userId;
        String sessionId;
        LocalDateTime connectedAt;
        LocalDateTime lastActivity;

        SessionInfo(Long userId, String sessionId, LocalDateTime connectedAt) {
            this.userId = userId;
            this.sessionId = sessionId;
            this.connectedAt = connectedAt;
            this.lastActivity = connectedAt;
        }
    }

    @MessageMapping("/debug/info")
    @SendToUser("/queue/activities/debug")
    public Map<String, Object> getDebugInfo(Principal principal) {
        if (!"development".equals(System.getProperty("spring.profiles.active"))) {
            return Map.of("error", "Debug endpoints only available in development");
        }

        try {
            User user = extractUserFromPrincipal(principal);
            if (user == null) {
                return Map.of("error", "Authentication required");
            }

            return Map.of(
                    "activeSessions", activeSessions.size(),
                    "userId", user.getId(),
                    "username", user.getUsername(),
                    "timestamp", LocalDateTime.now(),
                    "sessionInfo", activeSessions.values().stream()
                            .filter(session -> session.userId.equals(user.getId()))
                            .map(session -> Map.of(
                                    "sessionId", session.sessionId,
                                    "connectedAt", session.connectedAt,
                                    "lastActivity", session.lastActivity
                            ))
                            .collect(Collectors.toList())
            );
        } catch (Exception e) {
            return Map.of("error", "Debug failed: " + e.getMessage());
        }
    }

    @MessageMapping("/debug/test-activity")
    @SendToUser("/queue/activities/response")
    public SubscriptionResponse testActivity(Principal principal) {
        if (!"development".equals(System.getProperty("spring.profiles.active"))) {
            return createErrorResponse("Debug endpoints only available in development", null);
        }

        try {
            User user = extractUserFromPrincipal(principal);
            if (user == null) {
                return createErrorResponse("Authentication required", null);
            }

            ActivityBroadcast testActivity = ActivityBroadcast.builder()
                    .activityId(-1L)
                    .type(ActivityType.TASK_CREATED)
                    .description("Test activity from server")
                    .timestamp(LocalDateTime.now())
                    .eventId("test_" + System.currentTimeMillis())
                    .user(UserInfo.builder()
                            .id(user.getId())
                            .username(user.getUsername())
                            .fullName(user.getFullName())
                            .initials(user.getInitials())
                            .build())
                    .displayMessage("This is a test activity from the server")
                    .iconType("test")
                    .priority("medium")
                    .color("blue")
                    .build();

            messagingTemplate.convertAndSendToUser(
                    user.getUsername(),
                    "/queue/activities/global",
                    testActivity
            );

            log.info("Sent test activity to user {}", user.getUsername());

            return SubscriptionResponse.builder()
                    .status("success")
                    .message("Test activity sent")
                    .build();

        } catch (Exception e) {
            log.error("Failed to send test activity: {}", e.getMessage());
            return createErrorResponse("Test failed: " + e.getMessage(), null);
        }
    }
}