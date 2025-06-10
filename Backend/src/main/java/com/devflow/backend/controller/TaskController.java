package com.devflow.backend.controller;

import com.devflow.backend.dto.common.ApiResponse;
import com.devflow.backend.dto.task.TaskDTOs.*;
import com.devflow.backend.entity.Priority;
import com.devflow.backend.entity.TaskStatus;
import com.devflow.backend.entity.User;
import com.devflow.backend.service.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    @PostMapping("/projects/{projectId}")
    public ResponseEntity<ApiResponse<TaskResponse>> createTask(
            @PathVariable Long projectId,
            @Valid @RequestBody CreateTaskRequest request,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        TaskResponse task = taskService.createTask(projectId, request, user);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Task created successfully", task));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TaskResponse>> getTask(
            @PathVariable Long id,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        TaskResponse task = taskService.getTaskById(id, user);

        return ResponseEntity.ok(ApiResponse.success("Task retrieved successfully", task));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<TaskResponse>> updateTask(
            @PathVariable Long id,
            @Valid @RequestBody UpdateTaskRequest request,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        TaskResponse task = taskService.updateTask(id, request, user);

        return ResponseEntity.ok(ApiResponse.success("Task updated successfully", task));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Object>> deleteTask(
            @PathVariable Long id,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        taskService.deleteTask(id, user);

        return ResponseEntity.ok(ApiResponse.success("Task deleted successfully"));
    }

    @GetMapping("/projects/{projectId}")
    public ResponseEntity<ApiResponse<Page<TaskSummary>>> getProjectTasks(
            @PathVariable Long projectId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) TaskStatus status,
            @RequestParam(required = false) Priority priority,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) Boolean isOverdue,
            @RequestParam(required = false) Boolean isBlocked,
            @RequestParam(required = false) String tags,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dueDateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dueDateTo,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();

        TaskFilterRequest filterRequest = TaskFilterRequest.builder()
                .status(status)
                .priority(priority)
                .assigneeId(assigneeId)
                .projectId(projectId)
                .isOverdue(isOverdue)
                .isBlocked(isBlocked)
                .tags(tags)
                .search(search)
                .dueDateFrom(dueDateFrom)
                .dueDateTo(dueDateTo)
                .build();

        Page<TaskSummary> tasks = taskService.getProjectTasks(filterRequest, page, size, user);

        return ResponseEntity.ok(ApiResponse.success("Project tasks retrieved successfully", tasks));
    }

    @GetMapping("/assigned")
    public ResponseEntity<ApiResponse<Page<TaskSummary>>> getAssignedTasks(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) TaskStatus status,
            @RequestParam(required = false) Priority priority,
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) Boolean isOverdue,
            @RequestParam(required = false) String search,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();

        TaskFilterRequest filterRequest = TaskFilterRequest.builder()
                .status(status)
                .priority(priority)
                .projectId(projectId)
                .isOverdue(isOverdue)
                .search(search)
                .assigneeId(user.getId())
                .build();

        Page<TaskSummary> tasks = taskService.getAssignedTasks(filterRequest, page, size, user);

        return ResponseEntity.ok(ApiResponse.success("Assigned tasks retrieved successfully", tasks));
    }

    @GetMapping("/created")
    public ResponseEntity<ApiResponse<Page<TaskSummary>>> getCreatedTasks(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) TaskStatus status,
            @RequestParam(required = false) Priority priority,
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) String search,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();

        TaskFilterRequest filterRequest = TaskFilterRequest.builder()
                .status(status)
                .priority(priority)
                .projectId(projectId)
                .search(search)
                .build();

        Page<TaskSummary> tasks = taskService.getCreatedTasks(filterRequest, page, size, user);

        return ResponseEntity.ok(ApiResponse.success("Created tasks retrieved successfully", tasks));
    }

    @PostMapping("/{id}/assign")
    public ResponseEntity<ApiResponse<TaskResponse>> assignTask(
            @PathVariable Long id,
            @RequestParam Long assigneeId,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        TaskResponse task = taskService.assignTask(id, assigneeId, user);

        return ResponseEntity.ok(ApiResponse.success("Task assigned successfully", task));
    }

    @PostMapping("/{id}/unassign")
    public ResponseEntity<ApiResponse<TaskResponse>> unassignTask(
            @PathVariable Long id,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        TaskResponse task = taskService.unassignTask(id, user);

        return ResponseEntity.ok(ApiResponse.success("Task unassigned successfully", task));
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<ApiResponse<TaskResponse>> completeTask(
            @PathVariable Long id,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        TaskResponse task = taskService.completeTask(id, user);

        return ResponseEntity.ok(ApiResponse.success("Task completed successfully", task));
    }

    @PostMapping("/{id}/reopen")
    public ResponseEntity<ApiResponse<TaskResponse>> reopenTask(
            @PathVariable Long id,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        TaskResponse task = taskService.reopenTask(id, user);

        return ResponseEntity.ok(ApiResponse.success("Task reopened successfully", task));
    }

    @PostMapping("/{id}/dependencies")
    public ResponseEntity<ApiResponse<TaskResponse>> addDependency(
            @PathVariable Long id,
            @Valid @RequestBody TaskDependencyRequest request,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        TaskResponse task = taskService.addDependency(id, request.getDependencyTaskId(), user);

        return ResponseEntity.ok(ApiResponse.success("Dependency added successfully", task));
    }

    @DeleteMapping("/{id}/dependencies/{dependencyId}")
    public ResponseEntity<ApiResponse<TaskResponse>> removeDependency(
            @PathVariable Long id,
            @PathVariable Long dependencyId,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        TaskResponse task = taskService.removeDependency(id, dependencyId, user);

        return ResponseEntity.ok(ApiResponse.success("Dependency removed successfully", task));
    }

    @PostMapping("/{id}/time")
    public ResponseEntity<ApiResponse<TaskResponse>> trackTime(
            @PathVariable Long id,
            @Valid @RequestBody TaskTimeTrackingRequest request,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        TaskResponse task = taskService.trackTime(id, request, user);

        return ResponseEntity.ok(ApiResponse.success("Time tracked successfully", task));
    }

    @PostMapping("/bulk-update")
    public ResponseEntity<ApiResponse<List<TaskSummary>>> bulkUpdateTasks(
            @Valid @RequestBody BulkTaskUpdateRequest request,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        List<TaskSummary> tasks = taskService.bulkUpdateTasks(request, user);

        return ResponseEntity.ok(ApiResponse.success("Tasks updated successfully", tasks));
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<TaskStatsResponse>> getTaskStats(
            @RequestParam(required = false) Long projectId,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        TaskStatsResponse stats = taskService.getTaskStats(projectId, user);

        return ResponseEntity.ok(ApiResponse.success("Task statistics retrieved successfully", stats));
    }

    @GetMapping("/overdue")
    public ResponseEntity<ApiResponse<Page<TaskSummary>>> getOverdueTasks(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Long projectId,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();

        TaskFilterRequest filterRequest = TaskFilterRequest.builder()
                .isOverdue(true)
                .projectId(projectId)
                .build();

        Page<TaskSummary> tasks = taskService.getOverdueTasks(filterRequest, page, size, user);

        return ResponseEntity.ok(ApiResponse.success("Overdue tasks retrieved successfully", tasks));
    }

    @GetMapping("/due-soon")
    public ResponseEntity<ApiResponse<Page<TaskSummary>>> getTasksDueSoon(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "7") int days,
            @RequestParam(required = false) Long projectId,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        Page<TaskSummary> tasks = taskService.getTasksDueSoon(page, size, days, projectId, user);

        return ResponseEntity.ok(ApiResponse.success("Tasks due soon retrieved successfully", tasks));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<Page<TaskSummary>>> searchTasks(
            @RequestParam String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Long projectId,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();

        TaskFilterRequest filterRequest = TaskFilterRequest.builder()
                .search(query)
                .projectId(projectId)
                .build();

        Page<TaskSummary> tasks = taskService.searchTasks(filterRequest, page, size, user);

        return ResponseEntity.ok(ApiResponse.success("Task search completed successfully", tasks));
    }

    @GetMapping("/{id}/subtasks")
    public ResponseEntity<ApiResponse<List<TaskSummary>>> getSubtasks(
            @PathVariable Long id,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        List<TaskSummary> subtasks = taskService.getSubtasks(id, user);

        return ResponseEntity.ok(ApiResponse.success("Subtasks retrieved successfully", subtasks));
    }

    @PostMapping("/{parentId}/subtasks")
    public ResponseEntity<ApiResponse<TaskResponse>> createSubtask(
            @PathVariable Long parentId,
            @Valid @RequestBody CreateTaskRequest request,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        TaskResponse subtask = taskService.createSubtask(parentId, request, user);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Subtask created successfully", subtask));
    }

    @PostMapping("/{id}/archive")
    public ResponseEntity<ApiResponse<TaskResponse>> archiveTask(
            @PathVariable Long id,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        TaskResponse task = taskService.archiveTask(id, user);

        return ResponseEntity.ok(ApiResponse.success("Task archived successfully", task));
    }

    @PostMapping("/{id}/restore")
    public ResponseEntity<ApiResponse<TaskResponse>> restoreTask(
            @PathVariable Long id,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        TaskResponse task = taskService.restoreTask(id, user);

        return ResponseEntity.ok(ApiResponse.success("Task restored successfully", task));
    }
}