package com.devflow.backend.controller;

import com.devflow.backend.dto.common.ApiResponse;
import com.devflow.backend.dto.project.ProjectDTOs.*;
import com.devflow.backend.entity.User;
import com.devflow.backend.service.ProjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

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
}