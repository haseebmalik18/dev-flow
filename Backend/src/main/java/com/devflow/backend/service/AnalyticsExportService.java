package com.devflow.backend.service;

import com.devflow.backend.controller.AnalyticsController;
import com.devflow.backend.dto.analytics.AnalyticsDTOs.*;
import com.devflow.backend.entity.User;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnalyticsExportService {

    private final AnalyticsService analyticsService;
    private final ObjectMapper objectMapper;

    public CustomReportData generateCustomReport(AnalyticsController.CustomReportRequest request, User user) {
        String timeRange = extractTimeRangeFromFilter(request.getFilter());

        DashboardMetrics dashboardMetrics = analyticsService.getDashboardMetrics(user, timeRange);
        WorkloadAnalytics workloadAnalytics = analyticsService.getWorkloadAnalytics(user);
        ProductivityAnalytics productivityAnalytics = analyticsService.getProductivityAnalytics(user, timeRange);

        List<ReportSection> sections = generateReportSections(request.getSections(),
                dashboardMetrics, workloadAnalytics, productivityAnalytics);

        List<ChartData> charts = generateChartData(request.getSections(),
                dashboardMetrics, workloadAnalytics, productivityAnalytics);

        Map<String, Object> summary = generateReportSummary(dashboardMetrics, workloadAnalytics, productivityAnalytics);

        return CustomReportData.builder()
                .reportName(request.getReportName())
                .reportType(request.getReportType())
                .generatedAt(LocalDateTime.now())
                .parameters(convertFilterToMap(request.getFilter()))
                .sections(sections)
                .charts(charts)
                .summary(summary)
                .build();
    }

    public ExportResponse exportAnalytics(ExportRequest request, User user) {
        String fileName = generateFileName(request.getReportType(), request.getFormat());
        String downloadUrl = generateDownloadUrl(fileName);

        return ExportResponse.builder()
                .downloadUrl(downloadUrl)
                .fileName(fileName)
                .format(request.getFormat().toUpperCase())
                .fileSize(calculateEstimatedFileSize(request))
                .expiresAt(LocalDateTime.now().plusHours(24))
                .build();
    }

    private List<ReportSection> generateReportSections(List<String> requestedSections,
                                                       DashboardMetrics dashboard,
                                                       WorkloadAnalytics workload,
                                                       ProductivityAnalytics productivity) {
        List<ReportSection> sections = new ArrayList<>();

        if (requestedSections == null || requestedSections.contains("overview")) {
            sections.add(generateOverviewSection(dashboard));
        }

        if (requestedSections == null || requestedSections.contains("projects")) {
            sections.add(generateProjectSection(dashboard.getProjectMetrics()));
        }

        if (requestedSections == null || requestedSections.contains("tasks")) {
            sections.add(generateTaskSection(dashboard.getTaskMetrics()));
        }

        if (requestedSections == null || requestedSections.contains("team")) {
            sections.add(generateTeamSection(dashboard.getTeamMetrics(), workload));
        }

        if (requestedSections == null || requestedSections.contains("velocity")) {
            sections.add(generateVelocitySection(dashboard.getVelocityMetrics()));
        }

        if (requestedSections == null || requestedSections.contains("productivity")) {
            sections.add(generateProductivitySection(productivity));
        }

        return sections;
    }

    private List<ChartData> generateChartData(List<String> requestedSections,
                                              DashboardMetrics dashboard,
                                              WorkloadAnalytics workload,
                                              ProductivityAnalytics productivity) {
        List<ChartData> charts = new ArrayList<>();

        if (requestedSections == null || requestedSections.contains("projects")) {
            charts.add(generateProjectHealthChart(dashboard.getProjectMetrics()));
        }

        if (requestedSections == null || requestedSections.contains("tasks")) {
            charts.add(generateTaskStatusChart(dashboard.getTaskMetrics()));
            charts.add(generateTaskPriorityChart(dashboard.getTaskMetrics()));
        }

        if (requestedSections == null || requestedSections.contains("team")) {
            charts.add(generateTeamPerformanceChart(dashboard.getTeamMetrics()));
        }

        if (requestedSections == null || requestedSections.contains("velocity")) {
            charts.add(generateVelocityTrendChart(dashboard.getVelocityMetrics()));
            charts.add(generateBurndownChart(dashboard.getVelocityMetrics()));
        }

        if (requestedSections == null || requestedSections.contains("productivity")) {
            charts.add(generateProductivityTrendChart(productivity));
        }

        return charts;
    }

    private ReportSection generateOverviewSection(DashboardMetrics dashboard) {
        Map<String, Object> data = new HashMap<>();
        data.put("totalProjects", dashboard.getProjectMetrics().getTotalProjects());
        data.put("activeProjects", dashboard.getProjectMetrics().getActiveProjects());
        data.put("completedProjects", dashboard.getProjectMetrics().getCompletedProjects());
        data.put("totalTasks", dashboard.getTaskMetrics().getTotalTasks());
        data.put("completedTasks", dashboard.getTaskMetrics().getCompletedTasks());
        data.put("overdueTasks", dashboard.getTaskMetrics().getOverdueTasks());
        data.put("teamMembers", dashboard.getTeamMetrics().getTotalMembers());
        data.put("teamEfficiency", dashboard.getTeamMetrics().getTeamEfficiency());

        List<String> insights = Arrays.asList(
                "Overall project completion rate: " + dashboard.getProjectMetrics().getCompletionRate() + "%",
                "Task completion rate: " + dashboard.getTaskMetrics().getCompletionRate() + "%",
                "Team efficiency: " + dashboard.getTeamMetrics().getTeamEfficiency() + "%",
                generateTrendInsight(dashboard.getProjectMetrics().getChangeFromLastPeriod(), "project completion"),
                generateTrendInsight(dashboard.getTaskMetrics().getChangeFromLastPeriod(), "task completion")
        );

        return ReportSection.builder()
                .title("Executive Summary")
                .type("overview")
                .data(data)
                .insights(insights)
                .build();
    }

    private ReportSection generateProjectSection(ProjectMetrics metrics) {
        Map<String, Object> data = new HashMap<>();
        data.put("metrics", metrics);
        data.put("healthDistribution", metrics.getHealthDistribution());

        List<String> insights = Arrays.asList(
                "Total projects: " + metrics.getTotalProjects(),
                "Completion rate: " + metrics.getCompletionRate() + "%",
                "Average progress: " + metrics.getAverageProgress() + "%",
                "Projects at risk: " + metrics.getHealthDistribution().stream()
                        .filter(h -> "AT_RISK".equals(h.getStatus()) || "DELAYED".equals(h.getStatus()))
                        .mapToLong(ProjectHealthDistribution::getCount)
                        .sum(),
                generateTrendInsight(metrics.getChangeFromLastPeriod(), "project metrics")
        );

        return ReportSection.builder()
                .title("Project Performance")
                .type("projects")
                .data(data)
                .insights(insights)
                .build();
    }

    private ReportSection generateTaskSection(TaskMetrics metrics) {
        Map<String, Object> data = new HashMap<>();
        data.put("metrics", metrics);
        data.put("statusDistribution", metrics.getStatusDistribution());
        data.put("priorityDistribution", metrics.getPriorityDistribution());

        List<String> insights = Arrays.asList(
                "Total tasks: " + metrics.getTotalTasks(),
                "Completion rate: " + metrics.getCompletionRate() + "%",
                "Average task duration: " + metrics.getAverageTaskDuration() + " days",
                "Overdue tasks: " + metrics.getOverdueTasks(),
                "Blocked tasks: " + metrics.getBlockedTasks(),
                generateTrendInsight(metrics.getChangeFromLastPeriod(), "task completion")
        );

        return ReportSection.builder()
                .title("Task Analysis")
                .type("tasks")
                .data(data)
                .insights(insights)
                .build();
    }

    private ReportSection generateTeamSection(TeamMetrics metrics, WorkloadAnalytics workload) {
        Map<String, Object> data = new HashMap<>();
        data.put("teamMetrics", metrics);
        data.put("workloadDistribution", workload.getDistribution());
        data.put("topPerformers", metrics.getTopPerformers());

        List<String> insights = Arrays.asList(
                "Team size: " + metrics.getTotalMembers(),
                "Team efficiency: " + metrics.getTeamEfficiency() + "%",
                "Average tasks per member: " + metrics.getAverageTasksPerMember(),
                "Workload distribution score: " + metrics.getWorkloadDistribution() + "%",
                "Underutilized members: " + workload.getDistribution().getUnderutilized(),
                "Overloaded members: " + workload.getDistribution().getOverloaded()
        );

        return ReportSection.builder()
                .title("Team Performance & Workload")
                .type("team")
                .data(data)
                .insights(insights)
                .build();
    }

    private ReportSection generateVelocitySection(VelocityMetrics metrics) {
        Map<String, Object> data = new HashMap<>();
        data.put("velocityMetrics", metrics);
        data.put("sprintHistory", metrics.getSprintHistory());
        data.put("burndownData", metrics.getCurrentBurndown());

        List<String> insights = Arrays.asList(
                "Current velocity: " + metrics.getCurrentVelocity() + " story points",
                "Average velocity: " + metrics.getAverageVelocity() + " story points",
                "Velocity trend: " + formatTrend(metrics.getVelocityTrend()),
                "Sprint capacity: " + metrics.getSprintCapacity() + " story points",
                "Completed story points: " + metrics.getCompletedStoryPoints()
        );

        return ReportSection.builder()
                .title("Velocity & Sprint Analysis")
                .type("velocity")
                .data(data)
                .insights(insights)
                .build();
    }

    private ReportSection generateProductivitySection(ProductivityAnalytics analytics) {
        Map<String, Object> data = new HashMap<>();
        data.put("overallProductivity", analytics.getOverallProductivity());
        data.put("trends", analytics.getTrends());
        data.put("timeOfDayAnalysis", analytics.getTimeOfDayAnalysis());
        data.put("dayOfWeekAnalysis", analytics.getDayOfWeekAnalysis());
        data.put("factors", analytics.getFactors());

        List<String> insights = Arrays.asList(
                "Overall productivity: " + analytics.getOverallProductivity() + "%",
                "Team collaboration: " + analytics.getFactors().getTeamCollaboration() + "%",
                "Code quality: " + analytics.getFactors().getCodeQuality() + "%",
                "Process efficiency: " + analytics.getFactors().getProcessEfficiency() + "%",
                "Peak productivity: " + findPeakProductivityTime(analytics.getTimeOfDayAnalysis()),
                "Most productive day: " + findMostProductiveDay(analytics.getDayOfWeekAnalysis())
        );

        return ReportSection.builder()
                .title("Productivity Analysis")
                .type("productivity")
                .data(data)
                .insights(insights)
                .build();
    }

    private ChartData generateProjectHealthChart(ProjectMetrics metrics) {
        List<String> labels = metrics.getHealthDistribution().stream()
                .map(ProjectHealthDistribution::getStatus)
                .collect(Collectors.toList());

        List<Number> data = metrics.getHealthDistribution().stream()
                .map(ProjectHealthDistribution::getCount)
                .collect(Collectors.toList());

        List<String> colors = metrics.getHealthDistribution().stream()
                .map(ProjectHealthDistribution::getColor)
                .collect(Collectors.toList());

        ChartDataset dataset = ChartDataset.builder()
                .label("Project Health")
                .data(data)
                .backgroundColor(String.join(",", colors))
                .styling(Map.of("type", "pie"))
                .build();

        return ChartData.builder()
                .chartType("pie")
                .title("Project Health Distribution")
                .labels(labels)
                .datasets(List.of(dataset))
                .options(Map.of("responsive", true, "legend", Map.of("position", "bottom")))
                .build();
    }

    private ChartData generateTaskStatusChart(TaskMetrics metrics) {
        List<String> labels = metrics.getStatusDistribution().stream()
                .map(dist -> dist.getStatus().name())
                .collect(Collectors.toList());

        List<Number> data = metrics.getStatusDistribution().stream()
                .map(TaskStatusDistribution::getCount)
                .collect(Collectors.toList());

        List<String> colors = metrics.getStatusDistribution().stream()
                .map(TaskStatusDistribution::getColor)
                .collect(Collectors.toList());

        ChartDataset dataset = ChartDataset.builder()
                .label("Task Status")
                .data(data)
                .backgroundColor(String.join(",", colors))
                .build();

        return ChartData.builder()
                .chartType("donut")
                .title("Task Status Distribution")
                .labels(labels)
                .datasets(List.of(dataset))
                .options(Map.of("responsive", true, "cutout", "50%"))
                .build();
    }

    private ChartData generateTaskPriorityChart(TaskMetrics metrics) {
        List<String> labels = metrics.getPriorityDistribution().stream()
                .map(dist -> dist.getPriority().name())
                .collect(Collectors.toList());

        List<Number> data = metrics.getPriorityDistribution().stream()
                .map(TaskPriorityDistribution::getCount)
                .collect(Collectors.toList());

        List<String> colors = metrics.getPriorityDistribution().stream()
                .map(TaskPriorityDistribution::getColor)
                .collect(Collectors.toList());

        ChartDataset dataset = ChartDataset.builder()
                .label("Task Priority")
                .data(data)
                .backgroundColor(String.join(",", colors))
                .borderColor("#ffffff")
                .styling(Map.of("borderWidth", 2))
                .build();

        return ChartData.builder()
                .chartType("bar")
                .title("Task Priority Distribution")
                .labels(labels)
                .datasets(List.of(dataset))
                .options(Map.of("responsive", true, "scales", Map.of(
                        "y", Map.of("beginAtZero", true)
                )))
                .build();
    }

    private ChartData generateTeamPerformanceChart(TeamMetrics metrics) {
        List<String> labels = metrics.getTopPerformers().stream()
                .map(TeamMemberPerformance::getFullName)
                .limit(10)
                .collect(Collectors.toList());

        List<Number> efficiency = metrics.getTopPerformers().stream()
                .map(TeamMemberPerformance::getEfficiency)
                .limit(10)
                .collect(Collectors.toList());

        List<Number> tasksCompleted = metrics.getTopPerformers().stream()
                .map(TeamMemberPerformance::getTasksCompleted)
                .limit(10)
                .collect(Collectors.toList());

        ChartDataset efficiencyDataset = ChartDataset.builder()
                .label("Efficiency (%)")
                .data(efficiency)
                .backgroundColor("#3B82F6")
                .borderColor("#2563EB")
                .styling(Map.of("borderWidth", 2))
                .build();

        ChartDataset tasksDataset = ChartDataset.builder()
                .label("Tasks Completed")
                .data(tasksCompleted)
                .backgroundColor("#10B981")
                .borderColor("#059669")
                .styling(Map.of("borderWidth", 2))
                .build();

        return ChartData.builder()
                .chartType("bar")
                .title("Team Performance")
                .labels(labels)
                .datasets(List.of(efficiencyDataset, tasksDataset))
                .options(Map.of("responsive", true, "scales", Map.of(
                        "y", Map.of("beginAtZero", true)
                )))
                .build();
    }

    private ChartData generateVelocityTrendChart(VelocityMetrics metrics) {
        List<String> labels = metrics.getSprintHistory().stream()
                .map(SprintVelocity::getSprintName)
                .collect(Collectors.toList());

        List<Number> velocity = metrics.getSprintHistory().stream()
                .map(SprintVelocity::getVelocity)
                .collect(Collectors.toList());

        List<Number> capacity = metrics.getSprintHistory().stream()
                .map(SprintVelocity::getCapacity)
                .collect(Collectors.toList());

        ChartDataset velocityDataset = ChartDataset.builder()
                .label("Velocity")
                .data(velocity)
                .backgroundColor("rgba(59, 130, 246, 0.1)")
                .borderColor("#3B82F6")
                .styling(Map.of("borderWidth", 3, "fill", true))
                .build();

        ChartDataset capacityDataset = ChartDataset.builder()
                .label("Capacity")
                .data(capacity)
                .backgroundColor("rgba(107, 114, 128, 0.1)")
                .borderColor("#6B7280")
                .styling(Map.of("borderWidth", 2, "borderDash", List.of(5, 5)))
                .build();

        return ChartData.builder()
                .chartType("line")
                .title("Velocity Trend")
                .labels(labels)
                .datasets(List.of(velocityDataset, capacityDataset))
                .options(Map.of("responsive", true, "interaction", Map.of("intersect", false)))
                .build();
    }

    private ChartData generateBurndownChart(VelocityMetrics metrics) {
        BurndownData burndown = metrics.getCurrentBurndown();

        List<String> labels = burndown.getPlannedBurndown().stream()
                .map(point -> point.getDate().toString())
                .collect(Collectors.toList());

        List<Number> planned = burndown.getPlannedBurndown().stream()
                .map(BurndownPoint::getRemainingPoints)
                .collect(Collectors.toList());

        List<Number> actual = burndown.getActualBurndown().stream()
                .map(BurndownPoint::getRemainingPoints)
                .collect(Collectors.toList());

        ChartDataset plannedDataset = ChartDataset.builder()
                .label("Planned")
                .data(planned)
                .borderColor("#6B7280")
                .backgroundColor("transparent")
                .styling(Map.of("borderDash", List.of(5, 5), "borderWidth", 2))
                .build();

        ChartDataset actualDataset = ChartDataset.builder()
                .label("Actual")
                .data(actual)
                .borderColor("#3B82F6")
                .backgroundColor("rgba(59, 130, 246, 0.1)")
                .styling(Map.of("borderWidth", 3, "fill", true))
                .build();

        return ChartData.builder()
                .chartType("line")
                .title("Sprint Burndown")
                .labels(labels)
                .datasets(List.of(plannedDataset, actualDataset))
                .options(Map.of("responsive", true, "scales", Map.of(
                        "y", Map.of("beginAtZero", true)
                )))
                .build();
    }

    private ChartData generateProductivityTrendChart(ProductivityAnalytics analytics) {
        List<String> labels = analytics.getTrends().stream()
                .map(trend -> trend.getDate().toString())
                .collect(Collectors.toList());

        List<Number> productivity = analytics.getTrends().stream()
                .map(ProductivityTrend::getProductivity)
                .collect(Collectors.toList());

        List<Number> tasksCompleted = analytics.getTrends().stream()
                .map(ProductivityTrend::getTasksCompleted)
                .collect(Collectors.toList());

        ChartDataset productivityDataset = ChartDataset.builder()
                .label("Productivity (%)")
                .data(productivity)
                .borderColor("#10B981")
                .backgroundColor("rgba(16, 185, 129, 0.1)")
                .styling(Map.of("borderWidth", 3, "fill", true))
                .build();

        ChartDataset tasksDataset = ChartDataset.builder()
                .label("Tasks Completed")
                .data(tasksCompleted)
                .borderColor("#F59E0B")
                .backgroundColor("rgba(245, 158, 11, 0.1)")
                .styling(Map.of("borderWidth", 2, "fill", false))
                .build();

        return ChartData.builder()
                .chartType("area")
                .title("Productivity Trend")
                .labels(labels)
                .datasets(List.of(productivityDataset, tasksDataset))
                .options(Map.of("responsive", true, "interaction", Map.of("mode", "index")))
                .build();
    }

    private Map<String, Object> generateReportSummary(DashboardMetrics dashboard,
                                                      WorkloadAnalytics workload,
                                                      ProductivityAnalytics productivity) {
        Map<String, Object> summary = new HashMap<>();

        summary.put("generatedAt", LocalDateTime.now());
        summary.put("totalProjects", dashboard.getProjectMetrics().getTotalProjects());
        summary.put("totalTasks", dashboard.getTaskMetrics().getTotalTasks());
        summary.put("teamSize", dashboard.getTeamMetrics().getTotalMembers());
        summary.put("overallProductivity", productivity.getOverallProductivity());
        summary.put("teamEfficiency", dashboard.getTeamMetrics().getTeamEfficiency());
        summary.put("projectCompletionRate", dashboard.getProjectMetrics().getCompletionRate());
        summary.put("taskCompletionRate", dashboard.getTaskMetrics().getCompletionRate());
        summary.put("currentVelocity", dashboard.getVelocityMetrics().getCurrentVelocity());
        summary.put("workloadBalance", workload.getDistribution().getAverageUtilization());

        summary.put("keyInsights", Arrays.asList(
                "Project completion rate: " + dashboard.getProjectMetrics().getCompletionRate() + "%",
                "Team efficiency: " + dashboard.getTeamMetrics().getTeamEfficiency() + "%",
                "Current velocity: " + dashboard.getVelocityMetrics().getCurrentVelocity() + " story points",
                "Overdue tasks: " + dashboard.getTaskMetrics().getOverdueTasks(),
                "Team productivity: " + productivity.getOverallProductivity() + "%"
        ));

        summary.put("recommendations", generateSummaryRecommendations(dashboard, workload, productivity));

        return summary;
    }

    private List<String> generateSummaryRecommendations(DashboardMetrics dashboard,
                                                        WorkloadAnalytics workload,
                                                        ProductivityAnalytics productivity) {
        List<String> recommendations = new ArrayList<>();

        if (dashboard.getTaskMetrics().getOverdueTasks() > 0) {
            recommendations.add("Address " + dashboard.getTaskMetrics().getOverdueTasks() + " overdue tasks immediately");
        }

        if (dashboard.getTaskMetrics().getBlockedTasks() > 0) {
            recommendations.add("Resolve " + dashboard.getTaskMetrics().getBlockedTasks() + " blocked tasks to improve flow");
        }

        if (workload.getDistribution().getOverloaded() > 0) {
            recommendations.add("Redistribute workload for " + workload.getDistribution().getOverloaded() + " overloaded team members");
        }

        if (dashboard.getTeamMetrics().getTeamEfficiency() < 70) {
            recommendations.add("Focus on improving team efficiency through process optimization");
        }

        if (productivity.getOverallProductivity() < 60) {
            recommendations.add("Implement productivity improvement initiatives");
        }

        if (dashboard.getVelocityMetrics().getVelocityTrend() < 0) {
            recommendations.add("Investigate causes of declining velocity trend");
        }

        if (recommendations.isEmpty()) {
            recommendations.add("Team is performing well - continue current practices");
        }

        return recommendations;
    }

    private String extractTimeRangeFromFilter(AnalyticsFilter filter) {
        if (filter == null) return "last30days";

        if (filter.getStartDate() != null && filter.getEndDate() != null) {
            long days = java.time.temporal.ChronoUnit.DAYS.between(filter.getStartDate(), filter.getEndDate());
            if (days <= 7) return "last7days";
            if (days <= 30) return "last30days";
            if (days <= 90) return "last90days";
            if (days <= 180) return "last6months";
            return "lastyear";
        }

        return "last30days";
    }

    private Map<String, Object> convertFilterToMap(AnalyticsFilter filter) {
        Map<String, Object> map = new HashMap<>();
        if (filter == null) return map;

        map.put("startDate", filter.getStartDate());
        map.put("endDate", filter.getEndDate());
        map.put("projectIds", filter.getProjectIds());
        map.put("userIds", filter.getUserIds());
        map.put("taskStatuses", filter.getTaskStatuses());
        map.put("priorities", filter.getPriorities());
        map.put("groupBy", filter.getGroupBy());
        map.put("timeGranularity", filter.getTimeGranularity());
        map.put("includeArchived", filter.getIncludeArchived());

        return map;
    }

    private String generateFileName(String reportType, String format) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm-ss"));
        return String.format("analytics_%s_%s.%s", reportType, timestamp, format.toLowerCase());
    }

    private String generateDownloadUrl(String fileName) {
        return "/api/v1/analytics/downloads/" + fileName;
    }

    private Long calculateEstimatedFileSize(ExportRequest request) {
        long baseSize = 50000L;

        if ("PDF".equalsIgnoreCase(request.getFormat())) {
            baseSize *= 2;
        } else if ("XLSX".equalsIgnoreCase(request.getFormat())) {
            baseSize *= 1.5;
        }

        if (request.getSections() != null) {
            baseSize += request.getSections().size() * 10000L;
        }

        return baseSize;
    }

    private String generateTrendInsight(Double changePercent, String metric) {
        if (changePercent == null || changePercent == 0) {
            return metric + " remained stable";
        }

        String direction = changePercent > 0 ? "increased" : "decreased";
        return metric + " " + direction + " by " + Math.abs(changePercent) + "% from previous period";
    }

    private String formatTrend(Double trend) {
        if (trend == null || trend == 0) return "stable";
        return (trend > 0 ? "+" : "") + String.format("%.1f%%", trend);
    }

    private String findPeakProductivityTime(List<ProductivityByTimeOfDay> timeAnalysis) {
        return timeAnalysis.stream()
                .max(Comparator.comparing(ProductivityByTimeOfDay::getProductivity))
                .map(ProductivityByTimeOfDay::getTimeRange)
                .orElse("Unknown");
    }

    private String findMostProductiveDay(List<ProductivityByDayOfWeek> dayAnalysis) {
        return dayAnalysis.stream()
                .max(Comparator.comparing(ProductivityByDayOfWeek::getProductivity))
                .map(ProductivityByDayOfWeek::getDayOfWeek)
                .orElse("Unknown");
    }
}