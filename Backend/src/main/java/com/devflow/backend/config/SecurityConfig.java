package com.devflow.backend.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final UserDetailsService userDetailsService;

    @Value("${APP_BASE_URL:https://dev-flow-production.up.railway.app}")
    private String baseUrl;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .authorizeHttpRequests(auth -> auth
                        // Public authentication endpoints
                        .requestMatchers("/api/v1/auth/**").permitAll()

                        // Public health check
                        .requestMatchers("/api/v1/health").permitAll()

                        // WebSocket endpoints (authentication handled in WebSocket config)
                        .requestMatchers("/ws/**").permitAll()
                        .requestMatchers("/app/**").permitAll()
                        .requestMatchers("/topic/**").permitAll()
                        .requestMatchers("/queue/**").permitAll()
                        .requestMatchers("/user/**").permitAll()

                        // Public invitation endpoints (for email links)
                        .requestMatchers(HttpMethod.GET, "/api/v1/invitations/*").permitAll()

                        // Public user validation endpoints
                        .requestMatchers("/api/v1/users/check-email").permitAll()

                        // GitHub OAuth callback (public for OAuth flow)
                        .requestMatchers(HttpMethod.GET, "/api/v1/github/oauth/callback").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/github/oauth/callback").permitAll()

                        // GitHub webhook (public for GitHub to call)
                        .requestMatchers(HttpMethod.POST, "/api/v1/github/webhook").permitAll()

                        // File attachment endpoints (require authentication)
                        .requestMatchers("/api/v1/attachments/**").authenticated()

                        // Specific file upload endpoint (multipart form data)
                        .requestMatchers(HttpMethod.POST, "/api/v1/attachments/upload").authenticated()

                        // File download endpoints (require authentication for security)
                        .requestMatchers(HttpMethod.GET, "/api/v1/attachments/*/download").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/v1/attachments/*/stream").authenticated()

                        // Task endpoints (for attachment context)
                        .requestMatchers("/api/v1/tasks/**").authenticated()

                        // Project endpoints (for attachment context)
                        .requestMatchers("/api/v1/projects/**").authenticated()

                        // Comment endpoints
                        .requestMatchers("/api/v1/comments/**").authenticated()

                        // Dashboard endpoints
                        .requestMatchers("/api/v1/dashboard/**").authenticated()

                        // User endpoints
                        .requestMatchers("/api/v1/users/**").authenticated()

                        // GitHub integration endpoints
                        .requestMatchers("/api/v1/github/**").authenticated()

                        // Admin endpoints (for file validation/management)
                        .requestMatchers("/api/v1/attachments/admin/**").hasRole("ADMIN")

                        // All other endpoints require authentication
                        .anyRequest().authenticated()
                )
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // ✅ SECURE: Explicit allowed origins only
        configuration.setAllowedOrigins(List.of(
                // Development origins
                "http://localhost:8080",           // Your current frontend
                "http://localhost:3000",           // Common React dev port
                "http://localhost:3001",           // Alternative dev port
                "http://localhost:5173",           // Vite dev port

                // Backend URL (for internal calls)
                baseUrl
        ));

        // Allow standard HTTP methods
        configuration.setAllowedMethods(List.of(
                "GET",
                "POST",
                "PUT",
                "DELETE",
                "OPTIONS",
                "PATCH",
                "HEAD"
        ));

        // Allow standard headers
        configuration.setAllowedHeaders(List.of(
                "*"  // Allow all headers for simplicity
        ));

        // Expose headers that frontend might need
        configuration.setExposedHeaders(List.of(
                "Authorization",
                "Content-Disposition",
                "Content-Type",
                "Content-Length",
                "X-Total-Count"  // For pagination
        ));

        // Allow credentials (required for JWT in headers)
        configuration.setAllowCredentials(true);

        // Cache preflight requests for 1 hour
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}