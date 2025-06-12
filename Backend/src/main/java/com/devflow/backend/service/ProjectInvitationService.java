package com.devflow.backend.service;

import com.devflow.backend.dto.invitation.InvitationDTOs.*;
import com.devflow.backend.entity.*;
import com.devflow.backend.exception.AuthException;
import com.devflow.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ProjectInvitationService {

    private final ProjectInvitationRepository invitationRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final UserRepository userRepository;
    private final ActivityRepository activityRepository;
    private final EmailService emailService;

    @Value("${app.invitation-expiration-days:7}")
    private int invitationExpirationDays;

    @Value("${app.base-url}")
    private String baseUrl;

    public SendInvitationResponse sendInvitations(Long projectId, SendInvitationRequest request, User inviter) {
        log.info("=== SENDING INVITATIONS DEBUG ===");
        log.info("Project ID: {}, Inviter: {}, Number of invitations: {}",
                projectId, inviter.getEmail(), request.getInvitations().size());

        Project project = findProjectWithAccess(projectId, inviter);

        if (!canUserManageMembers(inviter, project)) {
            throw new AuthException("You don't have permission to invite members to this project");
        }

        List<String> errors = new ArrayList<>();
        List<InvitationResponse> successful = new ArrayList<>();
        int successCount = 0;

        for (InviteDetail detail : request.getInvitations()) {
            try {
                log.info("Processing invitation for: {}", detail.getEmail());

                if (isUserAlreadyMember(project, detail.getEmail())) {
                    log.warn("User {} is already a member of project {}", detail.getEmail(), project.getName());
                    errors.add("User " + detail.getEmail() + " is already a member of this project");
                    continue;
                }


                int cancelledCount = invitationRepository.cancelExistingInvitations(project, detail.getEmail());
                log.info("Cancelled {} existing invitations for {}", cancelledCount, detail.getEmail());


                ProjectInvitation invitation = createInvitation(project, detail, inviter, request.getMessage());
                invitation = invitationRepository.save(invitation);

                log.info("Created invitation - ID: {}, Token: {}, Email: {}",
                        invitation.getId(), invitation.getToken(), invitation.getEmail());


                sendInvitationEmailAsync(invitation);


                Activity activity = Activity.builder()
                        .type(ActivityType.PROJECT_UPDATED)
                        .description(String.format("%s invited %s to join the project",
                                inviter.getFullName(), detail.getEmail()))
                        .user(inviter)
                        .project(project)
                        .build();
                activityRepository.save(activity);

                successful.add(mapToInvitationResponse(invitation));
                successCount++;

                log.info("Successfully sent invitation to: {}", detail.getEmail());

            } catch (Exception e) {
                log.error("Failed to send invitation to {}: {}", detail.getEmail(), e.getMessage(), e);
                errors.add("Failed to invite " + detail.getEmail() + ": " + e.getMessage());
            }
        }

        log.info("Invitation batch complete - Success: {}, Failed: {}", successCount, errors.size());

        return SendInvitationResponse.builder()
                .totalInvitations(request.getInvitations().size())
                .successfulInvitations(successCount)
                .failedInvitations(request.getInvitations().size() - successCount)
                .errors(errors)
                .invitations(successful)
                .build();
    }

    @Transactional(readOnly = true)
    public List<InvitationResponse> getPendingInvitations(User user) {
        log.info("Getting pending invitations for user: {}", user.getEmail());

        List<ProjectInvitation> invitations = invitationRepository
                .findPendingInvitationsByEmail(user.getEmail(), LocalDateTime.now());

        log.info("Found {} pending invitations for {}", invitations.size(), user.getEmail());

        return invitations.stream()
                .map(this::mapToInvitationResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<InvitationSummary> getProjectInvitations(Long projectId, User user, int page, int size) {
        log.info("Getting project invitations for project: {}, user: {}", projectId, user.getEmail());

        Project project = findProjectWithAccess(projectId, user);
        Pageable pageable = PageRequest.of(page, size);

        Page<ProjectInvitation> invitations = invitationRepository
                .findByProjectOrderByCreatedAtDesc(project, pageable);

        log.info("Found {} invitations for project {}", invitations.getTotalElements(), project.getName());

        return invitations.map(this::mapToInvitationSummary);
    }

    @Transactional(readOnly = true)
    public InvitationResponse getInvitationByToken(String token) {
        log.info("=== GET INVITATION BY TOKEN DEBUG ===");
        log.info("Received token: '{}'", token);
        log.info("Token length: {}", token != null ? token.length() : "null");
        log.info("Token class: {}", token != null ? token.getClass().getSimpleName() : "null");

        if (token == null || token.trim().isEmpty()) {
            log.error("Token is null or empty");
            throw new AuthException("Invalid invitation token");
        }


        final String finalToken = token.trim();
        log.info("Token after trim: '{}'", finalToken);


        log.info("Token bytes: {}", java.util.Arrays.toString(finalToken.getBytes()));


        log.info("Searching for invitation in database...");
        Optional<ProjectInvitation> invitationOpt = invitationRepository.findByToken(finalToken);

        if (invitationOpt.isEmpty()) {
            log.error("=== INVITATION NOT FOUND ===");


            List<ProjectInvitation> allInvitations = invitationRepository.findAll();
            log.error("Total invitations in database: {}", allInvitations.size());

            allInvitations.stream()
                    .filter(inv -> inv.getCreatedAt().isAfter(LocalDateTime.now().minusHours(24)))
                    .forEach(inv -> {
                        log.error("Available invitation - ID: {}, Token: '{}' (length: {}), Email: {}, Status: {}",
                                inv.getId(), inv.getToken(), inv.getToken().length(), inv.getEmail(), inv.getStatus());


                        if (inv.getToken().length() == finalToken.length()) {
                            boolean matches = true;
                            for (int i = 0; i < finalToken.length(); i++) {
                                if (finalToken.charAt(i) != inv.getToken().charAt(i)) {
                                    log.error("Token mismatch at position {}: got '{}' ({}), expected '{}' ({})",
                                            i, finalToken.charAt(i), (int)finalToken.charAt(i),
                                            inv.getToken().charAt(i), (int)inv.getToken().charAt(i));
                                    matches = false;
                                    break;
                                }
                            }
                            if (matches) {
                                log.error("Tokens appear identical but query didn't find it - possible database issue");
                            }
                        }
                    });

            throw new AuthException("Invitation not found");
        }

        ProjectInvitation invitation = invitationOpt.get();
        log.info("=== INVITATION FOUND ===");
        log.info("Found invitation - ID: {}, Email: {}, Status: {}, Expires: {}, Project: {}",
                invitation.getId(), invitation.getEmail(), invitation.getStatus(),
                invitation.getExpiresAt(), invitation.getProject().getName());

        if (invitation.isExpired()) {
            log.warn("Invitation is expired: {} (current time: {})",
                    invitation.getExpiresAt(), LocalDateTime.now());
            throw new AuthException("This invitation has expired");
        }

        if (invitation.getStatus() != InvitationStatus.PENDING) {
            log.warn("Invitation status is not pending: {}", invitation.getStatus());
            throw new AuthException("This invitation is no longer valid");
        }

        log.info("Invitation is valid, returning response");
        return mapToInvitationResponse(invitation);
    }

    public InvitationResponse respondToInvitation(String token, RespondToInvitationRequest request, User user) {
        log.info("=== RESPOND TO INVITATION DEBUG ===");
        log.info("User: {} attempting to respond to token: '{}'", user.getEmail(), token);
        log.info("Action: {}", request.getAction());

        if (token == null || token.trim().isEmpty()) {
            log.error("Token is null or empty in respond method");
            throw new AuthException("Invalid invitation token");
        }

        final String finalToken = token.trim();


        Optional<ProjectInvitation> invitationOpt = invitationRepository.findByToken(finalToken);

        if (invitationOpt.isEmpty()) {
            log.error("Token not found during response: '{}'", finalToken);


            List<ProjectInvitation> userInvitations = invitationRepository.findPendingInvitationsByEmail(
                    user.getEmail(), LocalDateTime.now());
            log.error("User {} has {} pending invitations", user.getEmail(), userInvitations.size());

            userInvitations.forEach(inv ->
                    log.error("User's pending invitation - Token: '{}', Status: {}", inv.getToken(), inv.getStatus()));

            throw new AuthException("Invitation not found");
        }

        ProjectInvitation invitation = invitationOpt.get();
        log.info("Found invitation for response - ID: {}, Email: {}, User Email: {}, Status: {}, Project: {}",
                invitation.getId(), invitation.getEmail(), user.getEmail(), invitation.getStatus(),
                invitation.getProject().getName());

        if (invitation.isExpired()) {
            log.warn("Invitation expired at: {}, current time: {}", invitation.getExpiresAt(), LocalDateTime.now());
            throw new AuthException("This invitation has expired");
        }

        if (invitation.getStatus() != InvitationStatus.PENDING) {
            log.warn("Invitation status is: {}, expected: PENDING", invitation.getStatus());
            throw new AuthException("This invitation has already been responded to");
        }

        if (!invitation.getEmail().equalsIgnoreCase(user.getEmail())) {
            log.error("Email mismatch - Invitation email: {}, User email: {}", invitation.getEmail(), user.getEmail());
            throw new AuthException("This invitation is not for your email address");
        }


        if (projectMemberRepository.existsByProjectAndUser(invitation.getProject(), user)) {
            log.warn("User {} is already a member of project {}", user.getEmail(), invitation.getProject().getName());
            throw new AuthException("You are already a member of this project");
        }

        if ("accept".equalsIgnoreCase(request.getAction())) {
            log.info("User {} accepting invitation", user.getEmail());
            return acceptInvitation(invitation, user, request.getMessage());
        } else if ("decline".equalsIgnoreCase(request.getAction())) {
            log.info("User {} declining invitation", user.getEmail());
            return declineInvitation(invitation, request.getMessage());
        } else {
            log.error("Invalid action received: {}", request.getAction());
            throw new AuthException("Invalid action. Must be 'accept' or 'decline'");
        }
    }

    public void cancelInvitation(Long invitationId, User user) {
        log.info("User {} attempting to cancel invitation {}", user.getEmail(), invitationId);

        ProjectInvitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new AuthException("Invitation not found"));

        if (!invitation.getInvitedBy().equals(user) &&
                !canUserManageMembers(user, invitation.getProject())) {
            throw new AuthException("You don't have permission to cancel this invitation");
        }

        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new AuthException("Only pending invitations can be cancelled");
        }

        invitation.setStatus(InvitationStatus.CANCELLED);
        invitationRepository.save(invitation);


        Activity activity = Activity.builder()
                .type(ActivityType.PROJECT_UPDATED)
                .description(String.format("%s cancelled invitation for %s",
                        user.getFullName(), invitation.getEmail()))
                .user(user)
                .project(invitation.getProject())
                .build();
        activityRepository.save(activity);

        log.info("Invitation {} cancelled successfully by {}", invitationId, user.getEmail());
    }

    @Transactional(readOnly = true)
    public InvitationStatsResponse getInvitationStats(User user) {
        log.info("Getting invitation stats for user: {}", user.getEmail());


        return InvitationStatsResponse.builder()
                .totalSent(0L)
                .pending(0L)
                .accepted(0L)
                .declined(0L)
                .expired(0L)
                .build();
    }

    @Scheduled(fixedRate = 3600000)
    @Transactional
    public void cleanupExpiredInvitations() {
        log.info("Running invitation cleanup...");

        int updated = invitationRepository.markExpiredInvitations(LocalDateTime.now());
        if (updated > 0) {
            log.info("Marked {} invitations as expired", updated);
        }

        LocalDateTime cutoff = LocalDateTime.now().minusDays(30);
        invitationRepository.deleteOldInvitations(cutoff);

        log.info("Invitation cleanup completed");
    }



    private InvitationResponse acceptInvitation(ProjectInvitation invitation, User user, String responseMessage) {
        log.info("Accepting invitation {} for user {}", invitation.getId(), user.getEmail());

        invitation.accept(responseMessage);
        invitation.setUser(user);
        invitation = invitationRepository.save(invitation);


        ProjectMember member = ProjectMember.builder()
                .project(invitation.getProject())
                .user(user)
                .role(invitation.getRole())
                .invitedBy(invitation.getInvitedBy())
                .build();
        projectMemberRepository.save(member);


        Activity activity = Activity.builder()
                .type(ActivityType.PROJECT_UPDATED)
                .description(String.format("%s accepted invitation to join the project",
                        user.getFullName()))
                .user(user)
                .project(invitation.getProject())
                .build();
        activityRepository.save(activity);

        log.info("Invitation {} accepted successfully", invitation.getId());
        return mapToInvitationResponse(invitation);
    }

    private InvitationResponse declineInvitation(ProjectInvitation invitation, String responseMessage) {
        log.info("Declining invitation {} for email {}", invitation.getId(), invitation.getEmail());

        invitation.decline(responseMessage);
        invitation = invitationRepository.save(invitation);


        Activity activity = Activity.builder()
                .type(ActivityType.PROJECT_UPDATED)
                .description(String.format("Invitation declined by %s", invitation.getEmail()))
                .user(invitation.getInvitedBy())
                .project(invitation.getProject())
                .build();
        activityRepository.save(activity);

        log.info("Invitation {} declined successfully", invitation.getId());
        return mapToInvitationResponse(invitation);
    }

    private ProjectInvitation createInvitation(Project project, InviteDetail detail, User inviter, String message) {
        String token = UUID.randomUUID().toString();
        LocalDateTime expiresAt = LocalDateTime.now().plusDays(invitationExpirationDays);

        log.info("Creating invitation with token: {} for email: {}", token, detail.getEmail());

        User existingUser = userRepository.findByEmail(detail.getEmail()).orElse(null);
        if (existingUser != null) {
            log.info("Found existing user for email: {}", detail.getEmail());
        }

        return ProjectInvitation.builder()
                .project(project)
                .email(detail.getEmail())
                .invitedName(detail.getName())
                .role(detail.getRole())
                .invitedBy(inviter)
                .user(existingUser)
                .token(token)
                .message(message)
                .expiresAt(expiresAt)
                .build();
    }

    @Async
    private void sendInvitationEmailAsync(ProjectInvitation invitation) {
        try {
            log.info("Sending invitation email to: {}", invitation.getEmail());

            String inviteUrl = baseUrl + "/invite/" + invitation.getToken();
            String inviterName = invitation.getInvitedBy().getFullName();
            String projectName = invitation.getProject().getName();
            String recipientName = invitation.getInvitedName() != null ?
                    invitation.getInvitedName() : invitation.getEmail();

            emailService.sendProjectInvitationEmail(
                    invitation.getEmail(),
                    recipientName,
                    inviterName,
                    projectName,
                    inviteUrl,
                    invitation.getMessage(),
                    invitation.getExpiresAt()
            );

            log.info("Invitation email sent successfully to: {}", invitation.getEmail());
        } catch (Exception e) {
            log.error("Failed to send invitation email to {}: {}", invitation.getEmail(), e.getMessage(), e);
        }
    }

    private Project findProjectWithAccess(Long projectId, User user) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new AuthException("Project not found"));

        if (!projectRepository.hasUserAccessToProject(user, projectId)) {
            throw new AuthException("You don't have access to this project");
        }

        return project;
    }

    private boolean canUserManageMembers(User user, Project project) {
        if (project.getOwner().equals(user)) {
            return true;
        }

        return projectMemberRepository.findByProjectAndUser(project, user)
                .map(ProjectMember::canManageMembers)
                .orElse(false);
    }

    private boolean isUserAlreadyMember(Project project, String email) {
        return invitationRepository.isUserAlreadyMember(project, email);
    }

    private InvitationResponse mapToInvitationResponse(ProjectInvitation invitation) {
        return InvitationResponse.builder()
                .id(invitation.getId())
                .email(invitation.getEmail())
                .invitedName(invitation.getInvitedName())
                .role(invitation.getRole())
                .status(invitation.getStatus())
                .message(invitation.getMessage())
                .token(invitation.getToken())
                .expiresAt(invitation.getExpiresAt())
                .createdAt(invitation.getCreatedAt())
                .respondedAt(invitation.getRespondedAt())
                .responseMessage(invitation.getResponseMessage())
                .project(mapToProjectSummary(invitation.getProject()))
                .invitedBy(mapToUserSummary(invitation.getInvitedBy()))
                .user(invitation.getUser() != null ? mapToUserSummary(invitation.getUser()) : null)
                .build();
    }

    private InvitationSummary mapToInvitationSummary(ProjectInvitation invitation) {
        return InvitationSummary.builder()
                .id(invitation.getId())
                .email(invitation.getEmail())
                .invitedName(invitation.getInvitedName())
                .role(invitation.getRole())
                .status(invitation.getStatus())
                .expiresAt(invitation.getExpiresAt())
                .createdAt(invitation.getCreatedAt())
                .project(mapToProjectSummary(invitation.getProject()))
                .invitedBy(mapToUserSummary(invitation.getInvitedBy()))
                .build();
    }

    private ProjectSummary mapToProjectSummary(Project project) {
        return ProjectSummary.builder()
                .id(project.getId())
                .name(project.getName())
                .description(project.getDescription())
                .color(project.getColor())
                .teamSize(project.getTeamSize())
                .build();
    }

    private UserSummary mapToUserSummary(User user) {
        return UserSummary.builder()
                .id(user.getId())
                .username(user.getUsername())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .avatar(user.getAvatar())
                .jobTitle(user.getJobTitle())
                .build();
    }
}