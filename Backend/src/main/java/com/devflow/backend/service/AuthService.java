package com.devflow.backend.service;

import com.devflow.backend.dto.auth.AuthDTOs.*;
import com.devflow.backend.entity.TokenType;
import com.devflow.backend.entity.User;
import com.devflow.backend.entity.VerificationToken;
import com.devflow.backend.exception.AuthException;
import com.devflow.backend.repository.UserRepository;
import com.devflow.backend.repository.VerificationTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final VerificationTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final EmailService emailService;
    private final AuthenticationManager authenticationManager;

    @Value("${app.verification-code-expiration}")
    private long verificationCodeExpiration;

    private final SecureRandom secureRandom = new SecureRandom();


    private final ConcurrentHashMap<String, Long> processingCache = new ConcurrentHashMap<>();
    private static final long CACHE_TIMEOUT_MS = 30000;

    @Transactional
    public UserInfo register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new AuthException("Username already exists");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AuthException("Email already registered");
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .isVerified(false)
                .isActive(true)
                .build();

        User savedUser = userRepository.save(user);
        sendVerificationCode(savedUser.getEmail(), savedUser.getFirstName(), TokenType.EMAIL_VERIFICATION);

        log.info("User registered successfully: {}", savedUser.getUsername());
        return mapToUserInfo(savedUser);
    }

    public AuthResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getUsernameOrEmail(),
                            request.getPassword()
                    )
            );
        } catch (AuthenticationException e) {
            throw new AuthException("Invalid credentials");
        }

        User user = userRepository.findByUsernameOrEmail(request.getUsernameOrEmail(), request.getUsernameOrEmail())
                .orElseThrow(() -> new AuthException("User not found"));

        if (!user.getIsVerified()) {
            throw new AuthException("Email not verified. Please check your email for verification code.");
        }

        if (!user.getIsActive()) {
            throw new AuthException("Account is deactivated");
        }

        String jwt = jwtService.generateToken(user);
        log.info("User logged in successfully: {}", user.getUsername());

        return new AuthResponse(jwt, mapToUserInfo(user));
    }

    @Transactional(isolation = Isolation.SERIALIZABLE)
    public AuthResponse verifyEmail(VerifyEmailRequest request) {
        String cacheKey = request.getEmail() + ":" + request.getCode();
        long currentTime = System.currentTimeMillis();


        Long existingRequest = processingCache.get(cacheKey);
        if (existingRequest != null && (currentTime - existingRequest) < CACHE_TIMEOUT_MS) {
            log.warn("Duplicate verification request detected for email: {}", request.getEmail());
            throw new AuthException("Verification request already in progress");
        }


        processingCache.put(cacheKey, currentTime);

        try {

            VerificationToken token = tokenRepository.findByEmailAndCodeAndTypeForUpdate(
                    request.getEmail(),
                    request.getCode(),
                    TokenType.EMAIL_VERIFICATION
            ).orElseThrow(() -> {
                log.warn("Invalid verification code attempt for email: {}", request.getEmail());
                return new AuthException("Invalid verification code");
            });


            if (token.isExpired()) {
                tokenRepository.delete(token);
                log.warn("Expired verification code used for email: {}", request.getEmail());
                throw new AuthException("Verification code has expired");
            }

            if (token.isUsed()) {
                tokenRepository.delete(token);
                log.warn("Already used verification code attempted for email: {}", request.getEmail());
                throw new AuthException("Verification code has already been used");
            }


            token.setUsedAt(LocalDateTime.now());
            tokenRepository.save(token);


            User user = userRepository.findByEmail(request.getEmail())
                    .orElseThrow(() -> new AuthException("User not found"));

            if (!user.getIsVerified()) {
                user.setIsVerified(true);
                userRepository.save(user);
                log.info("Email verified successfully for user: {}", user.getUsername());
            }


            tokenRepository.delete(token);

            String jwt = jwtService.generateToken(user);
            return new AuthResponse(jwt, mapToUserInfo(user));

        } finally {

            processingCache.remove(cacheKey);
        }
    }

    @Transactional
    public void resendVerificationCode(ResendVerificationRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new AuthException("User not found"));

        if (user.getIsVerified()) {
            throw new AuthException("Email is already verified");
        }


        tokenRepository.deleteByEmailAndType(request.getEmail(), TokenType.EMAIL_VERIFICATION);

        sendVerificationCode(user.getEmail(), user.getFirstName(), TokenType.EMAIL_VERIFICATION);
        log.info("Verification code resent for user: {}", user.getUsername());
    }

    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new AuthException("User not found"));

        if (!user.getIsVerified()) {
            throw new AuthException("Email not verified");
        }


        tokenRepository.deleteByEmailAndType(request.getEmail(), TokenType.PASSWORD_RESET);

        sendVerificationCode(user.getEmail(), user.getFirstName(), TokenType.PASSWORD_RESET);
        log.info("Password reset code sent for user: {}", user.getUsername());
    }

    @Transactional(isolation = Isolation.SERIALIZABLE)
    public void resetPassword(ResetPasswordRequest request) {
        VerificationToken token = tokenRepository.findByEmailAndCodeAndTypeForUpdate(
                request.getEmail(),
                request.getCode(),
                TokenType.PASSWORD_RESET
        ).orElseThrow(() -> new AuthException("Invalid reset code"));

        if (token.isExpired()) {
            tokenRepository.delete(token);
            throw new AuthException("Reset code has expired");
        }

        if (token.isUsed()) {
            tokenRepository.delete(token);
            throw new AuthException("Reset code has already been used");
        }


        token.setUsedAt(LocalDateTime.now());
        tokenRepository.save(token);

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new AuthException("User not found"));

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);


        tokenRepository.delete(token);

        log.info("Password reset successfully for user: {}", user.getUsername());
    }

    private void sendVerificationCode(String email, String firstName, TokenType tokenType) {
        String code = generateVerificationCode();
        String token = UUID.randomUUID().toString();

        VerificationToken verificationToken = VerificationToken.builder()
                .token(token)
                .code(code)
                .email(email)
                .type(tokenType)
                .expiresAt(LocalDateTime.now().plusSeconds(verificationCodeExpiration / 1000))
                .build();

        tokenRepository.save(verificationToken);

        if (tokenType == TokenType.EMAIL_VERIFICATION) {
            emailService.sendVerificationEmail(email, firstName, code);
        } else if (tokenType == TokenType.PASSWORD_RESET) {
            emailService.sendPasswordResetEmail(email, firstName, code);
        }
    }

    private String generateVerificationCode() {
        return String.format("%06d", secureRandom.nextInt(1000000));
    }

    private UserInfo mapToUserInfo(User user) {
        return UserInfo.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .avatar(user.getAvatar())
                .role(user.getRole().name())
                .isVerified(user.getIsVerified())
                .build();
    }


    @org.springframework.scheduling.annotation.Scheduled(fixedRate = 300000)
    public void cleanupProcessingCache() {
        long currentTime = System.currentTimeMillis();
        processingCache.entrySet().removeIf(entry ->
                (currentTime - entry.getValue()) > CACHE_TIMEOUT_MS);
    }
}