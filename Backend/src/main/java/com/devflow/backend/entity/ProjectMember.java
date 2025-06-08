package com.devflow.backend.entity;

import jakarta.persistence.*;
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
@Table(name = "project_members",
        uniqueConstraints = @UniqueConstraint(columnNames = {"project_id", "user_id"}))
public class ProjectMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false)
    private ProjectRole role = ProjectRole.DEVELOPER;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invited_by_id")
    private User invitedBy;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime joinedAt;


    public boolean canManageProject() {
        return role == ProjectRole.OWNER || role == ProjectRole.ADMIN;
    }

    public boolean canManageMembers() {
        return role == ProjectRole.OWNER ||
                role == ProjectRole.ADMIN ||
                role == ProjectRole.MANAGER;
    }

    public boolean canCreateTasks() {
        return role != ProjectRole.VIEWER;
    }

    public boolean canEditTasks() {
        return role != ProjectRole.VIEWER;
    }

    public boolean canDeleteTasks() {
        return role == ProjectRole.OWNER ||
                role == ProjectRole.ADMIN ||
                role == ProjectRole.MANAGER;
    }
}