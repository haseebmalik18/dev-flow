package com.devflow.backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "projects")
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(min = 2, max = 100)
    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false)
    private ProjectStatus status = ProjectStatus.PLANNING;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false)
    private Priority priority = Priority.MEDIUM;

    @Column(name = "start_date")
    private LocalDateTime startDate;

    @Column(name = "due_date")
    private LocalDateTime dueDate;

    @Column(name = "completed_date")
    private LocalDateTime completedDate;


    @Builder.Default
    @Column(length = 7)
    private String color = "#3B82F6"; // Default blue


    @Builder.Default
    @Column(nullable = false)
    private Integer progress = 0;


    @Column(precision = 10, scale = 2)
    private java.math.BigDecimal budget;

    @Column(precision = 10, scale = 2)
    private java.math.BigDecimal spent;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;


    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ProjectMember> members = new ArrayList<>();


    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Task> tasks = new ArrayList<>();


    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Activity> activities = new ArrayList<>();

    @Builder.Default
    @Column(nullable = false)
    private Boolean isArchived = false;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;


    public void addMember(ProjectMember member) {
        members.add(member);
        member.setProject(this);
    }

    public void removeMember(ProjectMember member) {
        members.remove(member);
        member.setProject(null);
    }

    public void addTask(Task task) {
        tasks.add(task);
        task.setProject(this);
    }

    public void removeTask(Task task) {
        tasks.remove(task);
        task.setProject(null);
    }

    public int getTeamSize() {
        return members.size();
    }

    public long getCompletedTasksCount() {
        return tasks.stream()
                .filter(task -> task.getStatus() == TaskStatus.DONE)
                .count();
    }

    public int getTotalTasksCount() {
        return tasks.size();
    }


    public void updateProgress() {
        if (tasks.isEmpty()) {
            this.progress = 0;
            return;
        }

        long completedTasks = getCompletedTasksCount();
        this.progress = (int) ((completedTasks * 100) / tasks.size());
    }


    public ProjectHealth getHealthStatus() {
        if (status == ProjectStatus.COMPLETED) {
            return ProjectHealth.COMPLETED;
        }

        if (dueDate != null && LocalDateTime.now().isAfter(dueDate)) {
            return ProjectHealth.DELAYED;
        }

        if (dueDate != null) {
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime warningDate = dueDate.minusDays(7);

            if (now.isAfter(warningDate) && progress < 80) {
                return ProjectHealth.AT_RISK;
            }
        }

        return ProjectHealth.ON_TRACK;
    }
}