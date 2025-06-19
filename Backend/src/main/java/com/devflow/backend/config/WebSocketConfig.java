package com.devflow.backend.config;

import com.devflow.backend.service.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.List;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
@Slf4j
@Order(Ordered.HIGHEST_PRECEDENCE + 99)
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {

        config.enableSimpleBroker("/topic", "/queue", "/user");


        config.setApplicationDestinationPrefixes("/app");


        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {

        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(
                        "http://localhost:3000",
                        "http://localhost:3001",
                        "http://localhost:5173",
                        "http://localhost:8080",
                        "https://devflow-*.vercel.app"
                );
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

                if (accessor != null) {
                    log.debug("Processing STOMP command: {} for session: {} with destination: {}",
                            accessor.getCommand(), accessor.getSessionId(), accessor.getDestination());

                    if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                        handleAuthentication(accessor);
                    } else if (StompCommand.SEND.equals(accessor.getCommand()) ||
                            StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {

                        if (accessor.getUser() == null) {
                            handleAuthentication(accessor);
                        }
                    }
                }

                return message;
            }
        });
    }

    private void handleAuthentication(StompHeaderAccessor accessor) {
        try {

            List<String> authorization = accessor.getNativeHeader("Authorization");
            String token = null;

            if (authorization != null && !authorization.isEmpty()) {
                String authHeader = authorization.get(0);
                if (authHeader != null && authHeader.startsWith("Bearer ")) {
                    token = authHeader.substring(7);
                    log.debug("Found Authorization header with Bearer token");
                }
            }


            if (token == null) {
                List<String> tokenHeaders = accessor.getNativeHeader("token");
                if (tokenHeaders != null && !tokenHeaders.isEmpty()) {
                    token = tokenHeaders.get(0);
                    log.debug("Found token header");
                }
            }

            if (token != null && !token.trim().isEmpty()) {
                authenticateWithToken(token, accessor);
            } else {
                log.warn("No authentication token found for WebSocket connection from session: {}",
                        accessor.getSessionId());
            }

        } catch (Exception e) {
            log.error("WebSocket authentication failed for session {}: {}",
                    accessor.getSessionId(), e.getMessage(), e);
        }
    }

    private void authenticateWithToken(String token, StompHeaderAccessor accessor) {
        try {
            String username = jwtService.extractUsername(token);

            if (username != null) {
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                if (jwtService.isTokenValid(token, userDetails)) {
                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(
                                    userDetails, null, userDetails.getAuthorities());

                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    accessor.setUser(authToken);

                    log.info("WebSocket connection authenticated for user: {} (session: {})",
                            username, accessor.getSessionId());
                } else {
                    log.warn("Invalid WebSocket token for user: {} (session: {})",
                            username, accessor.getSessionId());
                }
            } else {
                log.warn("Could not extract username from WebSocket token (session: {})",
                        accessor.getSessionId());
            }
        } catch (Exception e) {
            log.error("WebSocket token authentication failed for session {}: {}",
                    accessor.getSessionId(), e.getMessage());
        }
    }
}