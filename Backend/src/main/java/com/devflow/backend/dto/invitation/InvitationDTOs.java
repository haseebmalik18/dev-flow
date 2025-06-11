package com.devflow.backend.dto.invitation;

import com.devflow.backend.entity.InvitationStatus;
import com.devflow.backend.entity.ProjectRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

public class InvitationDTOs {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SendInvitationRequest {
        @NotEmpty(message = "At least one invitation is required")
        private List<InviteDetail> invitations;

        @Size(max = 500, message = "Message cannot exceed 500 characters")
        private String message;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InviteDetail {
        @NotBlank(message = "Email is required")
        @Email(message = "Email should be valid")
        private String email;

        private String name;

        @Builder.Default
        private ProjectRole role = ProjectRole.DEVELOPER;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RespondToInvitationRequest {
        @NotBlank(message = "Response is required")
        private String action;

        @Size(max = 500, message = "Message cannot exceed 500 characters")
        private String message;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InvitationResponse {
        private Long id;
        private String email;
        private String invitedName;
        private ProjectRole role;
        private InvitationStatus status;
        private String message;
        private LocalDateTime expiresAt;
        private LocalDateTime createdAt;
        private LocalDateTime respondedAt;
        private String responseMessage;


        private ProjectSummary project;
        private UserSummary invitedBy;
        private UserSummary user;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InvitationSummary {
        private Long id;
        private String email;
        private String invitedName;
        private ProjectRole role;
        private InvitationStatus status;
        private LocalDateTime expiresAt;
        private LocalDateTime createdAt;

        private ProjectSummary project;
        private UserSummary invitedBy;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProjectSummary {
        private Long id;
        private String name;
        private String description;
        private String color;
        private Integer teamSize;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserSummary {
        private Long id;
        private String username;
        private String firstName;
        private String lastName;
        private String avatar;
        private String jobTitle;

        public String getFullName() {
            return firstName + " " + lastName;
        }

        public String getInitials() {
            return (firstName.substring(0, 1) + lastName.substring(0, 1)).toUpperCase();
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InvitationStatsResponse {
        private Long totalSent;
        private Long pending;
        private Long accepted;
        private Long declined;
        private Long expired;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SendInvitationResponse {
        private Integer totalInvitations;
        private Integer successfulInvitations;
        private Integer failedInvitations;
        private List<String> errors;
        private List<InvitationResponse> invitations;
    }
}