package com.devflow.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.base-url}")
    private String baseUrl;

    public void sendVerificationEmail(String toEmail, String firstName, String verificationCode) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Verify Your DevFlow Account");

            String emailBody = String.format(
                    "Hi %s,\n\n" +
                            "Welcome to DevFlow! Please verify your email address by entering the following verification code:\n\n" +
                            "Verification Code: %s\n\n" +
                            "This code will expire in 10 minutes.\n\n" +
                            "If you didn't create an account with DevFlow, please ignore this email.\n\n" +
                            "Best regards,\n" +
                            "The DevFlow Team",
                    firstName, verificationCode
            );

            message.setText(emailBody);
            mailSender.send(message);

            log.info("Verification email sent successfully to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send verification email to: {}", toEmail, e);
            throw new RuntimeException("Failed to send verification email", e);
        }
    }

    public void sendPasswordResetEmail(String toEmail, String firstName, String resetCode) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Reset Your DevFlow Password");

            String emailBody = String.format(
                    "Hi %s,\n\n" +
                            "You requested to reset your password for your DevFlow account. Please use the following verification code:\n\n" +
                            "Reset Code: %s\n\n" +
                            "This code will expire in 10 minutes.\n\n" +
                            "If you didn't request a password reset, please ignore this email.\n\n" +
                            "Best regards,\n" +
                            "The DevFlow Team",
                    firstName, resetCode
            );

            message.setText(emailBody);
            mailSender.send(message);

            log.info("Password reset email sent successfully to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send password reset email to: {}", toEmail, e);
            throw new RuntimeException("Failed to send password reset email", e);
        }
    }
}