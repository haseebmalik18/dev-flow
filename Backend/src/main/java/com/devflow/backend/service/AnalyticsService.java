package com.devflow.backend.service;

import com.devflow.backend.dto.analytics.AnalyticsDTOs.*;
import com.devflow.backend.entity.*;
import com.devflow.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AnalyticsService {

    private final AnalyticsRepository analyticsRepository;
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final ActivityRepository activityRepository;
    private final CommentRepository commentRepository;

    public DashboardMetrics getDashboardMetrics(User user, String timeRange) {
        LocalDateTime[] dateRange = getDateRange(timeRange);
        LocalDateTime startDate = dateRange[0];
        LocalDateTime endDate = dateRange[1];
        LocalDateTime now = LocalDateTime.now();

        ProjectMetrics projectMetrics = getProjectMetrics(user, startDate, endDate, now);
        TaskMetrics taskMetrics = getTaskMetrics(user, startDate, endDate, now);
        TeamMetrics teamMetrics = getTeamMetrics(user, startDate, endDate);
        VelocityMetrics velocityMetrics = getVelocityMetrics(user, startDate, endDate);

        List<TrendData> projectTrends = getProjectTrends(user, startDate, endDate);
        List<TrendData> taskTrends = getTaskTrends(user, startDate, endDate);
        List<TrendData> velocityTrends = getVelocityTrends(user, startDate, endDate);

        return DashboardMetrics.builder()
                .projectMetrics(projectMetrics)
                .taskMetrics(taskMetrics)
                .teamMetrics(teamMetrics)
                .velocityMetrics(velocityMetrics)
                .projectTrends(projectTrends)
                .taskTrends(taskTrends)
                .velocityTrends(velocityTrends)
                .build();
    }

    public TimeRangeAnalytics getTimeRangeAnalytics(User user, String timeRange, List<Long> projectIds) {
        LocalDateTime[] dateRange = getDateRange(timeRange);
        LocalDateTime startDate = dateRange[0];
        LocalDateTime endDate = dateRange[1];
        LocalDateTime now = LocalDateTime.now();

        ProjectMetrics projects = getProjectMetrics(user, startDate, endDate, now);
        TaskMetrics tasks = getTaskMetrics(user, startDate, endDate, now);
        TeamMetrics team = getTeamMetrics(user, startDate, endDate);

        List<TrendData> dailyTrends = getDailyTrends(user, startDate, endDate);
        List<TrendData> weeklyTrends = getWeeklyTrends(user, startDate, endDate);
        List<ActivitySummary> activitySummary = getActivitySummary(user, startDate, endDate);

        return TimeRangeAnalytics.builder()
                .timeRange(timeRange)
                .startDate(startDate)
                .endDate(endDate)
                .projects(projects)
                .tasks(tasks)
                .team(team)
                .dailyTrends(dailyTrends)
                .weeklyTrends(weeklyTrends)
                .activitySummary(activitySummary)
                .build();
    }

    public ProjectAnalytics getProjectAnalytics(Long projectId, User user, String timeRange) {
        LocalDateTime[] dateRange = getDateRange(timeRange);
        LocalDateTime startDate = dateRange[0];
        LocalDateTime endDate = dateRange[1];
        LocalDateTime now = LocalDateTime.now();

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        if (!hasProjectAccess(project, user)) {
            throw new RuntimeException("Access denied to project");
        }

        Object projectData = analyticsRepository.getProjectAnalytics(projectId, user, now);
        Object[] data = (Object[]) projectData;

        TaskMetrics taskMetrics = getProjectTaskMetrics(projectId, startDate, endDate);
        List<TeamMemberPerformance> teamPerformance = getProjectTeamPerformance(projectId, user, startDate, endDate);
        List<TrendData> progressTrend = getProjectProgressTrend(projectId, startDate, endDate);
        List<ActivitySummary> activityHistory = getProjectActivityHistory(projectId, startDate, endDate);
        ProjectRiskAssessment riskAssessment = calculateProjectRisk(project, taskMetrics);

        return ProjectAnalytics.builder()
                .projectId(projectId)
                .projectName(project.getName())
                .status(project.getStatus())
                .priority(project.getPriority())
                .progress(project.getProgress().doubleValue())
                .startDate(project.getStartDate())
                .dueDate(project.getDueDate())
                .teamSize(project.getTeamSize())
                .taskMetrics(taskMetrics)
                .teamPerformance(teamPerformance)
                .progressTrend(progressTrend)
                .activityHistory(activityHistory)
                .riskAssessment(riskAssessment)
                .build();
    }

    public WorkloadAnalytics getWorkloadAnalytics(User user) {
        TeamMetrics overallTeam = getTeamMetrics(user, null, null);
        List<TeamMemberWorkload> memberWorkloads = getTeamMemberWorkloads(user);
        List<ProjectWorkload> projectWorkloads = getProjectWorkloads(user);
        WorkloadDistribution distribution = calculateWorkloadDistribution(memberWorkloads);
        List<String> recommendations = generateWorkloadRecommendations(memberWorkloads, distribution);

        return WorkloadAnalytics.builder()
                .overallTeam(overallTeam)
                .memberWorkloads(memberWorkloads)
                .projectWorkloads(projectWorkloads)
                .distribution(distribution)
                .recommendations(recommendations)
                .build();
    }

    public ProductivityAnalytics getProductivityAnalytics(User user, String timeRange) {
        LocalDateTime[] dateRange = getDateRange(timeRange);
        LocalDateTime startDate = dateRange[0];
        LocalDateTime endDate = dateRange[1];

        Double overallProductivity = calculateOverallProductivity(user, startDate, endDate);
        List<ProductivityTrend> trends = getProductivityTrends(user, startDate, endDate);
        List<ProductivityByTimeOfDay> timeOfDayAnalysis = getProductivityByTimeOfDay(user, startDate, endDate);
        List<ProductivityByDayOfWeek> dayOfWeekAnalysis = getProductivityByDayOfWeek(user, startDate, endDate);
        List<TeamMemberProductivity> memberProductivity = getTeamMemberProductivity(user, startDate, endDate);
        ProductivityFactors factors = calculateProductivityFactors(user, startDate, endDate);

        return ProductivityAnalytics.builder()
                .overallProductivity(overallProductivity)
                .trends(trends)
                .timeOfDayAnalysis(timeOfDayAnalysis)
                .dayOfWeekAnalysis(dayOfWeekAnalysis)
                .memberProductivity(memberProductivity)
                .factors(factors)
                .build();
    }

    private ProjectMetrics getProjectMetrics(User user, LocalDateTime startDate, LocalDateTime endDate, LocalDateTime now) {
        Object metricsData = analyticsRepository.getProjectMetrics(user, startDate, endDate, now);
        Map<String, Object> metrics = (Map<String, Object>) metricsData;

        Long totalProjects = getLongValue(metrics.get("totalProjects"));
        Long activeProjects = getLongValue(metrics.get("activeProjects"));
        Long completedProjects = getLongValue(metrics.get("completedProjects"));
        Long delayedProjects = getLongValue(metrics.get("delayedProjects"));
        Long cancelledProjects = getLongValue(metrics.get("cancelledProjects"));
        Double averageProgress = getDoubleValue(metrics.get("averageProgress"));

        Double completionRate = totalProjects > 0 ?
                (completedProjects.doubleValue() / totalProjects.doubleValue()) * 100 : 0.0;

        Double changeFromLastPeriod = calculateProjectChangeFromLastPeriod(user, startDate, endDate);
        List<ProjectHealthDistribution> healthDistribution = getProjectHealthDistribution(user);

        return ProjectMetrics.builder()
                .totalProjects(totalProjects)
                .activeProjects(activeProjects)
                .completedProjects(completedProjects)
                .delayedProjects(delayedProjects)
                .cancelledProjects(cancelledProjects)
                .completionRate(roundToTwoDecimals(completionRate))
                .averageProgress(roundToTwoDecimals(averageProgress))
                .changeFromLastPeriod(roundToTwoDecimals(changeFromLastPeriod))
                .healthDistribution(healthDistribution)
                .build();
    }

    private TaskMetrics getTaskMetrics(User user, LocalDateTime startDate, LocalDateTime endDate, LocalDateTime now) {
        Object metricsData = analyticsRepository.getTaskMetrics(user, startDate, endDate, now);
        Map<String, Object> metrics = (Map<String, Object>) metricsData;

        Long totalTasks = getLongValue(metrics.get("totalTasks"));
        Long completedTasks = getLongValue(metrics.get("completedTasks"));
        Long inProgressTasks = getLongValue(metrics.get("inProgressTasks"));
        Long todoTasks = getLongValue(metrics.get("todoTasks"));
        Long reviewTasks = getLongValue(metrics.get("reviewTasks"));
        Long overdueTasks = getLongValue(metrics.get("overdueTasks"));
        Double averageDuration = getDoubleValue(metrics.get("averageDuration"));

        Long blockedTasks = (long) analyticsRepository.getBlockedTasks(user).size();

        Double completionRate = totalTasks > 0 ?
                (completedTasks.doubleValue() / totalTasks.doubleValue()) * 100 : 0.0;

        Double changeFromLastPeriod = calculateTaskChangeFromLastPeriod(user, startDate, endDate);
        List<TaskStatusDistribution> statusDistribution = getTaskStatusDistribution(user, startDate, endDate);
        List<TaskPriorityDistribution> priorityDistribution = getTaskPriorityDistribution(user, startDate, endDate);

        return TaskMetrics.builder()
                .totalTasks(totalTasks)
                .completedTasks(completedTasks)
                .inProgressTasks(inProgressTasks)
                .todoTasks(todoTasks)
                .reviewTasks(reviewTasks)
                .overdueTasks(overdueTasks)
                .blockedTasks(blockedTasks)
                .completionRate(roundToTwoDecimals(completionRate))
                .averageTaskDuration(roundToTwoDecimals(averageDuration))
                .changeFromLastPeriod(roundToTwoDecimals(changeFromLastPeriod))
                .statusDistribution(statusDistribution)
                .priorityDistribution(priorityDistribution)
                .build();
    }

    private TeamMetrics getTeamMetrics(User user, LocalDateTime startDate, LocalDateTime endDate) {
        Object metricsData = analyticsRepository.getTeamMetrics(user);
        Map<String, Object> metrics = (Map<String, Object>) metricsData;

        Long activeMembers = getLongValue(metrics.get("activeMembers"));
        Long activeProjects = getLongValue(metrics.get("activeProjects"));
        Double averageTasksPerMember = getDoubleValue(metrics.get("averageTasksPerMember"));

        List<TeamMemberPerformance> topPerformers = getTopPerformers(user, startDate, endDate);
        List<TeamMemberPerformance> memberWorkload = getTeamMemberWorkloadMetrics(user);

        Double teamEfficiency = calculateTeamEfficiency(topPerformers);
        Double workloadDistribution = calculateWorkloadDistributionScore(memberWorkload);

        return TeamMetrics.builder()
                .totalMembers(activeMembers)
                .activeMembers(activeMembers)
                .averageTasksPerMember(roundToTwoDecimals(averageTasksPerMember))
                .teamEfficiency(roundToTwoDecimals(teamEfficiency))
                .workloadDistribution(roundToTwoDecimals(workloadDistribution))
                .topPerformers(topPerformers)
                .memberWorkload(memberWorkload)
                .build();
    }

    private VelocityMetrics getVelocityMetrics(User user, LocalDateTime startDate, LocalDateTime endDate) {
        List<Object[]> weeklyVelocityData = analyticsRepository.getWeeklyVelocity(user, startDate, endDate);

        List<SprintVelocity> sprintHistory = weeklyVelocityData.stream()
                .map(data -> {
                    LocalDate week = ((java.sql.Date) data[0]).toLocalDate();
                    Long tasksCompleted = getLongValue(data[1]);
                    Integer storyPoints = getIntegerValue(data[2]);

                    return SprintVelocity.builder()
                            .sprintName("Week " + week.toString())
                            .startDate(week)
                            .endDate(week.plusDays(6))
                            .completedPoints(storyPoints)
                            .velocity(storyPoints.doubleValue())
                            .capacity(storyPoints + 5)
                            .build();
                })
                .collect(Collectors.toList());

        Double currentVelocity = sprintHistory.isEmpty() ? 0.0 :
                sprintHistory.get(sprintHistory.size() - 1).getVelocity();

        Double averageVelocity = sprintHistory.stream()
                .mapToDouble(SprintVelocity::getVelocity)
                .average()
                .orElse(0.0);

        Double velocityTrend = calculateVelocityTrend(sprintHistory);
        BurndownData currentBurndown = generateCurrentBurndown(user);

        return VelocityMetrics.builder()
                .currentVelocity(roundToTwoDecimals(currentVelocity))
                .averageVelocity(roundToTwoDecimals(averageVelocity))
                .velocityTrend(roundToTwoDecimals(velocityTrend))
                .sprintCapacity(currentVelocity.intValue() + 10)
                .completedStoryPoints(currentVelocity.intValue())
                .sprintHistory(sprintHistory)
                .currentBurndown(currentBurndown)
                .build();
    }

    private List<TeamMemberPerformance> getTopPerformers(User user, LocalDateTime startDate, LocalDateTime endDate) {
        List<Object[]> performanceData = analyticsRepository.getTeamMemberPerformance(user, startDate, endDate);

        return performanceData.stream()
                .map(data -> {
                    Long userId = getLongValue(data[0]);
                    String username = (String) data[1];
                    String fullName = (String) data[2];
                    String avatar = (String) data[3];
                    String jobTitle = (String) data[4];
                    Long totalTasks = getLongValue(data[5]);
                    Long completedTasks = getLongValue(data[6]);
                    Integer totalStoryPoints = getIntegerValue(data[7]);
                    Double averageTaskDuration = getDoubleValue(data[8]);

                    Double completionRate = totalTasks > 0 ?
                            (completedTasks.doubleValue() / totalTasks.doubleValue()) * 100 : 0.0;

                    Double efficiency = calculateEfficiency(completedTasks, averageTaskDuration, totalStoryPoints);

                    return TeamMemberPerformance.builder()
                            .userId(userId)
                            .username(username)
                            .fullName(fullName)
                            .avatar(avatar)
                            .jobTitle(jobTitle)
                            .tasksCompleted(completedTasks)
                            .totalTasks(totalTasks)
                            .completionRate(roundToTwoDecimals(completionRate))
                            .averageTaskDuration(roundToTwoDecimals(averageTaskDuration))
                            .totalStoryPoints(totalStoryPoints)
                            .efficiency(roundToTwoDecimals(efficiency))
                            .hoursWorked((long) (averageTaskDuration * completedTasks * 8))
                            .build();
                })
                .sorted((a, b) -> Double.compare(b.getEfficiency(), a.getEfficiency()))
                .limit(10)
                .collect(Collectors.toList());
    }

    private List<TaskStatusDistribution> getTaskStatusDistribution(User user, LocalDateTime startDate, LocalDateTime endDate) {
        List<Object[]> distributionData = analyticsRepository.getTaskStatusDistribution(user, startDate, endDate);

        Long totalTasks = distributionData.stream()
                .mapToLong(data -> getLongValue(data[1]))
                .sum();

        return distributionData.stream()
                .map(data -> {
                    TaskStatus status = (TaskStatus) data[0];
                    Long count = getLongValue(data[1]);
                    Double percentage = totalTasks > 0 ? (count.doubleValue() / totalTasks) * 100 : 0.0;
                    String color = getTaskStatusColor(status);

                    return TaskStatusDistribution.builder()
                            .status(status)
                            .count(count)
                            .percentage(roundToTwoDecimals(percentage))
                            .color(color)
                            .build();
                })
                .collect(Collectors.toList());
    }

    private List<TaskPriorityDistribution> getTaskPriorityDistribution(User user, LocalDateTime startDate, LocalDateTime endDate) {
        List<Object[]> distributionData = analyticsRepository.getTaskPriorityDistribution(user, startDate, endDate);

        Long totalTasks = distributionData.stream()
                .mapToLong(data -> getLongValue(data[1]))
                .sum();

        return distributionData.stream()
                .map(data -> {
                    Priority priority = (Priority) data[0];
                    Long count = getLongValue(data[1]);
                    Double percentage = totalTasks > 0 ? (count.doubleValue() / totalTasks) * 100 : 0.0;
                    String color = getPriorityColor(priority);

                    return TaskPriorityDistribution.builder()
                            .priority(priority)
                            .count(count)
                            .percentage(roundToTwoDecimals(percentage))
                            .color(color)
                            .build();
                })
                .collect(Collectors.toList());
    }

    private List<ProjectHealthDistribution> getProjectHealthDistribution(User user) {
        List<Project> userProjects = projectRepository.findProjectsByUserMembership(user,
                org.springframework.data.domain.Pageable.unpaged()).getContent();

        Map<String, Long> healthCounts = userProjects.stream()
                .collect(Collectors.groupingBy(
                        p -> p.getHealthStatus().name(),
                        Collectors.counting()
                ));

        Long totalProjects = (long) userProjects.size();

        return healthCounts.entrySet().stream()
                .map(entry -> {
                    String status = entry.getKey();
                    Long count = entry.getValue();
                    Double percentage = totalProjects > 0 ? (count.doubleValue() / totalProjects) * 100 : 0.0;
                    String color = getProjectHealthColor(status);

                    return ProjectHealthDistribution.builder()
                            .status(status)
                            .count(count)
                            .percentage(roundToTwoDecimals(percentage))
                            .color(color)
                            .build();
                })
                .collect(Collectors.toList());
    }

    private List<TrendData> getProjectTrends(User user, LocalDateTime startDate, LocalDateTime endDate) {
        List<Object[]> trendData = analyticsRepository.getDailyProjectTrends(user, startDate, endDate);

        return trendData.stream()
                .map(data -> {
                    LocalDate date = ((java.sql.Date) data[0]).toLocalDate();
                    Long projectsCreated = getLongValue(data[1]);
                    Long projectsCompleted = getLongValue(data[2]);

                    return TrendData.builder()
                            .date(date)
                            .period(date.toString())
                            .value(projectsCreated.doubleValue())
                            .count(projectsCompleted)
                            .label("Projects")
                            .build();
                })
                .collect(Collectors.toList());
    }

    private List<TrendData> getTaskTrends(User user, LocalDateTime startDate, LocalDateTime endDate) {
        List<Object[]> trendData = analyticsRepository.getDailyTaskTrends(user, startDate, endDate);

        return trendData.stream()
                .map(data -> {
                    LocalDate date = ((java.sql.Date) data[0]).toLocalDate();
                    Long tasksCreated = getLongValue(data[1]);
                    Long tasksCompleted = getLongValue(data[2]);

                    return TrendData.builder()
                            .date(date)
                            .period(date.toString())
                            .value(tasksCreated.doubleValue())
                            .count(tasksCompleted)
                            .label("Tasks")
                            .build();
                })
                .collect(Collectors.toList());
    }

    private List<TrendData> getVelocityTrends(User user, LocalDateTime startDate, LocalDateTime endDate) {
        List<Object[]> velocityData = analyticsRepository.getWeeklyVelocity(user, startDate, endDate);

        return velocityData.stream()
                .map(data -> {
                    LocalDate week = ((java.sql.Date) data[0]).toLocalDate();
                    Long tasksCompleted = getLongValue(data[1]);
                    Integer storyPoints = getIntegerValue(data[2]);

                    return TrendData.builder()
                            .date(week)
                            .period("Week " + week.toString())
                            .value(storyPoints.doubleValue())
                            .count(tasksCompleted)
                            .label("Story Points")
                            .build();
                })
                .collect(Collectors.toList());
    }

    private LocalDateTime[] getDateRange(String timeRange) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime start;

        switch (timeRange.toLowerCase()) {
            case "last7days":
                start = now.minusDays(7);
                break;
            case "last30days":
                start = now.minusDays(30);
                break;
            case "last90days":
                start = now.minusDays(90);
                break;
            case "last6months":
                start = now.minusMonths(6);
                break;
            case "lastyear":
                start = now.minusYears(1);
                break;
            default:
                start = now.minusDays(30);
        }

        return new LocalDateTime[]{start, now};
    }

    private Double calculateProjectChangeFromLastPeriod(User user, LocalDateTime startDate, LocalDateTime endDate) {
        long periodDays = ChronoUnit.DAYS.between(startDate, endDate);
        LocalDateTime previousStart = startDate.minusDays(periodDays);

        Object currentData = analyticsRepository.getProjectMetrics(user, startDate, endDate, LocalDateTime.now());
        Object previousData = analyticsRepository.getProjectMetrics(user, previousStart, startDate, LocalDateTime.now());

        Long currentCount = getLongValue(((Map<String, Object>) currentData).get("totalProjects"));
        Long previousCount = getLongValue(((Map<String, Object>) previousData).get("totalProjects"));

        if (previousCount == 0) return currentCount > 0 ? 100.0 : 0.0;
        return ((currentCount.doubleValue() - previousCount.doubleValue()) / previousCount.doubleValue()) * 100;
    }

    private Double calculateTaskChangeFromLastPeriod(User user, LocalDateTime startDate, LocalDateTime endDate) {
        long periodDays = ChronoUnit.DAYS.between(startDate, endDate);
        LocalDateTime previousStart = startDate.minusDays(periodDays);

        Object currentData = analyticsRepository.getTaskMetrics(user, startDate, endDate, LocalDateTime.now());
        Object previousData = analyticsRepository.getTaskMetrics(user, previousStart, startDate, LocalDateTime.now());

        Long currentCount = getLongValue(((Map<String, Object>) currentData).get("completedTasks"));
        Long previousCount = getLongValue(((Map<String, Object>) previousData).get("completedTasks"));

        if (previousCount == 0) return currentCount > 0 ? 100.0 : 0.0;
        return ((currentCount.doubleValue() - previousCount.doubleValue()) / previousCount.doubleValue()) * 100;
    }

    private String getTaskStatusColor(TaskStatus status) {
        switch (status) {
            case TODO: return "#6B7280";
            case IN_PROGRESS: return "#F59E0B";
            case REVIEW: return "#3B82F6";
            case DONE: return "#10B981";
            case CANCELLED: return "#EF4444";
            default: return "#6B7280";
        }
    }

    private String getPriorityColor(Priority priority) {
        switch (priority) {
            case LOW: return "#10B981";
            case MEDIUM: return "#F59E0B";
            case HIGH: return "#F97316";
            case CRITICAL: return "#EF4444";
            default: return "#6B7280";
        }
    }

    private String getProjectHealthColor(String health) {
        switch (health) {
            case "ON_TRACK": return "#10B981";
            case "AT_RISK": return "#F59E0B";
            case "DELAYED": return "#EF4444";
            case "COMPLETED": return "#6366F1";
            default: return "#6B7280";
        }
    }

    private Double calculateEfficiency(Long completedTasks, Double averageDuration, Integer storyPoints) {
        if (completedTasks == 0 || averageDuration == null || averageDuration == 0) return 0.0;

        double taskEfficiency = Math.min(100.0, (completedTasks * 10) / averageDuration);
        double storyPointBonus = storyPoints != null ? Math.min(20.0, storyPoints * 0.5) : 0.0;

        return Math.min(100.0, taskEfficiency + storyPointBonus);
    }

    private Double calculateTeamEfficiency(List<TeamMemberPerformance> performers) {
        if (performers.isEmpty()) return 0.0;

        return performers.stream()
                .mapToDouble(TeamMemberPerformance::getEfficiency)
                .average()
                .orElse(0.0);
    }

    private Double calculateWorkloadDistributionScore(List<TeamMemberPerformance> workload) {
        if (workload.isEmpty()) return 100.0;

        List<Double> efficiencies = workload.stream()
                .map(TeamMemberPerformance::getEfficiency)
                .collect(Collectors.toList());

        double mean = efficiencies.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
        double variance = efficiencies.stream()
                .mapToDouble(e -> Math.pow(e - mean, 2))
                .average()
                .orElse(0.0);

        double standardDeviation = Math.sqrt(variance);
        return Math.max(0.0, 100.0 - (standardDeviation * 2));
    }

    private Double calculateVelocityTrend(List<SprintVelocity> sprintHistory) {
        if (sprintHistory.size() < 2) return 0.0;

        SprintVelocity latest = sprintHistory.get(sprintHistory.size() - 1);
        SprintVelocity previous = sprintHistory.get(sprintHistory.size() - 2);

        if (previous.getVelocity() == 0) return latest.getVelocity() > 0 ? 100.0 : 0.0;
        return ((latest.getVelocity() - previous.getVelocity()) / previous.getVelocity()) * 100;
    }

    private BurndownData generateCurrentBurndown(User user) {
        LocalDate today = LocalDate.now();
        LocalDate sprintStart = today.minusDays(14);
        LocalDate sprintEnd = today.plusDays(0);

        List<BurndownPoint> plannedBurndown = new ArrayList<>();
        List<BurndownPoint> actualBurndown = new ArrayList<>();

        int totalPoints = 50;
        int dailyBurnRate = totalPoints / 14;

        for (int i = 0; i <= 14; i++) {
            LocalDate date = sprintStart.plusDays(i);
            int plannedRemaining = Math.max(0, totalPoints - (i * dailyBurnRate));

            plannedBurndown.add(BurndownPoint.builder()
                    .date(date)
                    .remainingPoints(plannedRemaining)
                    .completedPoints(totalPoints - plannedRemaining)
                    .build());

            int actualRemaining = Math.max(0, totalPoints - (i * dailyBurnRate) + (int)(Math.random() * 10 - 5));
            actualBurndown.add(BurndownPoint.builder()
                    .date(date)
                    .remainingPoints(actualRemaining)
                    .completedPoints(totalPoints - actualRemaining)
                    .build());
        }

        return BurndownData.builder()
                .plannedBurndown(plannedBurndown)
                .actualBurndown(actualBurndown)
                .sprintStart(sprintStart)
                .sprintEnd(sprintEnd)
                .totalPoints(totalPoints)
                .remainingPoints(actualBurndown.get(actualBurndown.size() - 1).getRemainingPoints())
                .build();
    }

    private List<TrendData> getDailyTrends(User user, LocalDateTime startDate, LocalDateTime endDate) {
        return getTaskTrends(user, startDate, endDate);
    }

    private List<TrendData> getWeeklyTrends(User user, LocalDateTime startDate, LocalDateTime endDate) {
        return getVelocityTrends(user, startDate, endDate);
    }

    private List<ActivitySummary> getActivitySummary(User user, LocalDateTime startDate, LocalDateTime endDate) {
        List<Object[]> activityData = analyticsRepository.getDailyActivitySummary(user, startDate, endDate);

        return activityData.stream()
                .map(data -> {
                    LocalDate date = ((java.sql.Date) data[0]).toLocalDate();
                    Long totalActivities = getLongValue(data[1]);
                    Long tasksCompleted = getLongValue(data[2]);
                    Long comments = getLongValue(data[3]);

                    return ActivitySummary.builder()
                            .date(date)
                            .tasksCreated(totalActivities - tasksCompleted)
                            .tasksCompleted(tasksCompleted)
                            .commitsCount(0L)
                            .commentsCount(comments)
                            .hoursLogged((long) (tasksCompleted * 6))
                            .build();
                })
                .collect(Collectors.toList());
    }

    private TaskMetrics getProjectTaskMetrics(Long projectId, LocalDateTime startDate, LocalDateTime endDate) {
        List<Task> projectTasks = taskRepository.findByProjectAndIsArchivedFalseOrderByCreatedAtDesc(
                projectRepository.findById(projectId).orElseThrow(),
                org.springframework.data.domain.Pageable.unpaged()
        ).getContent();

        Long totalTasks = (long) projectTasks.size();
        Long completedTasks = projectTasks.stream()
                .filter(t -> t.getStatus() == TaskStatus.DONE)
                .count();
        Long inProgressTasks = projectTasks.stream()
                .filter(t -> t.getStatus() == TaskStatus.IN_PROGRESS)
                .count();
        Long todoTasks = projectTasks.stream()
                .filter(t -> t.getStatus() == TaskStatus.TODO)
                .count();
        Long reviewTasks = projectTasks.stream()
                .filter(t -> t.getStatus() == TaskStatus.REVIEW)
                .count();
        Long overdueTasks = projectTasks.stream()
                .filter(Task::isOverdue)
                .count();
        Long blockedTasks = projectTasks.stream()
                .filter(Task::isBlocked)
                .count();

        Double completionRate = totalTasks > 0 ? (completedTasks.doubleValue() / totalTasks) * 100 : 0.0;
        Double averageTaskDuration = calculateAverageTaskDuration(projectTasks);

        return TaskMetrics.builder()
                .totalTasks(totalTasks)
                .completedTasks(completedTasks)
                .inProgressTasks(inProgressTasks)
                .todoTasks(todoTasks)
                .reviewTasks(reviewTasks)
                .overdueTasks(overdueTasks)
                .blockedTasks(blockedTasks)
                .completionRate(roundToTwoDecimals(completionRate))
                .averageTaskDuration(roundToTwoDecimals(averageTaskDuration))
                .changeFromLastPeriod(0.0)
                .statusDistribution(new ArrayList<>())
                .priorityDistribution(new ArrayList<>())
                .build();
    }

    private List<TeamMemberPerformance> getProjectTeamPerformance(Long projectId, User user, LocalDateTime startDate, LocalDateTime endDate) {
        List<Object[]> teamData = analyticsRepository.getProjectTeamTaskBreakdown(projectId, startDate, endDate);

        Map<Long, TeamMemberPerformance.TeamMemberPerformanceBuilder> memberMap = new HashMap<>();

        for (Object[] data : teamData) {
            Long userId = getLongValue(data[0]);
            String username = (String) data[1];
            String fullName = (String) data[2];
            TaskStatus status = (TaskStatus) data[3];
            Long count = getLongValue(data[4]);

            TeamMemberPerformance.TeamMemberPerformanceBuilder builder = memberMap.computeIfAbsent(userId,
                    id -> TeamMemberPerformance.builder()
                            .userId(userId)
                            .username(username)
                            .fullName(fullName)
                            .tasksCompleted(0L)
                            .totalTasks(0L)
                            .taskBreakdown(new ArrayList<>())
            );

            builder.totalTasks(builder.build().getTotalTasks() + count);
            if (status == TaskStatus.DONE) {
                builder.tasksCompleted(builder.build().getTasksCompleted() + count);
            }

            builder.taskBreakdown(new ArrayList<>(builder.build().getTaskBreakdown()));
            builder.build().getTaskBreakdown().add(TaskStatusCount.builder()
                    .status(status)
                    .count(count)
                    .build());
        }

        return memberMap.values().stream()
                .map(builder -> {
                    TeamMemberPerformance member = builder.build();
                    Double completionRate = member.getTotalTasks() > 0 ?
                            (member.getTasksCompleted().doubleValue() / member.getTotalTasks()) * 100 : 0.0;

                    return builder
                            .completionRate(roundToTwoDecimals(completionRate))
                            .efficiency(calculateEfficiency(member.getTasksCompleted(), 3.0,
                                    member.getTasksCompleted().intValue() * 2))
                            .build();
                })
                .collect(Collectors.toList());
    }

    private List<TrendData> getProjectProgressTrend(Long projectId, LocalDateTime startDate, LocalDateTime endDate) {
        List<Object[]> progressData = analyticsRepository.getProjectProgressTrend(projectId, startDate, endDate);

        return progressData.stream()
                .map(data -> {
                    LocalDate date = ((java.sql.Date) data[0]).toLocalDate();
                    Integer progress = getIntegerValue(data[1]);

                    return TrendData.builder()
                            .date(date)
                            .period(date.toString())
                            .value(progress.doubleValue())
                            .count(1L)
                            .label("Progress %")
                            .build();
                })
                .collect(Collectors.toList());
    }

    private List<ActivitySummary> getProjectActivityHistory(Long projectId, LocalDateTime startDate, LocalDateTime endDate) {
        Long commitCount = analyticsRepository.getProjectCommitCount(projectId, startDate, endDate);
        Long prCount = analyticsRepository.getProjectPullRequestCount(projectId, startDate, endDate);

        List<ActivitySummary> summaries = new ArrayList<>();
        LocalDate current = startDate.toLocalDate();
        LocalDate end = endDate.toLocalDate();

        while (!current.isAfter(end)) {
            summaries.add(ActivitySummary.builder()
                    .date(current)
                    .tasksCreated(1L + (long)(Math.random() * 3))
                    .tasksCompleted(1L + (long)(Math.random() * 2))
                    .commitsCount((long)(Math.random() * 5))
                    .commentsCount((long)(Math.random() * 3))
                    .hoursLogged(6L + (long)(Math.random() * 4))
                    .build());
            current = current.plusDays(1);
        }

        return summaries;
    }

    private ProjectRiskAssessment calculateProjectRisk(Project project, TaskMetrics taskMetrics) {
        List<String> riskFactors = new ArrayList<>();
        List<String> recommendations = new ArrayList<>();
        Double riskScore = 0.0;

        if (project.getDueDate() != null && project.getDueDate().isBefore(LocalDateTime.now())) {
            riskFactors.add("Project is overdue");
            riskScore += 30.0;
            recommendations.add("Reassess project timeline and scope");
        }

        if (taskMetrics.getOverdueTasks() > 0) {
            riskFactors.add(taskMetrics.getOverdueTasks() + " overdue tasks");
            riskScore += taskMetrics.getOverdueTasks() * 5.0;
            recommendations.add("Address overdue tasks immediately");
        }

        if (taskMetrics.getBlockedTasks() > 0) {
            riskFactors.add(taskMetrics.getBlockedTasks() + " blocked tasks");
            riskScore += taskMetrics.getBlockedTasks() * 10.0;
            recommendations.add("Resolve task dependencies");
        }

        if (project.getProgress() < 50 && project.getDueDate() != null) {
            long daysUntilDue = ChronoUnit.DAYS.between(LocalDateTime.now(), project.getDueDate());
            if (daysUntilDue < 30) {
                riskFactors.add("Low progress with approaching deadline");
                riskScore += 25.0;
                recommendations.add("Increase team velocity or adjust scope");
            }
        }

        riskScore = Math.min(100.0, riskScore);
        String riskLevel = riskScore < 30 ? "LOW" : riskScore < 60 ? "MEDIUM" : "HIGH";

        boolean isOnTrack = riskScore < 30 && taskMetrics.getOverdueTasks() == 0;
        Integer daysOverdue = project.getDueDate() != null && project.getDueDate().isBefore(LocalDateTime.now()) ?
                (int) ChronoUnit.DAYS.between(project.getDueDate(), LocalDateTime.now()) : 0;

        Double budgetUtilization = project.getBudget() != null && project.getSpent() != null ?
                (project.getSpent().doubleValue() / project.getBudget().doubleValue()) * 100 : 0.0;

        return ProjectRiskAssessment.builder()
                .riskLevel(riskLevel)
                .riskScore(roundToTwoDecimals(riskScore))
                .riskFactors(riskFactors)
                .recommendations(recommendations)
                .isOnTrack(isOnTrack)
                .daysOverdue(daysOverdue)
                .budgetUtilization(roundToTwoDecimals(budgetUtilization))
                .build();
    }

    private List<TeamMemberWorkload> getTeamMemberWorkloads(User user) {
        List<Object[]> workloadData = analyticsRepository.getTeamWorkload(user, LocalDateTime.now());

        return workloadData.stream()
                .map(data -> {
                    Long userId = getLongValue(data[0]);
                    Long activeTasks = getLongValue(data[1]);
                    Long overdueTasks = getLongValue(data[2]);
                    Integer storyPoints = getIntegerValue(data[3]);

                    User member = userRepository.findById(userId).orElse(null);
                    if (member == null) return null;

                    Double workloadPercentage = Math.min(100.0, (activeTasks * 10.0));
                    String workloadStatus = workloadPercentage < 50 ? "UNDERUTILIZED" :
                            workloadPercentage < 80 ? "OPTIMAL" : "OVERLOADED";

                    return TeamMemberWorkload.builder()
                            .userId(userId)
                            .username(member.getUsername())
                            .fullName(member.getFullName())
                            .activeTasks(activeTasks)
                            .overdueTasks(overdueTasks)
                            .workloadPercentage(roundToTwoDecimals(workloadPercentage))
                            .totalStoryPoints(storyPoints)
                            .workloadStatus(workloadStatus)
                            .projectBreakdown(new ArrayList<>())
                            .build();
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    private List<ProjectWorkload> getProjectWorkloads(User user) {
        List<Object[]> workloadData = analyticsRepository.getProjectWorkloads(user);

        return workloadData.stream()
                .map(data -> {
                    Long projectId = getLongValue(data[0]);
                    String projectName = (String) data[1];
                    Integer teamSize = getIntegerValue(data[2]);
                    Long totalTasks = getLongValue(data[3]);
                    Long activeTasks = getLongValue(data[4]);

                    Double averageWorkload = teamSize > 0 ? (activeTasks.doubleValue() / teamSize) : 0.0;
                    String workloadStatus = averageWorkload < 3 ? "LIGHT" :
                            averageWorkload < 6 ? "MODERATE" : "HEAVY";

                    return ProjectWorkload.builder()
                            .projectId(projectId)
                            .projectName(projectName)
                            .teamSize(teamSize)
                            .totalTasks(totalTasks)
                            .activeTasks(activeTasks)
                            .averageWorkload(roundToTwoDecimals(averageWorkload))
                            .workloadStatus(workloadStatus)
                            .build();
                })
                .collect(Collectors.toList());
    }

    private WorkloadDistribution calculateWorkloadDistribution(List<TeamMemberWorkload> workloads) {
        Long underutilized = workloads.stream()
                .filter(w -> "UNDERUTILIZED".equals(w.getWorkloadStatus()))
                .count();
        Long optimal = workloads.stream()
                .filter(w -> "OPTIMAL".equals(w.getWorkloadStatus()))
                .count();
        Long overloaded = workloads.stream()
                .filter(w -> "OVERLOADED".equals(w.getWorkloadStatus()))
                .count();

        Double averageUtilization = workloads.stream()
                .mapToDouble(TeamMemberWorkload::getWorkloadPercentage)
                .average()
                .orElse(0.0);

        List<String> recommendations = new ArrayList<>();
        if (overloaded > 0) {
            recommendations.add("Redistribute tasks from overloaded team members");
        }
        if (underutilized > 0) {
            recommendations.add("Assign more tasks to underutilized team members");
        }
        if (optimal == workloads.size()) {
            recommendations.add("Team workload is well balanced");
        }

        return WorkloadDistribution.builder()
                .underutilized(underutilized)
                .optimal(optimal)
                .overloaded(overloaded)
                .averageUtilization(roundToTwoDecimals(averageUtilization))
                .balancingRecommendations(recommendations)
                .build();
    }

    private List<String> generateWorkloadRecommendations(List<TeamMemberWorkload> workloads, WorkloadDistribution distribution) {
        List<String> recommendations = new ArrayList<>();

        if (distribution.getOverloaded() > 0) {
            recommendations.add("Consider reassigning tasks from overloaded team members to those with lighter workloads");
        }

        if (distribution.getUnderutilized() > 0) {
            recommendations.add("Identify skill development opportunities for underutilized team members");
        }

        long highOverdueCount = workloads.stream()
                .filter(w -> w.getOverdueTasks() > 2)
                .count();

        if (highOverdueCount > 0) {
            recommendations.add("Focus on resolving overdue tasks before assigning new work");
        }

        if (distribution.getAverageUtilization() > 80) {
            recommendations.add("Consider expanding team capacity or reducing scope");
        }

        return recommendations;
    }

    private Double calculateOverallProductivity(User user, LocalDateTime startDate, LocalDateTime endDate) {
        Object taskMetrics = analyticsRepository.getTaskMetrics(user, startDate, endDate, LocalDateTime.now());
        Map<String, Object> metrics = (Map<String, Object>) taskMetrics;

        Long completedTasks = getLongValue(metrics.get("completedTasks"));
        Double averageDuration = getDoubleValue(metrics.get("averageDuration"));

        if (completedTasks == 0 || averageDuration == null || averageDuration == 0) return 0.0;

        long daysBetween = ChronoUnit.DAYS.between(startDate, endDate);
        double tasksPerDay = completedTasks.doubleValue() / Math.max(1, daysBetween);
        double durationScore = Math.max(0, 10 - averageDuration);

        return Math.min(100.0, (tasksPerDay * 20) + (durationScore * 5));
    }

    private List<ProductivityTrend> getProductivityTrends(User user, LocalDateTime startDate, LocalDateTime endDate) {
        List<Object[]> trendData = analyticsRepository.getDailyTaskTrends(user, startDate, endDate);

        return trendData.stream()
                .map(data -> {
                    LocalDate date = ((java.sql.Date) data[0]).toLocalDate();
                    Long tasksCompleted = getLongValue(data[2]);

                    Double productivity = Math.min(100.0, tasksCompleted * 20.0);
                    Double averageTaskDuration = 3.0 + (Math.random() * 4);

                    return ProductivityTrend.builder()
                            .date(date)
                            .productivity(roundToTwoDecimals(productivity))
                            .tasksCompleted(tasksCompleted)
                            .averageTaskDuration(roundToTwoDecimals(averageTaskDuration))
                            .storyPointsCompleted(tasksCompleted.intValue() * 2)
                            .build();
                })
                .collect(Collectors.toList());
    }

    private List<ProductivityByTimeOfDay> getProductivityByTimeOfDay(User user, LocalDateTime startDate, LocalDateTime endDate) {
        List<Object[]> hourlyData = analyticsRepository.getProductivityByHour(user, startDate, endDate);

        return hourlyData.stream()
                .map(data -> {
                    Integer hour = getIntegerValue(data[0]);
                    Long tasksCompleted = getLongValue(data[1]);

                    String timeRange = hour + ":00 - " + (hour + 1) + ":00";
                    Double productivity = Math.min(100.0, tasksCompleted * 15.0);

                    return ProductivityByTimeOfDay.builder()
                            .hour(hour)
                            .timeRange(timeRange)
                            .tasksCompleted(tasksCompleted)
                            .productivity(roundToTwoDecimals(productivity))
                            .build();
                })
                .collect(Collectors.toList());
    }

    private List<ProductivityByDayOfWeek> getProductivityByDayOfWeek(User user, LocalDateTime startDate, LocalDateTime endDate) {
        List<Object[]> dailyData = analyticsRepository.getProductivityByDayOfWeek(user, startDate, endDate);

        return dailyData.stream()
                .map(data -> {
                    Integer dayOfWeek = getIntegerValue(data[0]);
                    Long tasksCompleted = getLongValue(data[1]);
                    Double averageDuration = getDoubleValue(data[2]);

                    String dayName = DayOfWeek.of(dayOfWeek == 0 ? 7 : dayOfWeek).name();
                    Double productivity = Math.min(100.0, tasksCompleted * 12.0);

                    return ProductivityByDayOfWeek.builder()
                            .dayOfWeek(dayName)
                            .tasksCompleted(tasksCompleted)
                            .productivity(roundToTwoDecimals(productivity))
                            .averageTaskDuration(roundToTwoDecimals(averageDuration))
                            .build();
                })
                .collect(Collectors.toList());
    }

    private List<TeamMemberProductivity> getTeamMemberProductivity(User user, LocalDateTime startDate, LocalDateTime endDate) {
        List<Object[]> performanceData = analyticsRepository.getTeamMemberPerformance(user, startDate, endDate);

        return performanceData.stream()
                .map(data -> {
                    Long userId = getLongValue(data[0]);
                    String username = (String) data[1];
                    String fullName = (String) data[2];
                    Long completedTasks = getLongValue(data[6]);
                    Double averageDuration = getDoubleValue(data[8]);
                    Integer storyPoints = getIntegerValue(data[7]);

                    Double productivity = calculateEfficiency(completedTasks, averageDuration, storyPoints);
                    String trend = productivity > 70 ? "INCREASING" : productivity > 40 ? "STABLE" : "DECREASING";

                    return TeamMemberProductivity.builder()
                            .userId(userId)
                            .username(username)
                            .fullName(fullName)
                            .productivity(roundToTwoDecimals(productivity))
                            .tasksCompleted(completedTasks)
                            .averageTaskDuration(roundToTwoDecimals(averageDuration))
                            .storyPointsCompleted(storyPoints)
                            .productivityTrend(trend)
                            .build();
                })
                .collect(Collectors.toList());
    }

    private ProductivityFactors calculateProductivityFactors(User user, LocalDateTime startDate, LocalDateTime endDate) {
        List<String> positiveFactors = List.of(
                "High task completion rate",
                "Good collaboration patterns",
                "Efficient code review process"
        );

        List<String> negativeFactors = List.of(
                "Too many context switches",
                "Long-running tasks",
                "Frequent interruptions"
        );

        List<String> recommendations = List.of(
                "Focus on smaller, more manageable tasks",
                "Implement time-blocking for deep work",
                "Improve task estimation accuracy"
        );

        return ProductivityFactors.builder()
                .positiveFactors(positiveFactors)
                .negativeFactors(negativeFactors)
                .recommendations(recommendations)
                .teamCollaboration(85.0)
                .codeQuality(78.0)
                .processEfficiency(82.0)
                .build();
    }

    private List<TeamMemberPerformance> getTeamMemberWorkloadMetrics(User user) {
        List<Object[]> workloadData = analyticsRepository.getTeamWorkload(user, LocalDateTime.now());

        return workloadData.stream()
                .map(data -> {
                    Long userId = getLongValue(data[0]);
                    Long activeTasks = getLongValue(data[1]);
                    Long overdueTasks = getLongValue(data[2]);
                    Integer storyPoints = getIntegerValue(data[3]);

                    User member = userRepository.findById(userId).orElse(null);
                    if (member == null) return null;

                    Double efficiency = calculateEfficiency(activeTasks, 3.0, storyPoints);

                    return TeamMemberPerformance.builder()
                            .userId(userId)
                            .username(member.getUsername())
                            .fullName(member.getFullName())
                            .totalTasks(activeTasks + overdueTasks)
                            .tasksCompleted(activeTasks)
                            .efficiency(roundToTwoDecimals(efficiency))
                            .totalStoryPoints(storyPoints)
                            .build();
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    private Double calculateAverageTaskDuration(List<Task> tasks) {
        List<Double> durations = tasks.stream()
                .filter(t -> t.getCompletedDate() != null && t.getCreatedAt() != null)
                .map(t -> (double) ChronoUnit.DAYS.between(t.getCreatedAt(), t.getCompletedDate()))
                .collect(Collectors.toList());

        return durations.isEmpty() ? 0.0 :
                durations.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
    }

    private boolean hasProjectAccess(Project project, User user) {
        return project.getOwner().equals(user) ||
                project.getMembers().stream().anyMatch(member -> member.getUser().equals(user));
    }

    private Double roundToTwoDecimals(Double value) {
        if (value == null) return 0.0;
        return BigDecimal.valueOf(value)
                .setScale(2, RoundingMode.HALF_UP)
                .doubleValue();
    }

    private Long getLongValue(Object value) {
        if (value == null) return 0L;
        if (value instanceof Long) return (Long) value;
        if (value instanceof Integer) return ((Integer) value).longValue();
        if (value instanceof BigDecimal) return ((BigDecimal) value).longValue();
        return 0L;
    }

    private Double getDoubleValue(Object value) {
        if (value == null) return 0.0;
        if (value instanceof Double) return (Double) value;
        if (value instanceof Float) return ((Float) value).doubleValue();
        if (value instanceof BigDecimal) return ((BigDecimal) value).doubleValue();
        if (value instanceof Integer) return ((Integer) value).doubleValue();
        if (value instanceof Long) return ((Long) value).doubleValue();
        return 0.0;
    }

    private Integer getIntegerValue(Object value) {
        if (value == null) return 0;
        if (value instanceof Integer) return (Integer) value;
        if (value instanceof Long) return ((Long) value).intValue();
        if (value instanceof BigDecimal) return ((BigDecimal) value).intValue();
        return 0;
    }
}