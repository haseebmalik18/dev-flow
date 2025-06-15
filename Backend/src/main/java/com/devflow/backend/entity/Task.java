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
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "tasks")
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(min = 2, max = 200)
    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false)
    private TaskStatus status = TaskStatus.TODO;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false)
    private Priority priority = Priority.MEDIUM;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creator_id", nullable = false)
    private User creator;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    private User assignee;

    @Column(name = "due_date")
    private LocalDateTime dueDate;

    @Column(name = "completed_date")
    private LocalDateTime completedDate;

    @Column(length = 500)
    private String tags;

    @Column(name = "story_points")
    private Integer storyPoints;

    @ManyToMany
    @JoinTable(
            name = "task_dependencies",
            joinColumns = @JoinColumn(name = "task_id"),
            inverseJoinColumns = @JoinColumn(name = "dependency_id")
    )
    @Builder.Default
    private List<Task> dependencies = new ArrayList<>();

    @ManyToMany(mappedBy = "dependencies")
    @Builder.Default
    private List<Task> dependentTasks = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_task_id")
    private Task parentTask;

    @OneToMany(mappedBy = "parentTask", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Task> subtasks = new ArrayList<>();

    @OneToMany(mappedBy = "task", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Comment> comments = new ArrayList<>();


    @OneToMany(mappedBy = "task", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<TaskAttachment> attachments = new ArrayList<>();

    @Builder.Default
    @Column(nullable = false)
    private Integer progress = 0;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isArchived = false;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;


    public void addSubtask(Task subtask) {
        subtasks.add(subtask);
        subtask.setParentTask(this);
    }

    public void removeSubtask(Task subtask) {
        subtasks.remove(subtask);
        subtask.setParentTask(null);
    }

    public void addDependency(Task dependency) {
        dependencies.add(dependency);
        dependency.getDependentTasks().add(this);
    }

    public void removeDependency(Task dependency) {
        dependencies.remove(dependency);
        dependency.getDependentTasks().remove(this);
    }

    public void addComment(Comment comment) {
        comments.add(comment);
        comment.setTask(this);
    }

    public boolean isOverdue() {
        if (dueDate == null || status == TaskStatus.DONE || status == TaskStatus.CANCELLED) {
            return false;
        }
        return LocalDateTime.now().isAfter(dueDate);
    }

    public boolean isBlocked() {
        return dependencies.stream()
                .anyMatch(dep -> dep.getStatus() != TaskStatus.DONE);
    }

    public void completeTask() {
        this.status = TaskStatus.DONE;
        this.progress = 100;
        this.completedDate = LocalDateTime.now();
    }

    public List<String> getTagList() {
        if (tags == null || tags.trim().isEmpty()) {
            return new ArrayList<>();
        }
        return List.of(tags.split(","));
    }

    public void setTagList(List<String> tagList) {
        if (tagList == null || tagList.isEmpty()) {
            this.tags = null;
        } else {
            this.tags = String.join(",", tagList);
        }
    }

    public void updateProgressFromSubtasks() {
        if (subtasks.isEmpty()) {
            return;
        }

        double averageProgress = subtasks.stream()
                .mapToInt(Task::getProgress)
                .average()
                .orElse(0.0);

        this.progress = (int) Math.round(averageProgress);

        boolean allSubtasksDone = subtasks.stream()
                .allMatch(subtask -> subtask.getStatus() == TaskStatus.DONE);

        if (allSubtasksDone && this.status != TaskStatus.DONE) {
            completeTask();
        }
    }


    public void addAttachment(TaskAttachment attachment) {
        attachments.add(attachment);
        attachment.setTask(this);
    }

    public void removeAttachment(TaskAttachment attachment) {
        attachments.remove(attachment);
        attachment.setTask(null);
    }

    public int getAttachmentsCount() {
        return (int) attachments.stream()
                .filter(attachment -> !attachment.getIsDeleted())
                .count();
    }

    public long getTotalAttachmentSize() {
        return attachments.stream()
                .filter(attachment -> !attachment.getIsDeleted())
                .mapToLong(TaskAttachment::getFileSize)
                .sum();
    }

    public boolean hasAttachments() {
        return attachments.stream()
                .anyMatch(attachment -> !attachment.getIsDeleted());
    }

    public List<TaskAttachment> getActiveAttachments() {
        return attachments.stream()
                .filter(attachment -> !attachment.getIsDeleted())
                .collect(Collectors.toList());
    }

    public List<TaskAttachment> getImageAttachments() {
        return attachments.stream()
                .filter(attachment -> !attachment.getIsDeleted() && attachment.isImage())
                .collect(Collectors.toList());
    }

    public List<TaskAttachment> getDocumentAttachments() {
        return attachments.stream()
                .filter(attachment -> !attachment.getIsDeleted() && attachment.isDocument())
                .collect(Collectors.toList());
    }

    public String getFormattedAttachmentSize() {
        long bytes = getTotalAttachmentSize();
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return String.format("%.1f KB", bytes / 1024.0);
        if (bytes < 1024 * 1024 * 1024) return String.format("%.1f MB", bytes / (1024.0 * 1024.0));
        return String.format("%.1f GB", bytes / (1024.0 * 1024.0 * 1024.0));
    }
}