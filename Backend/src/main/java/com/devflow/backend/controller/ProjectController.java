package com.devflow.backend.controller;

import com.devflow.backend.dto.common.ApiResponse;
import com.devflow.backend.dto.project.ProjectDTOs.*;
import com.devflow.backend.entity.*;
import com.devflow.backend.repository.*;
import com.devflow.backend.service.ProjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;
    private final ActivityRepository activityRepository;
    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final CommentRepository commentRepository;

    @PostMapping
    public ResponseEntity<ApiResponse<ProjectResponse>> createProject(
            @Valid @RequestBody CreateProjectRequest request,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        ProjectResponse project = projectService.createProject(request, user);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Project created successfully", project));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ProjectSummary>>> getUserProjects(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        Page<ProjectSummary> projects = projectService.getUserProjects(user, page, size, search);

        return ResponseEntity.ok(ApiResponse.success("Projects retrieved successfully", projects));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProjectResponse>> getProject(
            @PathVariable Long id,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        ProjectResponse project = projectService.getProjectById(id, user);

        return ResponseEntity.ok(ApiResponse.success("Project retrieved successfully", project));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ProjectResponse>> updateProject(
            @PathVariable Long id,
            @Valid @RequestBody UpdateProjectRequest request,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        ProjectResponse project = projectService.updateProject(id, request, user);

        return ResponseEntity.ok(ApiResponse.success("Project updated successfully", project));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Object>> archiveProject(
            @PathVariable Long id,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        projectService.archiveProject(id, user);

        return ResponseEntity.ok(ApiResponse.success("Project archived successfully"));
    }

    @PostMapping("/{id}/members")
    public ResponseEntity<ApiResponse<ProjectMemberResponse>> addMember(
            @PathVariable Long id,
            @Valid @RequestBody AddMemberRequest request,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        ProjectMemberResponse member = projectService.addMember(id, request, user);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Member added successfully", member));
    }

    @GetMapping("/{id}/members")
    public ResponseEntity<ApiResponse<List<ProjectMemberResponse>>> getProjectMembers(
            @PathVariable Long id,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        List<ProjectMemberResponse> members = projectService.getProjectMembers(id, user);

        return ResponseEntity.ok(ApiResponse.success("Project members retrieved successfully", members));
    }

    @DeleteMapping("/{id}/members/{memberId}")
    public ResponseEntity<ApiResponse<Object>> removeMember(
            @PathVariable Long id,
            @PathVariable Long memberId,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        projectService.removeMember(id, memberId, user);

        return ResponseEntity.ok(ApiResponse.success("Member removed successfully"));
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<ProjectStatsResponse>> getUserProjectStats(
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        ProjectStatsResponse stats = projectService.getUserProjectStats(user);

        return ResponseEntity.ok(ApiResponse.success("Project statistics retrieved successfully", stats));
    }

    @GetMapping("/{id}/health")
    public ResponseEntity<ApiResponse<ProjectHealthResponse>> getProjectHealth(
            @PathVariable Long id,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        ProjectResponse project = projectService.getProjectById(id, user);

        ProjectHealthResponse health = calculateProjectHealth(project);

        return ResponseEntity.ok(ApiResponse.success("Project health retrieved successfully", health));
    }



    @GetMapping("/{id}/activity/recent")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getProjectRecentActivity(
            @PathVariable Long id,
            @RequestParam(defaultValue = "7") int days,
            @RequestParam(defaultValue = "20") int limit,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();


        Project project = findProjectWithAccess(id, user);

        LocalDateTime since = LocalDateTime.now().minusDays(days);

        Page<Activity> activitiesPage = activityRepository
                .findByProjectOrderByCreatedAtDesc(project, PageRequest.of(0, limit));
        List<Activity> activities = activitiesPage.getContent().stream()
                .filter(activity -> activity.getCreatedAt().isAfter(since))
                .collect(Collectors.toList());

        List<Map<String, Object>> activityData = activities.stream()
                .map(this::mapActivityToResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success("Project recent activity retrieved successfully", activityData));
    }

    @GetMapping("/{id}/activity/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getProjectActivityStats(
            @PathVariable Long id,
            @RequestParam(defaultValue = "30") int days,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();


        Project project = findProjectWithAccess(id, user);

        LocalDateTime since = LocalDateTime.now().minusDays(days);


        Object rawStats = activityRepository.getActivityStatsByProject(project, since);
        @SuppressWarnings("unchecked")
        Map<String, Object> activityStats = rawStats instanceof Map ?
                (Map<String, Object>) rawStats : new HashMap<>();


        List<Task> projectTasks = taskRepository.findByProjectAndIsArchivedFalseOrderByCreatedAtDesc(
                project, Pageable.unpaged()).getContent();

        List<Comment> projectComments = commentRepository.findByProjectOrderByCreatedAtDesc(project);

        long tasksCreatedThisPeriod = projectTasks.stream()
                .filter(task -> task.getCreatedAt().isAfter(since))
                .count();

        long tasksCompletedThisPeriod = projectTasks.stream()
                .filter(task -> task.getCompletedDate() != null && task.getCompletedDate().isAfter(since))
                .count();

        long commentsThisPeriod = projectComments.stream()
                .filter(comment -> comment.getCreatedAt().isAfter(since))
                .count();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalActivities", activityStats.getOrDefault("totalActivities", 0L));
        stats.put("activeUsers", activityStats.getOrDefault("activeUsers", 0L));
        stats.put("tasksCreated", tasksCreatedThisPeriod);
        stats.put("tasksCompleted", tasksCompletedThisPeriod);
        stats.put("commentsAdded", commentsThisPeriod);
        stats.put("period", days + " days");
        stats.put("since", since);

        return ResponseEntity.ok(ApiResponse.success("Project activity stats retrieved successfully", stats));
    }

    @GetMapping("/{id}/activity/timeline")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getProjectActivityTimeline(
            @PathVariable Long id,
            @RequestParam(defaultValue = "30") int days,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();

        Project project = findProjectWithAccess(id, user);

        LocalDateTime since = LocalDateTime.now().minusDays(days);
        LocalDateTime now = LocalDateTime.now();


        List<Activity> activities = activityRepository
                .findActivitiesByProjectAndDateRange(project, since, now);


        Map<String, List<Map<String, Object>>> timelineData = activities.stream()
                .collect(Collectors.groupingBy(
                        activity -> activity.getCreatedAt().toLocalDate().toString(),
                        Collectors.mapping(this::mapActivityToTimelineItem, Collectors.toList())
                ));


        Map<String, Long> dailyCounts = activities.stream()
                .collect(Collectors.groupingBy(
                        activity -> activity.getCreatedAt().toLocalDate().toString(),
                        Collectors.counting()
                ));

        Map<String, Object> timeline = new HashMap<>();
        timeline.put("activities", timelineData);
        timeline.put("dailyCounts", dailyCounts);
        timeline.put("totalActivities", activities.size());
        timeline.put("period", days + " days");
        timeline.put("projectName", project.getName());

        return ResponseEntity.ok(ApiResponse.success("Project activity timeline retrieved successfully", timeline));
    }

    @GetMapping("/{id}/activity/summary")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getProjectActivitySummary(
            @PathVariable Long id,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();

        Project project = findProjectWithAccess(id, user);

        LocalDateTime lastWeek = LocalDateTime.now().minusDays(7);
        LocalDateTime lastMonth = LocalDateTime.now().minusDays(30);


        List<Activity> weekActivities = activityRepository
                .findActivitiesByProjectAndDateRange(project, lastWeek, LocalDateTime.now());

        List<Activity> monthActivities = activityRepository
                .findActivitiesByProjectAndDateRange(project, lastMonth, LocalDateTime.now());


        Map<String, Long> activityTypeDistribution = monthActivities.stream()
                .collect(Collectors.groupingBy(
                        activity -> activity.getType().name(),
                        Collectors.counting()
                ));


        List<Map<String, Object>> mostActiveUsers = monthActivities.stream()
                .filter(activity -> activity.getUser() != null)
                .collect(Collectors.groupingBy(
                        activity -> activity.getUser(),
                        Collectors.counting()
                ))
                .entrySet().stream()
                .sorted(Map.Entry.<User, Long>comparingByValue().reversed())
                .limit(5)
                .map(entry -> {
                    User activityUser = entry.getKey();
                    Map<String, Object> userInfo = new HashMap<>();
                    userInfo.put("id", activityUser.getId());
                    userInfo.put("name", activityUser.getFullName());
                    userInfo.put("username", activityUser.getUsername());
                    userInfo.put("avatar", activityUser.getAvatar());
                    userInfo.put("activityCount", entry.getValue());
                    return userInfo;
                })
                .collect(Collectors.toList());


        double weeklyChange = calculateActivityChange(weekActivities.size(),
                monthActivities.size() - weekActivities.size());

        Map<String, Object> summary = new HashMap<>();
        summary.put("weeklyActivities", weekActivities.size());
        summary.put("monthlyActivities", monthActivities.size());
        summary.put("weeklyChange", weeklyChange);
        summary.put("activityTypes", activityTypeDistribution);
        summary.put("mostActiveUsers", mostActiveUsers);
        summary.put("projectName", project.getName());
        summary.put("lastUpdated", LocalDateTime.now());

        return ResponseEntity.ok(ApiResponse.success("Project activity summary retrieved successfully", summary));
    }

    @GetMapping("/{id}/activity/live")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getProjectLiveActivity(
            @PathVariable Long id,
            @RequestParam(defaultValue = "10") int limit,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();

        Project project = findProjectWithAccess(id, user);

        LocalDateTime lastHour = LocalDateTime.now().minusHours(1);

        List<Activity> liveActivities = activityRepository
                .findActivitiesByProjectAndDateRange(project, lastHour, LocalDateTime.now())
                .stream()
                .limit(limit)
                .collect(Collectors.toList());

        List<Map<String, Object>> activityData = liveActivities.stream()
                .map(this::mapActivityToLiveResponse)
                .collect(Collectors.toList());


        List<Map<String, Object>> activeUsers = liveActivities.stream()
                .filter(activity -> activity.getUser() != null)
                .map(Activity::getUser)
                .distinct()
                .map(activeUser -> {
                    Map<String, Object> userInfo = new HashMap<>();
                    userInfo.put("id", activeUser.getId());
                    userInfo.put("name", activeUser.getFullName());
                    userInfo.put("username", activeUser.getUsername());
                    userInfo.put("avatar", activeUser.getAvatar());
                    userInfo.put("initials", activeUser.getInitials());
                    return userInfo;
                })
                .collect(Collectors.toList());

        Map<String, Object> liveData = new HashMap<>();
        liveData.put("activities", activityData);
        liveData.put("activeUsers", activeUsers);
        liveData.put("activeUserCount", activeUsers.size());
        liveData.put("activityCount", liveActivities.size());
        liveData.put("projectName", project.getName());
        liveData.put("timestamp", LocalDateTime.now());

        return ResponseEntity.ok(ApiResponse.success("Project live activity retrieved successfully", liveData));
    }



    private Project findProjectWithAccess(Long projectId, User user) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        if (!projectRepository.hasUserAccessToProject(user, projectId)) {
            throw new RuntimeException("You don't have access to this project");
        }

        return project;
    }

    private ProjectHealthResponse calculateProjectHealth(ProjectResponse project) {
        List<String> suggestions = List.of();
        String message = "Project is on track";
        double riskScore = 0.0;

        switch (project.getHealthStatus()) {
            case ON_TRACK:
                message = "Project is progressing well and on schedule";
                riskScore = 10.0;
                break;
            case AT_RISK:
                message = "Project may face delays if current pace continues";
                riskScore = 60.0;
                suggestions = List.of(
                        "Consider adding more resources",
                        "Review task priorities",
                        "Check for blockers"
                );
                break;
            case DELAYED:
                message = "Project is behind schedule and needs immediate attention";
                riskScore = 90.0;
                suggestions = List.of(
                        "Reassess project scope",
                        "Extend deadline or reduce features",
                        "Add team members",
                        "Focus on critical path tasks"
                );
                break;
            case COMPLETED:
                message = "Project has been successfully completed";
                riskScore = 0.0;
                break;
        }

        return ProjectHealthResponse.builder()
                .status(project.getHealthStatus())
                .message(message)
                .suggestions(suggestions)
                .riskScore(riskScore)
                .build();
    }

    private Map<String, Object> mapActivityToResponse(Activity activity) {
        Map<String, Object> activityMap = new HashMap<>();
        activityMap.put("id", activity.getId());
        activityMap.put("type", activity.getType().name().toLowerCase());
        activityMap.put("description", activity.getDescription());
        activityMap.put("createdAt", activity.getCreatedAt());


        if (activity.getUser() != null) {
            Map<String, Object> userInfo = new HashMap<>();
            userInfo.put("id", activity.getUser().getId());
            userInfo.put("name", activity.getUser().getFullName());
            userInfo.put("username", activity.getUser().getUsername());
            userInfo.put("initials", activity.getUser().getInitials());
            userInfo.put("avatar", activity.getUser().getAvatar());
            activityMap.put("user", userInfo);
        }


        if (activity.getProject() != null) {
            Map<String, Object> projectInfo = new HashMap<>();
            projectInfo.put("id", activity.getProject().getId());
            projectInfo.put("name", activity.getProject().getName());
            projectInfo.put("color", activity.getProject().getColor());
            activityMap.put("project", projectInfo);
        }


        if (activity.getTask() != null) {
            Map<String, Object> taskInfo = new HashMap<>();
            taskInfo.put("id", activity.getTask().getId());
            taskInfo.put("title", activity.getTask().getTitle());
            taskInfo.put("status", activity.getTask().getStatus().name().toLowerCase());
            taskInfo.put("priority", activity.getTask().getPriority().name().toLowerCase());
            activityMap.put("task", taskInfo);
        }


        if (activity.getTargetUser() != null) {
            Map<String, Object> targetUserInfo = new HashMap<>();
            targetUserInfo.put("id", activity.getTargetUser().getId());
            targetUserInfo.put("name", activity.getTargetUser().getFullName());
            targetUserInfo.put("username", activity.getTargetUser().getUsername());
            activityMap.put("targetUser", targetUserInfo);
        }


        activityMap.put("timeAgo", calculateTimeAgo(activity.getCreatedAt()));
        activityMap.put("isRecent", activity.getCreatedAt().isAfter(LocalDateTime.now().minusHours(1)));

        return activityMap;
    }

    private Map<String, Object> mapActivityToTimelineItem(Activity activity) {
        Map<String, Object> item = new HashMap<>();
        item.put("id", activity.getId());
        item.put("type", activity.getType().name().toLowerCase());
        item.put("description", activity.getDescription());
        item.put("time", activity.getCreatedAt().toLocalTime().toString());
        item.put("timestamp", activity.getCreatedAt());

        if (activity.getUser() != null) {
            item.put("user", activity.getUser().getFullName());
            item.put("userAvatar", activity.getUser().getAvatar());
        }

        if (activity.getTask() != null) {
            item.put("taskTitle", activity.getTask().getTitle());
            item.put("taskId", activity.getTask().getId());
        }

        return item;
    }

    private Map<String, Object> mapActivityToLiveResponse(Activity activity) {
        Map<String, Object> liveActivity = mapActivityToResponse(activity);


        liveActivity.put("isLive", true);
        liveActivity.put("minutesAgo", ChronoUnit.MINUTES.between(activity.getCreatedAt(), LocalDateTime.now()));

        String activityPriority = determineActivityPriority(activity.getType());
        liveActivity.put("priority", activityPriority);


        liveActivity.put("icon", getActivityIcon(activity.getType()));

        return liveActivity;
    }

    private String calculateTimeAgo(LocalDateTime activityTime) {
        LocalDateTime now = LocalDateTime.now();
        long minutes = ChronoUnit.MINUTES.between(activityTime, now);

        if (minutes < 1) {
            return "just now";
        } else if (minutes < 60) {
            return minutes + " minute" + (minutes == 1 ? "" : "s") + " ago";
        } else if (minutes < 1440) { 
            long hours = minutes / 60;
            return hours + " hour" + (hours == 1 ? "" : "s") + " ago";
        } else {
            long days = minutes / 1440;
            return days + " day" + (days == 1 ? "" : "s") + " ago";
        }
    }

    private double calculateActivityChange(int currentPeriod, int previousPeriod) {
        if (previousPeriod == 0) {
            return currentPeriod > 0 ? 100.0 : 0.0;
        }
        return ((double) (currentPeriod - previousPeriod) / previousPeriod) * 100;
    }

    private String determineActivityPriority(ActivityType type) {
        switch (type) {
            case TASK_COMPLETED:
            case PROJECT_COMPLETED:
            case DEADLINE_MISSED:
                return "high";
            case TASK_CREATED:
            case TASK_ASSIGNED:
            case MEMBER_ADDED:
            case COMMENT_ADDED:
                return "medium";
            case TASK_UPDATED:
            case PROJECT_UPDATED:
            case FILE_UPLOADED:
                return "low";
            default:
                return "medium";
        }
    }

    private String getActivityIcon(ActivityType type) {
        switch (type) {
            case TASK_CREATED:
            case TASK_UPDATED:
                return "📝";
            case TASK_COMPLETED:
                return "✅";
            case TASK_ASSIGNED:
                return "👤";
            case PROJECT_CREATED:
            case PROJECT_UPDATED:
                return "📁";
            case COMMENT_ADDED:
                return "💬";
            case FILE_UPLOADED:
                return "📎";
            case MEMBER_ADDED:
                return "👥";
            case DEADLINE_MISSED:
                return "⚠️";
            default:
                return "📋";
        }
    }
}