package com.devflow.backend.controller;

import com.devflow.backend.dto.realtime.ActivityBroadcastDTOs.*;
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
import java.util.concurrent.ConcurrentHashMap;

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

        try {
            if (principal == null) {
                log.warn("No authenticated principal found for global subscription");
                return SubscriptionResponse.builder()
                        .status("error")
                        .message("Authentication required")
                        .build();
            }

            User user = (User) ((Authentication) principal).getPrincipal();
            String sessionId = headerAccessor.getSessionId();

            log.info("User {} subscribing to global activities from session {}",
                    user.getUsername(), sessionId);


            activeSessions.put(sessionId, new SessionInfo(user.getId(), sessionId, LocalDateTime.now()));


            SubscriptionResponse response = realtimeActivityService.subscribeToGlobalActivities(user, sessionId);

            if (request != null && request.getLastSeen() != null) {
                sendRecentActivities(user, "global", null, request.getLastSeen(), sessionId);
            }

            return response;

        } catch (Exception e) {
            log.error("Failed to subscribe to global activities: {}", e.getMessage(), e);
            return SubscriptionResponse.builder()
                    .status("error")
                    .message("Failed to subscribe: " + e.getMessage())
                    .build();
        }
    }

    @MessageMapping("/subscribe/project/{projectId}")
    @SendToUser("/queue/activities/response")
    public SubscriptionResponse subscribeToProjectActivities(
            @DestinationVariable Long projectId,
            @Payload(required = false) SubscriptionRequest request,
            SimpMessageHeaderAccessor headerAccessor,
            Principal principal) {

        try {
            if (principal == null) {
                return SubscriptionResponse.builder()
                        .status("error")
                        .message("Authentication required")
                        .build();
            }

            User user = (User) ((Authentication) principal).getPrincipal();
            String sessionId = headerAccessor.getSessionId();

            log.info("User {} subscribing to project {} activities from session {}",
                    user.getUsername(), projectId, sessionId);

            activeSessions.put(sessionId, new SessionInfo(user.getId(), sessionId, LocalDateTime.now()));

            SubscriptionResponse response = realtimeActivityService.subscribeToProjectActivities(user, projectId, sessionId);

            if (request != null && request.getLastSeen() != null) {
                sendRecentActivities(user, "project", projectId, request.getLastSeen(), sessionId);
            }

            return response;

        } catch (Exception e) {
            log.error("Failed to subscribe to project {} activities: {}", projectId, e.getMessage(), e);
            return SubscriptionResponse.builder()
                    .status("error")
                    .message("Failed to subscribe: " + e.getMessage())
                    .build();
        }
    }

    @MessageMapping("/heartbeat")
    @SendToUser("/queue/activities/heartbeat")
    public HeartbeatMessage heartbeat(
            @Payload(required = false) HeartbeatMessage message,
            SimpMessageHeaderAccessor headerAccessor,
            Principal principal) {

        try {
            if (principal == null) {
                return HeartbeatMessage.builder()
                        .timestamp(LocalDateTime.now())
                        .build();
            }

            User user = (User) ((Authentication) principal).getPrincipal();
            String sessionId = headerAccessor.getSessionId();


            SessionInfo sessionInfo = activeSessions.get(sessionId);
            if (sessionInfo != null) {
                sessionInfo.lastActivity = LocalDateTime.now();
            }

            return HeartbeatMessage.builder()
                    .timestamp(LocalDateTime.now())
                    .sessionId(sessionId)
                    .userId(user.getId())
                    .build();

        } catch (Exception e) {
            log.error("Heartbeat error: {}", e.getMessage(), e);
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
            if (principal == null) {
                return SubscriptionResponse.builder()
                        .status("error")
                        .message("Authentication required")
                        .build();
            }

            User user = (User) ((Authentication) principal).getPrincipal();

            log.info("User {} unsubscribing from {}", user.getUsername(), subscriptionId);

            realtimeActivityService.unsubscribe(subscriptionId);

            return SubscriptionResponse.builder()
                    .status("success")
                    .message("Unsubscribed successfully")
                    .subscriptionId(subscriptionId)
                    .build();

        } catch (Exception e) {
            log.error("Failed to unsubscribe from {}: {}", subscriptionId, e.getMessage(), e);
            return SubscriptionResponse.builder()
                    .status("error")
                    .message("Failed to unsubscribe: " + e.getMessage())
                    .subscriptionId(subscriptionId)
                    .build();
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

    private void sendRecentActivities(User user, String scope, Long entityId, LocalDateTime since, String sessionId) {
        try {
            List<ActivityBroadcast> activities = realtimeActivityService.getRecentActivities(user, scope, entityId, since);

            if (!activities.isEmpty()) {
                String destination = String.format("/user/%d/queue/activities/recent", user.getId());
                messagingTemplate.convertAndSendToUser(
                        user.getUsername(),
                        "/queue/activities/recent",
                        activities
                );
                log.info("Sending {} recent activities to user {} session {}",
                        activities.size(), user.getUsername(), sessionId);
            }

        } catch (Exception e) {
            log.error("Failed to send recent activities: {}", e.getMessage(), e);
        }
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
}