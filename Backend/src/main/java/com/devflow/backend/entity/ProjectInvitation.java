package com.devflow.backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "project_invitations",
        uniqueConstraints = @UniqueConstraint(columnNames = {"project_id", "email"}))
public class ProjectInvitation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @NotBlank
    @Email
    @Column(nullable = false)
    private String email;

    @Column(name = "invited_name")
    private String invitedName;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false)
    private ProjectRole role = ProjectRole.DEVELOPER;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invited_by_id", nullable = false)
    private User invitedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, unique = true)
    private String token;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false)
    private InvitationStatus status = InvitationStatus.PENDING;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "responded_at")
    private LocalDateTime respondedAt;

    @Column(columnDefinition = "TEXT")
    private String responseMessage;

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }

    public boolean isPending() {
        return status == InvitationStatus.PENDING && !isExpired();
    }

    public void accept(String responseMessage) {
        this.status = InvitationStatus.ACCEPTED;
        this.respondedAt = LocalDateTime.now();
        this.responseMessage = responseMessage;
    }

    public void decline(String responseMessage) {
        this.status = InvitationStatus.DECLINED;
        this.respondedAt = LocalDateTime.now();
        this.responseMessage = responseMessage;
    }

    public void expire() {
        if (status == InvitationStatus.PENDING) {
            this.status = InvitationStatus.EXPIRED;
        }
    }
}