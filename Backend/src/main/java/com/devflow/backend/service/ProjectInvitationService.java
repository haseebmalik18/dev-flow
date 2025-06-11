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
        Project project = findProjectWithAccess(projectId, inviter);

        if (!canUserManageMembers(inviter, project)) {
            throw new AuthException("You don't have permission to invite members to this project");
        }

        List<String> errors = new ArrayList<>();
        List<InvitationResponse> successful = new ArrayList<>();
        int successCount = 0;

        for (InviteDetail detail : request.getInvitations()) {
            try {

                if (isUserAlreadyMember(project, detail.getEmail())) {
                    errors.add("User " + detail.getEmail() + " is already a member of this project");
                    continue;
                }


                invitationRepository.cancelExistingInvitations(project, detail.getEmail());


                ProjectInvitation invitation = createInvitation(project, detail, inviter, request.getMessage());
                invitation = invitationRepository.save(invitation);


                sendInvitationEmailAsync(invitation);


                Activity activity = Activity.builder()
                        .type(ActivityType.MEMBER_INVITED)
                        .description(String.format("%s invited %s to the project",
                                inviter.getFullName(), detail.getEmail()))
                        .user(inviter)
                        .project(project)
                        .build();
                activityRepository.save(activity);

                successful.add(mapToInvitationResponse(invitation));
                successCount++;

                log.info("Invitation sent: {} to project: {} by: {}",
                        detail.getEmail(), project.getName(), inviter.getUsername());

            } catch (Exception e) {
                log.error("Failed to send invitation to {}: {}", detail.getEmail(), e.getMessage());
                errors.add("Failed to invite " + detail.getEmail() + ": " + e.getMessage());
            }
        }

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
        List<ProjectInvitation> invitations = invitationRepository
                .findPendingInvitationsByEmail(user.getEmail(), LocalDateTime.now());

        return invitations.stream()
                .map(this::mapToInvitationResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<InvitationSummary> getProjectInvitations(Long projectId, User user, int page, int size) {
        Project project = findProjectWithAccess(projectId, user);
        Pageable pageable = PageRequest.of(page, size);

        Page<ProjectInvitation> invitations = invitationRepository
                .findByProjectOrderByCreatedAtDesc(project, pageable);

        return invitations.map(this::mapToInvitationSummary);
    }

    @Transactional(readOnly = true)
    public InvitationResponse getInvitationByToken(String token) {
        ProjectInvitation invitation = invitationRepository.findByToken(token)
                .orElseThrow(() -> new AuthException("Invitation not found"));

        if (invitation.isExpired()) {
            throw new AuthException("This invitation has expired");
        }

        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new AuthException("This invitation is no longer valid");
        }

        return mapToInvitationResponse(invitation);
    }

    public InvitationResponse respondToInvitation(String token, RespondToInvitationRequest request, User user) {
        ProjectInvitation invitation = invitationRepository.findByToken(token)
                .orElseThrow(() -> new AuthException("Invitation not found"));

        if (invitation.isExpired()) {
            throw new AuthException("This invitation has expired");
        }

        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new AuthException("This invitation has already been responded to");
        }

        if (!invitation.getEmail().equalsIgnoreCase(user.getEmail())) {
            throw new AuthException("This invitation is not for your email address");
        }


        if (projectMemberRepository.existsByProjectAndUser(invitation.getProject(), user)) {
            throw new AuthException("You are already a member of this project");
        }

        if ("accept".equalsIgnoreCase(request.getAction())) {
            return acceptInvitation(invitation, user, request.getMessage());
        } else if ("decline".equalsIgnoreCase(request.getAction())) {
            return declineInvitation(invitation, request.getMessage());
        } else {
            throw new AuthException("Invalid action. Must be 'accept' or 'decline'");
        }
    }

    public void cancelInvitation(Long invitationId, User user) {
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
                .type(ActivityType.INVITATION_CANCELLED)
                .description(String.format("%s cancelled invitation for %s",
                        user.getFullName(), invitation.getEmail()))
                .user(user)
                .project(invitation.getProject())
                .build();
        activityRepository.save(activity);

        log.info("Invitation cancelled: {} by: {}", invitation.getEmail(), user.getUsername());
    }

    @Transactional(readOnly = true)
    public InvitationStatsResponse getInvitationStats(User user) {
        Object stats = invitationRepository.getInvitationStatsByUser(user);


        return InvitationStatsResponse.builder()
                .totalSent(0L)
                .pending(0L)
                .accepted(0L)
                .declined(0L)
                .expired(0L)
                .build();
    }


    @Scheduled(fixedRate = 3600000) // Run every hour
    @Transactional
    public void cleanupExpiredInvitations() {
        int updated = invitationRepository.markExpiredInvitations(LocalDateTime.now());
        if (updated > 0) {
            log.info("Marked {} invitations as expired", updated);
        }


        LocalDateTime cutoff = LocalDateTime.now().minusDays(30);
        invitationRepository.deleteOldInvitations(cutoff);
    }



    private InvitationResponse acceptInvitation(ProjectInvitation invitation, User user, String responseMessage) {
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
                .type(ActivityType.INVITATION_ACCEPTED)
                .description(String.format("%s accepted invitation to join the project",
                        user.getFullName()))
                .user(user)
                .project(invitation.getProject())
                .build();
        activityRepository.save(activity);

        log.info("Invitation accepted: {} joined project: {}",
                user.getUsername(), invitation.getProject().getName());

        return mapToInvitationResponse(invitation);
    }

    private InvitationResponse declineInvitation(ProjectInvitation invitation, String responseMessage) {
        invitation.decline(responseMessage);
        invitation = invitationRepository.save(invitation);


        Activity activity = Activity.builder()
                .type(ActivityType.INVITATION_DECLINED)
                .description(String.format("Invitation declined by %s",
                        invitation.getEmail()))
                .user(invitation.getInvitedBy())
                .project(invitation.getProject())
                .build();
        activityRepository.save(activity);

        log.info("Invitation declined: {} for project: {}",
                invitation.getEmail(), invitation.getProject().getName());

        return mapToInvitationResponse(invitation);
    }

    private ProjectInvitation createInvitation(Project project, InviteDetail detail, User inviter, String message) {
        String token = UUID.randomUUID().toString();
        LocalDateTime expiresAt = LocalDateTime.now().plusDays(invitationExpirationDays);


        User existingUser = userRepository.findByEmail(detail.getEmail()).orElse(null);

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
        } catch (Exception e) {
            log.error("Failed to send invitation email to {}: {}",
                    invitation.getEmail(), e.getMessage());
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