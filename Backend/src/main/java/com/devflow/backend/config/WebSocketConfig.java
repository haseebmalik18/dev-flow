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
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;

import java.security.Principal;
import java.util.List;
import java.util.Map;

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
                )
                .setHandshakeHandler(new DefaultHandshakeHandler())
                .addInterceptors(new JwtHandshakeInterceptor())
                .withSockJS()
                .setHeartbeatTime(25000);


        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(
                        "http://localhost:3000",
                        "http://localhost:3001",
                        "http://localhost:5173",
                        "http://localhost:8080",
                        "https://devflow-*.vercel.app"
                )
                .setHandshakeHandler(new DefaultHandshakeHandler())
                .addInterceptors(new JwtHandshakeInterceptor());
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

                if (accessor != null) {
                    if (StompCommand.CONNECT.equals(accessor.getCommand())) {

                        handleAuthentication(accessor);
                    } else if (StompCommand.SEND.equals(accessor.getCommand())) {

                        handleMessageAuthentication(message, accessor);
                    }
                }

                return message;
            }
        });
    }

    private void handleAuthentication(StompHeaderAccessor accessor) {
        List<String> authorization = accessor.getNativeHeader("Authorization");

        if (authorization != null && !authorization.isEmpty()) {
            String token = authorization.get(0);
            authenticateWithToken(token, accessor);
        } else {
            String token = accessor.getFirstNativeHeader("token");
            if (token != null) {
                authenticateWithToken("Bearer " + token, accessor);
            } else {
                log.warn("WebSocket connection attempted without authorization - this is normal, auth will happen via message");
            }
        }
    }

    private void handleMessageAuthentication(Message<?> message, StompHeaderAccessor accessor) {

        try {
            String payload = new String((byte[]) message.getPayload());
            if (payload.contains("\"type\":\"AUTH\"")) {

                int tokenStart = payload.indexOf("\"token\":\"") + 9;
                int tokenEnd = payload.indexOf("\"", tokenStart);
                if (tokenStart > 8 && tokenEnd > tokenStart) {
                    String token = payload.substring(tokenStart, tokenEnd);
                    authenticateWithToken(token, accessor);
                }
            }
        } catch (Exception e) {
            log.debug("Error parsing auth message: {}", e.getMessage());
        }
    }

    private void authenticateWithToken(String token, StompHeaderAccessor accessor) {
        try {
            if (token != null && token.startsWith("Bearer ")) {
                token = token.substring(7);

                String username = jwtService.extractUsername(token);

                if (username != null) {
                    UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                    if (jwtService.isTokenValid(token, userDetails)) {
                        UsernamePasswordAuthenticationToken authToken =
                                new UsernamePasswordAuthenticationToken(
                                        userDetails, null, userDetails.getAuthorities());

                        SecurityContextHolder.getContext().setAuthentication(authToken);
                        accessor.setUser(authToken);

                        log.info("WebSocket connection authenticated for user: {}", username);
                    } else {
                        log.warn("Invalid WebSocket token for user: {}", username);
                    }
                } else {
                    log.warn("Could not extract username from WebSocket token");
                }
            } else {
                log.debug("WebSocket token does not start with 'Bearer '");
            }
        } catch (Exception e) {
            log.error("WebSocket authentication failed: {}", e.getMessage());
        }
    }


    private class JwtHandshakeInterceptor implements HandshakeInterceptor {

        @Override
        public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                       org.springframework.web.socket.WebSocketHandler wsHandler,
                                       Map<String, Object> attributes) throws Exception {

            log.info("WebSocket handshake initiated from: {}", request.getRemoteAddress());


            return true;
        }

        @Override
        public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   org.springframework.web.socket.WebSocketHandler wsHandler,
                                   Exception exception) {
            if (exception != null) {
                log.error("WebSocket handshake failed: {}", exception.getMessage());
            } else {
                log.info("WebSocket handshake completed successfully");
            }
        }
    }
}