package com.devflow.backend.config;

import lombok.RequiredArgsConstructor;
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

                        // File attachment endpoints (require authentication)
                        .requestMatchers("/api/v1/attachments/**").authenticated()

                        // Specific file upload endpoint (multipart form data)
                        .requestMatchers(HttpMethod.POST, "/api/v1/attachments/upload").authenticated()

                        // File download endpoints (require authentication for security)
                        .requestMatchers(HttpMethod.GET, "/api/v1/attachments/*/download").authenticated()

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

        // Allow specific origins (update for production)
        configuration.setAllowedOriginPatterns(List.of(
                "http://localhost:3000",
                "http://localhost:3001",
                "http://localhost:5173",
                "http://localhost:8080",
                "https://devflow-*.vercel.app",
                "https://your-production-domain.com",
                "https://6c52-2600-4808-5392-d600-41ac-ed5b-37df-afb7.ngrok-free.app"
        ));

        // Allow specific HTTP methods including file upload
        configuration.setAllowedMethods(List.of(
                "GET",
                "POST",
                "PUT",
                "DELETE",
                "OPTIONS",
                "PATCH"
        ));


        configuration.setAllowedHeaders(List.of(
                "*",
                "Authorization",
                "Content-Type",
                "Content-Disposition",
                "Content-Length",
                "X-Requested-With",
                "Accept",
                "Origin",
                "Access-Control-Request-Method",
                "Access-Control-Request-Headers",
                "Sec-WebSocket-Protocol",
                "Sec-WebSocket-Version",
                "Sec-WebSocket-Key",
                "Sec-WebSocket-Extensions"
        ));


        configuration.setExposedHeaders(List.of(
                "Authorization",
                "Content-Disposition",
                "Content-Type",
                "Content-Length"
        ));

        configuration.setAllowCredentials(true);
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