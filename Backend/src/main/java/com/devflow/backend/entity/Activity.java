package com.devflow.backend.entity;

import jakarta.persistence.*;
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
@Table(name = "activities", indexes = {
        @Index(name = "idx_activity_project_created", columnList = "project_id, created_at"),
        @Index(name = "idx_activity_user_created", columnList = "user_id, created_at")
})
public class Activity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ActivityType type;

    @NotBlank
    @Column(nullable = false)
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id")
    private Task task;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_user_id")
    private User targetUser;

    @Column(columnDefinition = "TEXT")
    private String metadata;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public static Activity projectCreated(User user, Project project) {
        return Activity.builder()
                .type(ActivityType.PROJECT_CREATED)
                .description(String.format("%s created project \"%s\"",
                        user.getFullName(), project.getName()))
                .user(user)
                .project(project)
                .build();
    }

    public static Activity taskCreated(User user, Task task) {
        return Activity.builder()
                .type(ActivityType.TASK_CREATED)
                .description(String.format("%s created task \"%s\"",
                        user.getFullName(), task.getTitle()))
                .user(user)
                .project(task.getProject())
                .task(task)
                .build();
    }

    public static Activity taskCompleted(User user, Task task) {
        return Activity.builder()
                .type(ActivityType.TASK_COMPLETED)
                .description(String.format("%s completed task \"%s\"",
                        user.getFullName(), task.getTitle()))
                .user(user)
                .project(task.getProject())
                .task(task)
                .build();
    }

    public static Activity memberAdded(User inviter, User newMember, Project project) {
        return Activity.builder()
                .type(ActivityType.MEMBER_ADDED)
                .description(String.format("%s added %s to the project",
                        inviter.getFullName(), newMember.getFullName()))
                .user(inviter)
                .project(project)
                .targetUser(newMember)
                .build();
    }

    public static Activity taskAssigned(User assigner, Task task, User assignee) {
        return Activity.builder()
                .type(ActivityType.TASK_ASSIGNED)
                .description(String.format("%s assigned task \"%s\" to %s",
                        assigner.getFullName(),
                        task.getTitle(),
                        assignee.getFullName()))
                .user(assigner)
                .project(task.getProject())
                .task(task)
                .targetUser(assignee)
                .build();
    }

    public static Activity taskCommented(User user, Task task) {
        return Activity.builder()
                .type(ActivityType.TASK_COMMENTED)
                .description(String.format("%s commented on task \"%s\"",
                        user.getFullName(), task.getTitle()))
                .user(user)
                .project(task.getProject())
                .task(task)
                .build();
    }
}