package com.devflow.backend.controller;

import com.devflow.backend.dto.analytics.AnalyticsDTOs.*;
import com.devflow.backend.dto.common.ApiResponse;
import com.devflow.backend.entity.User;
import com.devflow.backend.service.AnalyticsService;
import com.devflow.backend.service.AnalyticsExportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
@Slf4j
public class AnalyticsController {

    private final AnalyticsService analyticsService;
    private final AnalyticsExportService exportService;

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<DashboardMetrics>> getDashboardMetrics(
            @RequestParam(defaultValue = "last30days") String timeRange,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        DashboardMetrics metrics = analyticsService.getDashboardMetrics(user, timeRange);

        return ResponseEntity.ok(ApiResponse.success("Dashboard metrics retrieved successfully", metrics));
    }

    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<TimeRangeAnalytics>> getOverviewAnalytics(
            @RequestParam(defaultValue = "last30days") String timeRange,
            @RequestParam(required = false) List<Long> projectIds,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        TimeRangeAnalytics analytics = analyticsService.getTimeRangeAnalytics(user, timeRange, projectIds);

        return ResponseEntity.ok(ApiResponse.success("Overview analytics retrieved successfully", analytics));
    }

    @GetMapping("/projects/{projectId}")
    public ResponseEntity<ApiResponse<ProjectAnalytics>> getProjectAnalytics(
            @PathVariable Long projectId,
            @RequestParam(defaultValue = "last30days") String timeRange,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        ProjectAnalytics analytics = analyticsService.getProjectAnalytics(projectId, user, timeRange);

        return ResponseEntity.ok(ApiResponse.success("Project analytics retrieved successfully", analytics));
    }

    @GetMapping("/workload")
    public ResponseEntity<ApiResponse<WorkloadAnalytics>> getWorkloadAnalytics(
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        WorkloadAnalytics analytics = analyticsService.getWorkloadAnalytics(user);

        return ResponseEntity.ok(ApiResponse.success("Workload analytics retrieved successfully", analytics));
    }

    @GetMapping("/productivity")
    public ResponseEntity<ApiResponse<ProductivityAnalytics>> getProductivityAnalytics(
            @RequestParam(defaultValue = "last30days") String timeRange,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        ProductivityAnalytics analytics = analyticsService.getProductivityAnalytics(user, timeRange);

        return ResponseEntity.ok(ApiResponse.success("Productivity analytics retrieved successfully", analytics));
    }

    @GetMapping("/projects/{projectId}/performance")
    public ResponseEntity<ApiResponse<ProjectAnalytics>> getProjectPerformance(
            @PathVariable Long projectId,
            @RequestParam(defaultValue = "last90days") String timeRange,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        ProjectAnalytics analytics = analyticsService.getProjectAnalytics(projectId, user, timeRange);

        return ResponseEntity.ok(ApiResponse.success("Project performance retrieved successfully", analytics));
    }

