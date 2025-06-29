package com.devflow.backend.dto.analytics;

import com.devflow.backend.entity.Priority;
import com.devflow.backend.entity.ProjectStatus;
import com.devflow.backend.entity.TaskStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public class AnalyticsDTOs {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DashboardMetrics {
        private ProjectMetrics projectMetrics;
        private TaskMetrics taskMetrics;
        private TeamMetrics teamMetrics;
        private VelocityMetrics velocityMetrics;
        private List<TrendData> projectTrends;
        private List<TrendData> taskTrends;
        private List<TrendData> velocityTrends;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProjectMetrics {
        private Long totalProjects;
        private Long activeProjects;
        private Long completedProjects;
        private Long delayedProjects;
        private Long cancelledProjects;
        private Double completionRate;
        private Double averageProgress;
        private Double changeFromLastPeriod;
        private List<ProjectHealthDistribution> healthDistribution;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TaskMetrics {
        private Long totalTasks;
        private Long completedTasks;
        private Long inProgressTasks;
        private Long todoTasks;
        private Long reviewTasks;
        private Long overdueTasks;
        private Long blockedTasks;
        private Double completionRate;
        private Double averageTaskDuration;
        private Double changeFromLastPeriod;
        private List<TaskStatusDistribution> statusDistribution;
        private List<TaskPriorityDistribution> priorityDistribution;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeamMetrics {
        private Long totalMembers;
        private Long activeMembers;
        private Double averageTasksPerMember;
        private Double teamEfficiency;
        private Double workloadDistribution;
        private List<TeamMemberPerformance> topPerformers;
        private List<TeamMemberPerformance> memberWorkload;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VelocityMetrics {
        private Double currentVelocity;
        private Double averageVelocity;
        private Double velocityTrend;
        private Integer sprintCapacity;
        private Integer completedStoryPoints;
        private List<SprintVelocity> sprintHistory;
        private BurndownData currentBurndown;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProjectHealthDistribution {
        private String status;
        private Long count;
        private Double percentage;
        private String color;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TaskStatusDistribution {
        private TaskStatus status;
        private Long count;
        private Double percentage;
        private String color;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TaskPriorityDistribution {
        private Priority priority;
        private Long count;
        private Double percentage;
        private String color;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeamMemberPerformance {
        private Long userId;
        private String username;
        private String fullName;
        private String avatar;
        private String jobTitle;
        private Long tasksCompleted;
        private Long totalTasks;
        private Double completionRate;
        private Double averageTaskDuration;
        private Integer totalStoryPoints;
        private Double efficiency;
        private Long hoursWorked;
        private List<TaskStatusCount> taskBreakdown;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TaskStatusCount {
        private TaskStatus status;
        private Long count;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SprintVelocity {
        private String sprintName;
        private LocalDate startDate;
        private LocalDate endDate;
        private Integer plannedPoints;
        private Integer completedPoints;
        private Double velocity;
        private Integer capacity;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BurndownData {
        private List<BurndownPoint> plannedBurndown;
        private List<BurndownPoint> actualBurndown;
        private LocalDate sprintStart;
        private LocalDate sprintEnd;
        private Integer totalPoints;
        private Integer remainingPoints;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BurndownPoint {
        private LocalDate date;
        private Integer remainingPoints;
        private Integer completedPoints;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrendData {
        private LocalDate date;
        private String period;
        private Double value;
        private Long count;
        private String label;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TimeRangeAnalytics {
        private String timeRange;
        private LocalDateTime startDate;
        private LocalDateTime endDate;
        private ProjectMetrics projects;
        private TaskMetrics tasks;
        private TeamMetrics team;
        private List<TrendData> dailyTrends;
        private List<TrendData> weeklyTrends;
        private List<ActivitySummary> activitySummary;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ActivitySummary {
        private LocalDate date;
        private Long tasksCreated;
        private Long tasksCompleted;
        private Long commitsCount;
        private Long commentsCount;
        private Long hoursLogged;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProjectAnalytics {
        private Long projectId;
        private String projectName;
        private ProjectStatus status;
        private Priority priority;
        private Double progress;
        private LocalDateTime startDate;
        private LocalDateTime dueDate;
        private Integer teamSize;
        private TaskMetrics taskMetrics;
        private List<TeamMemberPerformance> teamPerformance;
        private List<TrendData> progressTrend;
        private List<ActivitySummary> activityHistory;
        private ProjectRiskAssessment riskAssessment;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProjectRiskAssessment {
        private String riskLevel;
        private Double riskScore;
        private List<String> riskFactors;
        private List<String> recommendations;
        private Boolean isOnTrack;
        private Integer daysOverdue;
        private Double budgetUtilization;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WorkloadAnalytics {
        private TeamMetrics overallTeam;
        private List<TeamMemberWorkload> memberWorkloads;
        private List<ProjectWorkload> projectWorkloads;
        private WorkloadDistribution distribution;
        private List<String> recommendations;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeamMemberWorkload {
        private Long userId;
        private String username;
        private String fullName;
        private Long activeTasks;
        private Long overdueTasks;
        private Double workloadPercentage;
        private Integer totalStoryPoints;
        private String workloadStatus;
        private List<ProjectWorkloadBreakdown> projectBreakdown;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProjectWorkload {
        private Long projectId;
        private String projectName;
        private Integer teamSize;
        private Long totalTasks;
        private Long activeTasks;
        private Double averageWorkload;
        private String workloadStatus;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProjectWorkloadBreakdown {
        private Long projectId;
        private String projectName;
        private Long taskCount;
        private Integer storyPoints;
        private String status;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WorkloadDistribution {
        private Long underutilized;
        private Long optimal;
        private Long overloaded;
        private Double averageUtilization;
        private List<String> balancingRecommendations;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductivityAnalytics {
        private Double overallProductivity;
        private List<ProductivityTrend> trends;
        private List<ProductivityByTimeOfDay> timeOfDayAnalysis;
        private List<ProductivityByDayOfWeek> dayOfWeekAnalysis;
        private List<TeamMemberProductivity> memberProductivity;
        private ProductivityFactors factors;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductivityTrend {
        private LocalDate date;
        private Double productivity;
        private Long tasksCompleted;
        private Double averageTaskDuration;
        private Integer storyPointsCompleted;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductivityByTimeOfDay {
        private Integer hour;
        private String timeRange;
        private Long tasksCompleted;
        private Double productivity;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductivityByDayOfWeek {
        private String dayOfWeek;
        private Long tasksCompleted;
        private Double productivity;
        private Double averageTaskDuration;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeamMemberProductivity {
        private Long userId;
        private String username;
        private String fullName;
        private Double productivity;
        private Long tasksCompleted;
        private Double averageTaskDuration;
        private Integer storyPointsCompleted;
        private String productivityTrend;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductivityFactors {
        private List<String> positiveFactors;
        private List<String> negativeFactors;
        private List<String> recommendations;
        private Double teamCollaboration;
        private Double codeQuality;
        private Double processEfficiency;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CustomReportData {
        private String reportName;
        private String reportType;
        private LocalDateTime generatedAt;
        private Map<String, Object> parameters;
        private List<ReportSection> sections;
        private List<ChartData> charts;
        private Map<String, Object> summary;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReportSection {
        private String title;
        private String type;
        private Map<String, Object> data;
        private List<String> insights;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChartData {
        private String chartType;
        private String title;
        private List<String> labels;
        private List<ChartDataset> datasets;
        private Map<String, Object> options;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChartDataset {
        private String label;
        private List<Number> data;
        private String backgroundColor;
        private String borderColor;
        private Map<String, Object> styling;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AnalyticsFilter {
        private LocalDateTime startDate;
        private LocalDateTime endDate;
        private List<Long> projectIds;
        private List<Long> userIds;
        private List<TaskStatus> taskStatuses;
        private List<Priority> priorities;
        private String groupBy;
        private String timeGranularity;
        private Boolean includeArchived;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExportRequest {
        private String format;
        private String reportType;
        private AnalyticsFilter filter;
        private List<String> sections;
        private Map<String, Object> options;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExportResponse {
        private String downloadUrl;
        private String fileName;
        private String format;
        private Long fileSize;
        private LocalDateTime expiresAt;
    }
}