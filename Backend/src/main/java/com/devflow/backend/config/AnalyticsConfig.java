package com.devflow.backend.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Configuration
@ConfigurationProperties(prefix = "analytics")
@Data
public class AnalyticsConfig {

    private Cache cache = new Cache();
    private Export export = new Export();
    private Performance performance = new Performance();
    private Features features = new Features();
    private Visualization visualization = new Visualization();

    @Data
    public static class Cache {
        private Duration ttl = Duration.ofMinutes(30);
        private int maxSize = 1000;
        private boolean enabled = true;
        private List<String> cacheableMetrics = List.of(
                "dashboard", "project-analytics", "team-performance", "workload", "productivity"
        );
    }

    @Data
    public static class Export {
        private List<String> supportedFormats = List.of("PDF", "XLSX", "CSV", "JSON");
        private long maxFileSize = 50 * 1024 * 1024L;
        private Duration urlExpiration = Duration.ofHours(24);
        private String storageLocation = "/tmp/analytics-exports";
        private boolean asyncProcessing = true;
    }

    @Data
    public static class Performance {
        private int maxQueryResults = 10000;
        private Duration queryTimeout = Duration.ofMinutes(5);
        private int batchSize = 1000;
        private boolean enableQueryOptimization = true;
        private int maxConcurrentReports = 5;
    }

    @Data
    public static class Features {
        private boolean realTimeMetrics = true;
        private boolean predictiveAnalytics = false;
        private boolean customDashboards = true;
        private boolean advancedFiltering = true;
        private boolean dataExport = true;
        private boolean scheduledReports = false;
        private List<String> enabledMetrics = List.of(
                "project-health", "task-completion", "team-velocity",
                "productivity", "workload", "burndown", "trends"
        );
    }

    @Data
    public static class Visualization {
        private Map<String, String> colorPalette = Map.of(
                "primary", "#3B82F6",
                "success", "#10B981",
                "warning", "#F59E0B",
                "danger", "#EF4444",
                "info", "#6366F1",
                "secondary", "#6B7280"
        );

        private Map<String, Object> chartDefaults = Map.of(
                "responsive", true,
                "maintainAspectRatio", false,
                "animation", Map.of("duration", 750),
                "plugins", Map.of(
                        "legend", Map.of("display", true, "position", "bottom"),
                        "tooltip", Map.of("enabled", true, "intersect", false)
                )
        );

        private List<String> supportedChartTypes = List.of(
                "line", "bar", "pie", "donut", "area", "scatter", "radar", "gauge"
        );
    }
}