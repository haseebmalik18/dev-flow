package com.devflow.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

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



    public void sendProjectInvitationEmail(String toEmail, String recipientName, String inviterName,
                                           String projectName, String inviteUrl, String message,
                                           LocalDateTime expiresAt) {
        try {
            SimpleMailMessage mailMessage = new SimpleMailMessage();
            mailMessage.setFrom(fromEmail);
            mailMessage.setTo(toEmail);
            mailMessage.setSubject(String.format("You're invited to join %s on DevFlow", projectName));

            String personalMessage = message != null && !message.trim().isEmpty() ?
                    String.format("\n\nPersonal message from %s:\n\"%s\"\n", inviterName, message) : "";

            String emailBody = String.format(
                    "Hi %s,\n\n" +
                            "%s has invited you to join the project \"%s\" on DevFlow.%s\n" +
                            "Click the link below to accept or decline this invitation:\n\n" +
                            "%s\n\n" +
                            "This invitation will expire on %s.\n\n" +
                            "If you don't have a DevFlow account yet, you'll be able to create one when you click the link.\n\n" +
                            "Best regards,\n" +
                            "The DevFlow Team",
                    recipientName,
                    inviterName,
                    projectName,
                    personalMessage,
                    inviteUrl,
                    expiresAt.format(java.time.format.DateTimeFormatter.ofPattern("MMM dd, yyyy 'at' HH:mm"))
            );

            mailMessage.setText(emailBody);
            mailSender.send(mailMessage);

            log.info("Project invitation email sent successfully to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send project invitation email to: {}", toEmail, e);
            throw new RuntimeException("Failed to send project invitation email", e);
        }
    }

    public void sendInvitationAcceptedEmail(String toEmail, String inviterName, String accepterName,
                                            String projectName) {
        try {
            SimpleMailMessage mailMessage = new SimpleMailMessage();
            mailMessage.setFrom(fromEmail);
            mailMessage.setTo(toEmail);
            mailMessage.setSubject(String.format("%s accepted your invitation to %s", accepterName, projectName));

            String emailBody = String.format(
                    "Hi %s,\n\n" +
                            "Great news! %s has accepted your invitation to join the project \"%s\" on DevFlow.\n\n" +
                            "They are now part of your team and can start collaborating on the project.\n\n" +
                            "You can view the project and your team members at: %s\n\n" +
                            "Best regards,\n" +
                            "The DevFlow Team",
                    inviterName,
                    accepterName,
                    projectName,
                    baseUrl + "/projects"
            );

            mailMessage.setText(emailBody);
            mailSender.send(mailMessage);

            log.info("Invitation accepted notification email sent successfully to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send invitation accepted email to: {}", toEmail, e);
            // Don't throw exception for notification emails
        }
    }

    public void sendInvitationDeclinedEmail(String toEmail, String inviterName, String declinerName,
                                            String projectName, String declineMessage) {
        try {
            SimpleMailMessage mailMessage = new SimpleMailMessage();
            mailMessage.setFrom(fromEmail);
            mailMessage.setTo(toEmail);
            mailMessage.setSubject(String.format("%s declined your invitation to %s", declinerName, projectName));

            String responseMessage = declineMessage != null && !declineMessage.trim().isEmpty() ?
                    String.format("\n\nThey included this message:\n\"%s\"\n", declineMessage) : "";

            String emailBody = String.format(
                    "Hi %s,\n\n" +
                            "%s has declined your invitation to join the project \"%s\" on DevFlow.%s\n" +
                            "You can send a new invitation anytime from your project settings.\n\n" +
                            "Best regards,\n" +
                            "The DevFlow Team",
                    inviterName,
                    declinerName,
                    projectName,
                    responseMessage
            );

            mailMessage.setText(emailBody);
            mailSender.send(mailMessage);

            log.info("Invitation declined notification email sent successfully to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send invitation declined email to: {}", toEmail, e);
            // Don't throw exception for notification emails
        }
    }
}