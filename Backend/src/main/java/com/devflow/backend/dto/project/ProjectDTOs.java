package com.devflow.backend.dto.project;

import com.devflow.backend.entity.Priority;
import com.devflow.backend.entity.ProjectHealth;
import com.devflow.backend.entity.ProjectRole;
import com.devflow.backend.entity.ProjectStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class ProjectDTOs {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateProjectRequest {
        @NotBlank(message = "Project name is required")
        @Size(min = 2, max = 100, message = "Project name must be between 2 and 100 characters")
        private String name;

        @Size(max = 2000, message = "Description cannot exceed 2000 characters")
        private String description;

        private Priority priority;
        private LocalDateTime startDate;
        private LocalDateTime dueDate;
        private String color;
        private BigDecimal budget;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateProjectRequest {
        @Size(min = 2, max = 100, message = "Project name must be between 2 and 100 characters")
        private String name;

        @Size(max = 2000, message = "Description cannot exceed 2000 characters")
        private String description;

        private ProjectStatus status;
        private Priority priority;
        private LocalDateTime startDate;
        private LocalDateTime dueDate;
        private String color;
        private BigDecimal budget;
        private BigDecimal spent;
        private Integer progress;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProjectResponse {
        private Long id;
        private String name;
        private String description;
        private ProjectStatus status;
        private Priority priority;
        private LocalDateTime startDate;
        private LocalDateTime dueDate;
        private LocalDateTime completedDate;
        private String color;
        private Integer progress;
        private BigDecimal budget;
        private BigDecimal spent;
        private Boolean isArchived;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;


        private UserSummary owner;


        private Integer teamSize;
        private List<ProjectMemberResponse> members;


        private Integer totalTasks;
        private Integer completedTasks;
        private Integer overdueTasks;


        private ProjectHealth healthStatus;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProjectSummary {
        private Long id;
        private String name;
        private String description;
        private ProjectStatus status;
        private Priority priority;
        private LocalDateTime dueDate;
        private String color;
        private Integer progress;
        private Integer teamSize;
        private Integer totalTasks;
        private Integer completedTasks;
        private ProjectHealth healthStatus;
        private LocalDateTime updatedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProjectMemberResponse {
        private Long id;
        private UserSummary user;
        private ProjectRole role;
        private LocalDateTime joinedAt;
        private UserSummary invitedBy;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserSummary {
        private Long id;
        private String username;
        private String firstName;
        private String lastName;
        private String avatar;
        private String jobTitle;

        public String getFullName() {
            return firstName + " " + lastName;
        }

        public String getInitials() {
            return (firstName.substring(0, 1) + lastName.substring(0, 1)).toUpperCase();
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AddMemberRequest {
        @NotBlank(message = "Username or email is required")
        private String usernameOrEmail;

        private ProjectRole role = ProjectRole.DEVELOPER;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateMemberRoleRequest {
        private ProjectRole role;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProjectStatsResponse {
        private Long totalProjects;
        private Long activeProjects;
        private Long completedProjects;
        private Double averageProgress;
        private Long totalTasks;
        private Long completedTasks;
        private Long overdueTasks;
        private Integer teamMembersCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProjectHealthResponse {
        private ProjectHealth status;
        private String message;
        private List<String> suggestions;
        private Double riskScore; // 0-100, higher = more risk
    }
}