package com.devflow.backend.controller;

import com.devflow.backend.dto.common.ApiResponse;
import com.devflow.backend.dto.project.ProjectDTOs.*;
import com.devflow.backend.entity.*;
import com.devflow.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final ActivityRepository activityRepository;

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboardStats(
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();

        Page<Project> userProjectsPage = projectRepository
                .findProjectsByUserMembership(user, Pageable.unpaged());
        List<Project> userProjects = userProjectsPage.getContent();

        Page<Task> userTasksPage = taskRepository
                .findByAssigneeAndIsArchivedFalseOrderByDueDateAsc(user, Pageable.unpaged());
        List<Task> userTasks = userTasksPage.getContent();

        long activeProjects = userProjects.stream()
                .filter(p -> p.getStatus() == ProjectStatus.ACTIVE)
                .count();

        long completedTasks = userTasks.stream()
                .filter(t -> t.getStatus() == TaskStatus.DONE)
                .count();

        long overdueTasks = userTasks.stream()
                .filter(Task::isOverdue)
                .count();

        Set<Long> uniqueTeamMemberIds = new HashSet<>();
        for (Project project : userProjects) {
            uniqueTeamMemberIds.addAll(project.getMembers().stream()
                    .map(projectMember -> projectMember.getUser().getId())
                    .collect(Collectors.toSet()));
        }
        long teamMembers = uniqueTeamMemberIds.size();

        LocalDateTime lastMonth = LocalDateTime.now().minus(1, ChronoUnit.MONTHS);

        double activeProjectsChange = calculateActiveProjectsChange(user, lastMonth);
        double completedTasksChange = calculateCompletedTasksChange(user, lastMonth);
        double teamMembersChange = calculateTeamMembersChange(user, lastMonth);

        Map<String, Object> stats = new HashMap<>();
        stats.put("activeProjects", activeProjects);
        stats.put("activeProjectsChange", activeProjectsChange);
        stats.put("completedTasks", completedTasks);
        stats.put("completedTasksChange", completedTasksChange);
        stats.put("teamMembers", teamMembers);
        stats.put("teamMembersChange", teamMembersChange);
        stats.put("overdueTasks", overdueTasks);

        return ResponseEntity.ok(ApiResponse.success("Dashboard stats retrieved successfully", stats));
    }

    @GetMapping("/recent-activity")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getRecentActivity(
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        LocalDateTime since = LocalDateTime.now().minusDays(7);

        Page<Activity> activitiesPage = activityRepository
                .findRecentActivitiesByUserProjects(user, since, PageRequest.of(0, 20));
        List<Activity> activities = activitiesPage.getContent();

        List<Map<String, Object>> activityData = activities.stream()
                .map(this::mapActivityToResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success("Recent activity retrieved successfully", activityData));
    }

    @GetMapping("/projects-overview")
    public ResponseEntity<ApiResponse<List<ProjectSummary>>> getProjectsOverview(
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();

        Page<Project> projectsPage = projectRepository
                .findProjectsByUserMembership(user, PageRequest.of(0, 6));
        List<Project> projects = projectsPage.getContent();

        List<ProjectSummary> projectSummaries = projects.stream()
                .map(this::mapToProjectSummary)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success("Projects overview retrieved successfully", projectSummaries));
    }

    @GetMapping("/tasks-overview")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTasksOverview(
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();

        Page<Task> userTasksPage = taskRepository
                .findByAssigneeAndIsArchivedFalseOrderByDueDateAsc(user, PageRequest.of(0, 10));
        List<Task> userTasks = userTasksPage.getContent();

        Map<String, Object> taskOverview = new HashMap<>();

        Map<String, Long> taskStats = new HashMap<>();
        taskStats.put("total", (long) userTasks.size());
        taskStats.put("todo", userTasks.stream().filter(t -> t.getStatus() == TaskStatus.TODO).count());
        taskStats.put("inProgress", userTasks.stream().filter(t -> t.getStatus() == TaskStatus.IN_PROGRESS).count());
        taskStats.put("review", userTasks.stream().filter(t -> t.getStatus() == TaskStatus.REVIEW).count());
        taskStats.put("completed", userTasks.stream().filter(t -> t.getStatus() == TaskStatus.DONE).count());
        taskStats.put("overdue", userTasks.stream().filter(Task::isOverdue).count());

        List<Map<String, Object>> recentTasks = userTasks.stream()
                .limit(5)
                .map(this::mapTaskToResponse)
                .collect(Collectors.toList());

        taskOverview.put("stats", taskStats);
        taskOverview.put("recentTasks", recentTasks);

        return ResponseEntity.ok(ApiResponse.success("Tasks overview retrieved successfully", taskOverview));
    }

    @GetMapping("/user-profile")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getUserProfile(
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();

        Map<String, Object> profile = new HashMap<>();
        profile.put("id", user.getId());
        profile.put("username", user.getUsername());
        profile.put("firstName", user.getFirstName());
        profile.put("lastName", user.getLastName());
        profile.put("email", user.getEmail());
        profile.put("avatar", user.getAvatar());
        profile.put("role", user.getRole().name());
        profile.put("jobTitle", user.getJobTitle());
        profile.put("bio", user.getBio());
        profile.put("isVerified", user.getIsVerified());
        profile.put("lastLoginAt", user.getLastLoginAt());

        return ResponseEntity.ok(ApiResponse.success("User profile retrieved successfully", profile));
    }

    private double calculateActiveProjectsChange(User user, LocalDateTime lastMonth) {
        try {
            Page<Project> currentProjects = projectRepository.findProjectsByUserMembership(user, Pageable.unpaged());
            long currentActiveCount = currentProjects.getContent().stream()
                    .filter(p -> p.getStatus() == ProjectStatus.ACTIVE)
                    .count();

            long lastMonthActiveCount = currentProjects.getContent().stream()
                    .filter(p -> p.getCreatedAt().isBefore(lastMonth))
                    .filter(p -> p.getStatus() == ProjectStatus.ACTIVE || p.getStatus() == ProjectStatus.COMPLETED)
                    .count();

            if (lastMonthActiveCount == 0) {
                return currentActiveCount > 0 ? 100.0 : 0.0;
            }

            return ((double) (currentActiveCount - lastMonthActiveCount) / lastMonthActiveCount) * 100;
        } catch (Exception e) {
            return 0.0;
        }
    }

    private double calculateCompletedTasksChange(User user, LocalDateTime lastMonth) {
        try {
            Page<Task> currentTasks = taskRepository.findByAssigneeAndIsArchivedFalseOrderByDueDateAsc(user, Pageable.unpaged());
            long currentCompletedCount = currentTasks.getContent().stream()
                    .filter(t -> t.getStatus() == TaskStatus.DONE)
                    .filter(t -> t.getCompletedDate() != null && t.getCompletedDate().isAfter(lastMonth))
                    .count();

            LocalDateTime twoMonthsAgo = lastMonth.minus(1, ChronoUnit.MONTHS);
            long lastMonthCompletedCount = currentTasks.getContent().stream()
                    .filter(t -> t.getStatus() == TaskStatus.DONE)
                    .filter(t -> t.getCompletedDate() != null)
                    .filter(t -> t.getCompletedDate().isAfter(twoMonthsAgo) && t.getCompletedDate().isBefore(lastMonth))
                    .count();

            if (lastMonthCompletedCount == 0) {
                return currentCompletedCount > 0 ? 100.0 : 0.0;
            }

            return ((double) (currentCompletedCount - lastMonthCompletedCount) / lastMonthCompletedCount) * 100;
        } catch (Exception e) {
            return 0.0;
        }
    }

    private double calculateTeamMembersChange(User user, LocalDateTime lastMonth) {
        try {
            Page<Project> currentProjects = projectRepository.findProjectsByUserMembership(user, Pageable.unpaged());

            Set<Long> currentUniqueTeamMemberIds = new HashSet<>();
            for (Project project : currentProjects.getContent()) {
                currentUniqueTeamMemberIds.addAll(project.getMembers().stream()
                        .map(projectMember -> projectMember.getUser().getId())
                        .collect(Collectors.toSet()));
            }
            long currentTeamMembers = currentUniqueTeamMemberIds.size();

            Set<Long> lastMonthUniqueTeamMemberIds = new HashSet<>();
            for (Project project : currentProjects.getContent()) {
                if (project.getCreatedAt().isBefore(lastMonth)) {
                    lastMonthUniqueTeamMemberIds.addAll(project.getMembers().stream()
                            .map(projectMember -> projectMember.getUser().getId())
                            .collect(Collectors.toSet()));
                }
            }
            long lastMonthTeamMembers = lastMonthUniqueTeamMemberIds.size();

            if (lastMonthTeamMembers == 0) {
                return currentTeamMembers > 0 ? 100.0 : 0.0;
            }

            return ((double) (currentTeamMembers - lastMonthTeamMembers) / lastMonthTeamMembers) * 100;
        } catch (Exception e) {
            return 0.0;
        }
    }

    private Map<String, Object> mapActivityToResponse(Activity activity) {
        Map<String, Object> activityMap = new HashMap<>();
        activityMap.put("id", activity.getId());
        activityMap.put("type", activity.getType().name().toLowerCase());
        activityMap.put("description", activity.getDescription());
        activityMap.put("createdAt", activity.getCreatedAt());

        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("name", activity.getUser().getFullName());
        userInfo.put("initials", activity.getUser().getInitials());
        userInfo.put("avatar", activity.getUser().getAvatar());
        activityMap.put("user", userInfo);

        if (activity.getProject() != null) {
            activityMap.put("project", activity.getProject().getName());
        }

        if (activity.getTask() != null) {
            activityMap.put("task", activity.getTask().getTitle());
        }

        return activityMap;
    }

    private ProjectSummary mapToProjectSummary(Project project) {
        return ProjectSummary.builder()
                .id(project.getId())
                .name(project.getName())
                .description(project.getDescription())
                .status(project.getStatus())
                .priority(project.getPriority())
                .dueDate(project.getDueDate())
                .color(project.getColor())
                .progress(project.getProgress())
                .teamSize(project.getTeamSize())
                .totalTasks(project.getTotalTasksCount())
                .completedTasks((int) project.getCompletedTasksCount())
                .healthStatus(project.getHealthStatus())
                .updatedAt(project.getUpdatedAt())
                .build();
    }

    private Map<String, Object> mapTaskToResponse(Task task) {
        Map<String, Object> taskMap = new HashMap<>();
        taskMap.put("id", task.getId());
        taskMap.put("title", task.getTitle());
        taskMap.put("status", task.getStatus().name().toLowerCase());
        taskMap.put("priority", task.getPriority().name().toLowerCase());
        taskMap.put("dueDate", task.getDueDate());
        taskMap.put("isOverdue", task.isOverdue());
        taskMap.put("progress", task.getProgress());

        taskMap.put("project", task.getProject().getName());

        if (task.getAssignee() != null) {
            Map<String, Object> assigneeInfo = new HashMap<>();
            assigneeInfo.put("name", task.getAssignee().getFullName());
            assigneeInfo.put("initials", task.getAssignee().getInitials());
            assigneeInfo.put("avatar", task.getAssignee().getAvatar());
            taskMap.put("assignee", assigneeInfo);
        }

        return taskMap;
    }
}