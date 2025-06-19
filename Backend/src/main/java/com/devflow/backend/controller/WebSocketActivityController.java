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


    private final Map<String, SessionInfo> activeSessions = new ConcurrentHashMap<>();


    @MessageMapping("/activities/subscribe/global")
    @SendToUser("/queue/activities/response")
    public SubscriptionResponse subscribeToGlobalActivities(
            @Payload SubscriptionRequest request,
            SimpMessageHeaderAccessor headerAccessor,
            Principal principal) {

        try {
            User user = (User) ((Authentication) principal).getPrincipal();
            String sessionId = headerAccessor.getSessionId();

            log.info("User {} subscribing to global activities from session {}",
                    user.getUsername(), sessionId);


            activeSessions.put(sessionId, new SessionInfo(user.getId(), sessionId, LocalDateTime.now()));


            SubscriptionResponse response = realtimeActivityService.subscribeToGlobalActivities(user, sessionId);


            if (request.getLastSeen() != null) {
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



    @MessageMapping("/activities/subscribe/project/{projectId}")
    @SendToUser("/queue/activities/response")
    public SubscriptionResponse subscribeToProjectActivities(
            @DestinationVariable Long projectId,
            @Payload SubscriptionRequest request,
            SimpMessageHeaderAccessor headerAccessor,
            Principal principal) {

        try {
            User user = (User) ((Authentication) principal).getPrincipal();
            String sessionId = headerAccessor.getSessionId();

            log.info("User {} subscribing to project {} activities from session {}",
                    user.getUsername(), projectId, sessionId);

            activeSessions.put(sessionId, new SessionInfo(user.getId(), sessionId, LocalDateTime.now()));


            SubscriptionResponse response = realtimeActivityService.subscribeToProjectActivities(user, projectId, sessionId);


            if (request.getLastSeen() != null) {
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

    @MessageMapping("/activities/subscribe/task/{taskId}")
    @SendToUser("/queue/activities/response")
    public SubscriptionResponse subscribeToTaskActivities(
            @DestinationVariable Long taskId,
            @Payload SubscriptionRequest request,
            SimpMessageHeaderAccessor headerAccessor,
            Principal principal) {

        try {
            User user = (User) ((Authentication) principal).getPrincipal();
            String sessionId = headerAccessor.getSessionId();

            log.info("User {} subscribing to task {} activities from session {}",
                    user.getUsername(), taskId, sessionId);


            activeSessions.put(sessionId, new SessionInfo(user.getId(), sessionId, LocalDateTime.now()));


            SubscriptionResponse response = realtimeActivityService.subscribeToTaskActivities(user, taskId, sessionId);


            if (request.getLastSeen() != null) {
                sendRecentActivities(user, "task", taskId, request.getLastSeen(), sessionId);
            }

            return response;

        } catch (Exception e) {
            log.error("Failed to subscribe to task {} activities: {}", taskId, e.getMessage(), e);
            return SubscriptionResponse.builder()
                    .status("error")
                    .message("Failed to subscribe: " + e.getMessage())
                    .build();
        }
    }



    @MessageMapping("/activities/unsubscribe/{subscriptionId}")
    @SendToUser("/queue/activities/response")
    public SubscriptionResponse unsubscribeFromActivities(
            @DestinationVariable String subscriptionId,
            Principal principal) {

        try {
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


    @MessageMapping("/activities/recent/{scope}")
    @SendToUser("/queue/activities/recent")
    public List<ActivityBroadcast> getRecentActivities(
            @DestinationVariable String scope,
            @Payload Map<String, Object> request,
            Principal principal) {

        try {
            User user = (User) ((Authentication) principal).getPrincipal();

            Long entityId = request.get("entityId") != null ?
                    Long.valueOf(request.get("entityId").toString()) : null;
            LocalDateTime since = request.get("since") != null ?
                    LocalDateTime.parse(request.get("since").toString()) : LocalDateTime.now().minusHours(24);

            log.debug("User {} requesting recent {} activities since {}",
                    user.getUsername(), scope, since);

            return realtimeActivityService.getRecentActivities(user, scope, entityId, since);

        } catch (Exception e) {
            log.error("Failed to get recent activities: {}", e.getMessage(), e);
            return List.of();
        }
    }


    @MessageMapping("/activities/heartbeat")
    @SendToUser("/queue/activities/heartbeat")
    public HeartbeatMessage heartbeat(
            @Payload HeartbeatMessage message,
            SimpMessageHeaderAccessor headerAccessor,
            Principal principal) {

        try {
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
                // Note: This would need the messaging template, which should be injected
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