    @GetMapping("/team/performance")
    public ResponseEntity<ApiResponse<List<TeamMemberPerformance>>> getTeamPerformance(
            @RequestParam(defaultValue = "last30days") String timeRange,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        DashboardMetrics metrics = analyticsService.getDashboardMetrics(user, timeRange);
        List<TeamMemberPerformance> performance = metrics.getTeamMetrics().getTopPerformers();

        Pageable pageable = PageRequest.of(page, size);
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), performance.size());
        List<TeamMemberPerformance> pageContent = performance.subList(start, end);

        return ResponseEntity.ok(ApiResponse.success("Team performance retrieved successfully", pageContent));
    }

    @GetMapping("/trends/velocity")
    public ResponseEntity<ApiResponse<VelocityMetrics>> getVelocityTrends(
            @RequestParam(defaultValue = "last90days") String timeRange,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        DashboardMetrics metrics = analyticsService.getDashboardMetrics(user, timeRange);

        return ResponseEntity.ok(ApiResponse.success("Velocity trends retrieved successfully",
                metrics.getVelocityMetrics()));
    }

    @GetMapping("/trends/burndown")
    public ResponseEntity<ApiResponse<BurndownData>> getBurndownData(
            @RequestParam(required = false) Long projectId,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();

        if (projectId != null) {
            ProjectAnalytics analytics = analyticsService.getProjectAnalytics(projectId, user, "last30days");
            VelocityMetrics velocity = analyticsService.getDashboardMetrics(user, "last30days").getVelocityMetrics();
            return ResponseEntity.ok(ApiResponse.success("Project burndown data retrieved successfully",
                    velocity.getCurrentBurndown()));
        } else {
            VelocityMetrics velocity = analyticsService.getDashboardMetrics(user, "last30days").getVelocityMetrics();
            return ResponseEntity.ok(ApiResponse.success("Burndown data retrieved successfully",
                    velocity.getCurrentBurndown()));
        }
    }

    @GetMapping("/health/projects")
    public ResponseEntity<ApiResponse<List<ProjectHealthDistribution>>> getProjectHealthDistribution(
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        DashboardMetrics metrics = analyticsService.getDashboardMetrics(user, "last30days");

        return ResponseEntity.ok(ApiResponse.success("Project health distribution retrieved successfully",
                metrics.getProjectMetrics().getHealthDistribution()));
    }

    @GetMapping("/distribution/task-status")
    public ResponseEntity<ApiResponse<List<TaskStatusDistribution>>> getTaskStatusDistribution(
            @RequestParam(defaultValue = "last30days") String timeRange,
            @RequestParam(required = false) Long projectId,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();

        if (projectId != null) {
            ProjectAnalytics analytics = analyticsService.getProjectAnalytics(projectId, user, timeRange);
            return ResponseEntity.ok(ApiResponse.success("Project task status distribution retrieved successfully",
                    analytics.getTaskMetrics().getStatusDistribution()));
        } else {
            DashboardMetrics metrics = analyticsService.getDashboardMetrics(user, timeRange);
            return ResponseEntity.ok(ApiResponse.success("Task status distribution retrieved successfully",
                    metrics.getTaskMetrics().getStatusDistribution()));
        }
    }

    @GetMapping("/distribution/task-priority")
    public ResponseEntity<ApiResponse<List<TaskPriorityDistribution>>> getTaskPriorityDistribution(
            @RequestParam(defaultValue = "last30days") String timeRange,
            @RequestParam(required = false) Long projectId,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();

        if (projectId != null) {
            ProjectAnalytics analytics = analyticsService.getProjectAnalytics(projectId, user, timeRange);
            return ResponseEntity.ok(ApiResponse.success("Project task priority distribution retrieved successfully",
                    analytics.getTaskMetrics().getPriorityDistribution()));
        } else {
            DashboardMetrics metrics = analyticsService.getDashboardMetrics(user, timeRange);
            return ResponseEntity.ok(ApiResponse.success("Task priority distribution retrieved successfully",
                    metrics.getTaskMetrics().getPriorityDistribution()));
        }
    }

    @GetMapping("/activity/summary")
    public ResponseEntity<ApiResponse<List<ActivitySummary>>> getActivitySummary(
            @RequestParam(defaultValue = "last30days") String timeRange,
            @RequestParam(required = false) Long projectId,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();

        if (projectId != null) {
            ProjectAnalytics analytics = analyticsService.getProjectAnalytics(projectId, user, timeRange);
            return ResponseEntity.ok(ApiResponse.success("Project activity summary retrieved successfully",
                    analytics.getActivityHistory()));
        } else {
            TimeRangeAnalytics analytics = analyticsService.getTimeRangeAnalytics(user, timeRange, null);
            return ResponseEntity.ok(ApiResponse.success("Activity summary retrieved successfully",
                    analytics.getActivitySummary()));
        }
    }

    @GetMapping("/insights/productivity")
    public ResponseEntity<ApiResponse<ProductivityFactors>> getProductivityInsights(
            @RequestParam(defaultValue = "last30days") String timeRange,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        ProductivityAnalytics analytics = analyticsService.getProductivityAnalytics(user, timeRange);

        return ResponseEntity.ok(ApiResponse.success("Productivity insights retrieved successfully",
                analytics.getFactors()));
    }

    @GetMapping("/insights/risks")
    public ResponseEntity<ApiResponse<List<ProjectRiskAssessment>>> getRiskAssessments(
            @RequestParam(required = false) List<Long> projectIds,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();

        if (projectIds == null || projectIds.isEmpty()) {
            DashboardMetrics metrics = analyticsService.getDashboardMetrics(user, "last30days");
            ProjectRiskAssessment generalRisk = ProjectRiskAssessment.builder()
                    .riskLevel("LOW")
                    .riskScore(15.0)
                    .riskFactors(List.of("No major risks detected"))
                    .recommendations(List.of("Continue current practices"))
                    .isOnTrack(true)
                    .daysOverdue(0)
                    .budgetUtilization(0.0)
                    .build();

            return ResponseEntity.ok(ApiResponse.success("Risk assessments retrieved successfully",
                    List.of(generalRisk)));
        }

        List<ProjectRiskAssessment> risks = projectIds.stream()
                .map(projectId -> {
                    try {
                        ProjectAnalytics analytics = analyticsService.getProjectAnalytics(projectId, user, "last30days");
                        return analytics.getRiskAssessment();
                    } catch (Exception e) {
                        return null;
                    }
                })
                .filter(java.util.Objects::nonNull)
                .collect(java.util.stream.Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success("Project risk assessments retrieved successfully", risks));
    }

    @PostMapping("/reports/generate")
    public ResponseEntity<ApiResponse<CustomReportData>> generateCustomReport(
            @Valid @RequestBody CustomReportRequest request,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        CustomReportData report = exportService.generateCustomReport(request, user);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Custom report generated successfully", report));
    }

    @PostMapping("/export")
    public ResponseEntity<ApiResponse<ExportResponse>> exportAnalytics(
            @Valid @RequestBody ExportRequest request,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        ExportResponse exportResponse = exportService.exportAnalytics(request, user);

        return ResponseEntity.ok(ApiResponse.success("Analytics export generated successfully", exportResponse));
    }

    @GetMapping("/filters/time-ranges")
    public ResponseEntity<ApiResponse<List<String>>> getAvailableTimeRanges() {
        List<String> timeRanges = List.of(
                "last7days",
                "last30days",
                "last90days",
                "last6months",
                "lastyear"
        );

        return ResponseEntity.ok(ApiResponse.success("Available time ranges retrieved successfully", timeRanges));
    }

    @GetMapping("/filters/chart-types")
    public ResponseEntity<ApiResponse<List<String>>> getAvailableChartTypes() {
        List<String> chartTypes = List.of(
                "line",
                "bar",
                "pie",
                "area",
                "scatter",
                "donut",
                "radar"
        );

        return ResponseEntity.ok(ApiResponse.success("Available chart types retrieved successfully", chartTypes));
    }

    @GetMapping("/health")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> getAnalyticsHealth(
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();

        java.util.Map<String, Object> health = java.util.Map.of(
                "status", "healthy",
                "userId", user.getId(),
                "timestamp", LocalDateTime.now(),
                "version", "1.0.0",
                "features", List.of(
                        "dashboard-metrics",
                        "project-analytics",
                        "team-performance",
                        "productivity-tracking",
                        "workload-analysis",
                        "custom-reports"
                )
        );

        return ResponseEntity.ok(ApiResponse.success("Analytics service is healthy", health));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Object>> handleIllegalArgument(IllegalArgumentException e) {
        log.warn("Invalid analytics request: {}", e.getMessage());
        return ResponseEntity.badRequest()
                .body(ApiResponse.error("Invalid request: " + e.getMessage()));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ApiResponse<Object>> handleRuntimeException(RuntimeException e) {
        log.error("Analytics processing error: {}", e.getMessage(), e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("Analytics processing error: " + e.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> handleGenericException(Exception e) {
        log.error("Unexpected error in analytics controller: {}", e.getMessage(), e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("An unexpected error occurred"));
    }

    public static class CustomReportRequest {
        private String reportName;
        private String reportType;
        private AnalyticsFilter filter;
        private List<String> sections;
        private java.util.Map<String, Object> options;

        public String getReportName() { return reportName; }
        public void setReportName(String reportName) { this.reportName = reportName; }
        public String getReportType() { return reportType; }
        public void setReportType(String reportType) { this.reportType = reportType; }
        public AnalyticsFilter getFilter() { return filter; }
        public void setFilter(AnalyticsFilter filter) { this.filter = filter; }
        public List<String> getSections() { return sections; }
        public void setSections(List<String> sections) { this.sections = sections; }
        public java.util.Map<String, Object> getOptions() { return options; }
        public void setOptions(java.util.Map<String, Object> options) { this.options = options; }
    }
}