package com.devflow.backend.service;

import com.devflow.backend.dto.task.TaskDTOs.*;
import com.devflow.backend.entity.*;
import com.devflow.backend.exception.AuthException;
import com.devflow.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class TaskService {

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final UserRepository userRepository;
    private final ActivityRepository activityRepository;

    public TaskResponse createTask(Long projectId, CreateTaskRequest request, User creator) {
        Project project = findProjectWithAccess(projectId, creator);

        if (!canUserCreateTasks(creator, project)) {
            throw new AuthException("You don't have permission to create tasks in this project");
        }

        Task task = Task.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .priority(request.getPriority() != null ? request.getPriority() : Priority.MEDIUM)
                .project(project)
                .creator(creator)
                .dueDate(request.getDueDate())
                .storyPoints(request.getStoryPoints())
                .tags(request.getTags())
                .status(TaskStatus.TODO)
                .build();

        if (request.getAssigneeId() != null) {
            User assignee = findUserWithProjectAccess(request.getAssigneeId(), project);
            task.setAssignee(assignee);
        }

        if (request.getParentTaskId() != null) {
            Task parentTask = findTaskWithAccess(request.getParentTaskId(), creator);
            if (!parentTask.getProject().getId().equals(projectId)) {
                throw new AuthException("Parent task must be in the same project");
            }
            task.setParentTask(parentTask);
        }

        task = taskRepository.save(task);

        if (request.getDependencyIds() != null && !request.getDependencyIds().isEmpty()) {
            addTaskDependencies(task, request.getDependencyIds(), creator);
        }

        Activity activity = Activity.taskCreated(creator, task);
        activityRepository.save(activity);

        if (task.getAssignee() != null && !task.getAssignee().equals(creator)) {
            Activity assignActivity = Activity.taskAssigned(creator, task, task.getAssignee());
            activityRepository.save(assignActivity);
        }

        log.info("Task created: {} by user: {} in project: {}",
                task.getTitle(), creator.getUsername(), project.getName());

        return mapToTaskResponse(task);
    }

    @Transactional(readOnly = true)
    public TaskResponse getTaskById(Long taskId, User user) {
        Task task = findTaskWithAccess(taskId, user);
        return mapToTaskResponse(task);
    }

    public TaskResponse updateTask(Long taskId, UpdateTaskRequest request, User user) {
        Task task = findTaskWithAccess(taskId, user);

        if (!canUserEditTasks(user, task.getProject())) {
            throw new AuthException("You don't have permission to update this task");
        }

        boolean statusChanged = false;
        TaskStatus oldStatus = task.getStatus();

        if (request.getTitle() != null) {
            task.setTitle(request.getTitle());
        }
        if (request.getDescription() != null) {
            task.setDescription(request.getDescription());
        }
        if (request.getStatus() != null && !request.getStatus().equals(oldStatus)) {
            task.setStatus(request.getStatus());
            statusChanged = true;

            if (request.getStatus() == TaskStatus.DONE) {
                task.setCompletedDate(LocalDateTime.now());
                task.setProgress(100);
            } else if (oldStatus == TaskStatus.DONE) {
                task.setCompletedDate(null);
            }
        }
        if (request.getPriority() != null) {
            task.setPriority(request.getPriority());
        }
        if (request.getDueDate() != null) {
            task.setDueDate(request.getDueDate());
        }
        if (request.getStoryPoints() != null) {
            task.setStoryPoints(request.getStoryPoints());
        }
        if (request.getTags() != null) {
            task.setTags(request.getTags());
        }
        if (request.getProgress() != null) {
            task.setProgress(request.getProgress());
        }

        if (request.getAssigneeId() != null) {
            User newAssignee = findUserWithProjectAccess(request.getAssigneeId(), task.getProject());
            User oldAssignee = task.getAssignee();

            if (!newAssignee.equals(oldAssignee)) {
                task.setAssignee(newAssignee);

                Activity assignActivity = Activity.taskAssigned(user, task, newAssignee);
                activityRepository.save(assignActivity);
            }
        }

        if (request.getDependencyIds() != null) {
            task.getDependencies().clear();
            addTaskDependencies(task, request.getDependencyIds(), user);
        }

        task = taskRepository.save(task);

        if (statusChanged && task.getStatus() == TaskStatus.DONE) {
            Activity activity = Activity.taskCompleted(user, task);
            activityRepository.save(activity);
        }

        if (task.getParentTask() != null) {
            updateParentTaskProgress(task.getParentTask());
        }

        log.info("Task updated: {} by user: {}", task.getTitle(), user.getUsername());

        return mapToTaskResponse(task);
    }

    public void deleteTask(Long taskId, User user) {
        Task task = findTaskWithAccess(taskId, user);

        if (!canUserDeleteTasks(user, task.getProject())) {
            throw new AuthException("You don't have permission to delete this task");
        }

        task.setIsArchived(true);
        taskRepository.save(task);

        log.info("Task deleted: {} by user: {}", task.getTitle(), user.getUsername());
    }

    @Transactional(readOnly = true)
    public Page<TaskSummary> getProjectTasks(TaskFilterRequest filterRequest, int page, int size, User user) {
        Project project = findProjectWithAccess(filterRequest.getProjectId(), user);

        Pageable pageable = PageRequest.of(page, size, Sort.by(
                Sort.Order.desc("priority"),
                Sort.Order.asc("dueDate"),
                Sort.Order.desc("createdAt")
        ));

        Specification<Task> spec = buildTaskSpecification(filterRequest, user);
        Page<Task> tasksPage = taskRepository.findAll(spec, pageable);

        return tasksPage.map(this::mapToTaskSummary);
    }

    @Transactional(readOnly = true)
    public Page<TaskSummary> getAssignedTasks(TaskFilterRequest filterRequest, int page, int size, User user) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(
                Sort.Order.asc("dueDate"),
                Sort.Order.desc("priority"),
                Sort.Order.desc("createdAt")
        ));

        Specification<Task> spec = buildTaskSpecification(filterRequest, user);
        Page<Task> tasksPage = taskRepository.findAll(spec, pageable);

        return tasksPage.map(this::mapToTaskSummary);
    }

    @Transactional(readOnly = true)
    public Page<TaskSummary> getCreatedTasks(TaskFilterRequest filterRequest, int page, int size, User user) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(
                Sort.Order.desc("createdAt")
        ));

        Specification<Task> spec = buildTaskSpecification(filterRequest, user)
                .and((root, query, cb) -> cb.equal(root.get("creator"), user));

        Page<Task> tasksPage = taskRepository.findAll(spec, pageable);

        return tasksPage.map(this::mapToTaskSummary);
    }

    public TaskResponse assignTask(Long taskId, Long assigneeId, User user) {
        Task task = findTaskWithAccess(taskId, user);
        User assignee = findUserWithProjectAccess(assigneeId, task.getProject());

        if (!canUserEditTasks(user, task.getProject())) {
            throw new AuthException("You don't have permission to assign this task");
        }

        task.setAssignee(assignee);
        task = taskRepository.save(task);

        Activity activity = Activity.taskAssigned(user, task, assignee);
        activityRepository.save(activity);

        log.info("Task assigned: {} to user: {} by: {}",
                task.getTitle(), assignee.getUsername(), user.getUsername());

        return mapToTaskResponse(task);
    }

    public TaskResponse unassignTask(Long taskId, User user) {
        Task task = findTaskWithAccess(taskId, user);

        if (!canUserEditTasks(user, task.getProject()) && !task.getAssignee().equals(user)) {
            throw new AuthException("You don't have permission to unassign this task");
        }

        task.setAssignee(null);
        task = taskRepository.save(task);

        log.info("Task unassigned: {} by user: {}", task.getTitle(), user.getUsername());

        return mapToTaskResponse(task);
    }

    public TaskResponse completeTask(Long taskId, User user) {
        Task task = findTaskWithAccess(taskId, user);

        if (!canUserEditTasks(user, task.getProject()) && !task.getAssignee().equals(user)) {
            throw new AuthException("You don't have permission to complete this task");
        }

        task.completeTask();
        task = taskRepository.save(task);

        Activity activity = Activity.taskCompleted(user, task);
        activityRepository.save(activity);

        if (task.getParentTask() != null) {
            updateParentTaskProgress(task.getParentTask());
        }

        log.info("Task completed: {} by user: {}", task.getTitle(), user.getUsername());

        return mapToTaskResponse(task);
    }

    public TaskResponse reopenTask(Long taskId, User user) {
        Task task = findTaskWithAccess(taskId, user);

        if (!canUserEditTasks(user, task.getProject())) {
            throw new AuthException("You don't have permission to reopen this task");
        }

        task.setStatus(TaskStatus.TODO);
        task.setCompletedDate(null);
        if (task.getProgress() == 100) {
            task.setProgress(0);
        }
        task = taskRepository.save(task);

        if (task.getParentTask() != null) {
            updateParentTaskProgress(task.getParentTask());
        }

        log.info("Task reopened: {} by user: {}", task.getTitle(), user.getUsername());

        return mapToTaskResponse(task);
    }

    public TaskResponse addDependency(Long taskId, Long dependencyTaskId, User user) {
        Task task = findTaskWithAccess(taskId, user);
        Task dependencyTask = findTaskWithAccess(dependencyTaskId, user);

        if (!canUserEditTasks(user, task.getProject())) {
            throw new AuthException("You don't have permission to modify task dependencies");
        }

        if (!task.getProject().getId().equals(dependencyTask.getProject().getId())) {
            throw new AuthException("Dependencies must be within the same project");
        }

        if (task.getId().equals(dependencyTask.getId())) {
            throw new AuthException("Task cannot depend on itself");
        }

        if (wouldCreateCircularDependency(task, dependencyTask)) {
            throw new AuthException("This dependency would create a circular reference");
        }

        task.addDependency(dependencyTask);
        task = taskRepository.save(task);

        log.info("Dependency added: {} depends on {} by user: {}",
                task.getTitle(), dependencyTask.getTitle(), user.getUsername());

        return mapToTaskResponse(task);
    }

    public TaskResponse removeDependency(Long taskId, Long dependencyTaskId, User user) {
        Task task = findTaskWithAccess(taskId, user);
        Task dependencyTask = findTaskWithAccess(dependencyTaskId, user);

        if (!canUserEditTasks(user, task.getProject())) {
            throw new AuthException("You don't have permission to modify task dependencies");
        }

        task.removeDependency(dependencyTask);
        task = taskRepository.save(task);

        log.info("Dependency removed: {} no longer depends on {} by user: {}",
                task.getTitle(), dependencyTask.getTitle(), user.getUsername());

        return mapToTaskResponse(task);
    }

    public List<TaskSummary> bulkUpdateTasks(BulkTaskUpdateRequest request, User user) {
        List<Task> tasks = taskRepository.findAllById(request.getTaskIds());

        for (Task task : tasks) {
            if (!taskRepository.hasUserAccessToTask(user, task.getId())) {
                throw new AuthException("You don't have access to task: " + task.getTitle());
            }

            if (!canUserEditTasks(user, task.getProject())) {
                throw new AuthException("You don't have permission to edit task: " + task.getTitle());
            }

            boolean updated = false;

            if (request.getStatus() != null && !request.getStatus().equals(task.getStatus())) {
                task.setStatus(request.getStatus());
                if (request.getStatus() == TaskStatus.DONE) {
                    task.completeTask();
                }
                updated = true;
            }

            if (request.getPriority() != null && !request.getPriority().equals(task.getPriority())) {
                task.setPriority(request.getPriority());
                updated = true;
            }

            if (request.getAssigneeId() != null) {
                User assignee = findUserWithProjectAccess(request.getAssigneeId(), task.getProject());
                if (!assignee.equals(task.getAssignee())) {
                    task.setAssignee(assignee);
                    updated = true;
                }
            }

            if (request.getTags() != null && !request.getTags().equals(task.getTags())) {
                task.setTags(request.getTags());
                updated = true;
            }

            if (updated) {
                taskRepository.save(task);
            }
        }

        log.info("Bulk update performed on {} tasks by user: {}",
                request.getTaskIds().size(), user.getUsername());

        return tasks.stream().map(this::mapToTaskSummary).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TaskStatsResponse getTaskStats(Long projectId, User user) {
        List<Task> tasks;

        if (projectId != null) {
            Project project = findProjectWithAccess(projectId, user);
            tasks = taskRepository.findByProjectAndIsArchivedFalseOrderByCreatedAtDesc(project, Pageable.unpaged()).getContent();
        } else {
            List<Project> userProjects = projectRepository.findProjectsByUserMembership(user, Pageable.unpaged()).getContent();
            tasks = userProjects.stream()
                    .flatMap(p -> p.getTasks().stream())
                    .filter(t -> !t.getIsArchived())
                    .collect(Collectors.toList());
        }

        long totalTasks = tasks.size();
        long todoTasks = tasks.stream().filter(t -> t.getStatus() == TaskStatus.TODO).count();
        long inProgressTasks = tasks.stream().filter(t -> t.getStatus() == TaskStatus.IN_PROGRESS).count();
        long reviewTasks = tasks.stream().filter(t -> t.getStatus() == TaskStatus.REVIEW).count();
        long completedTasks = tasks.stream().filter(t -> t.getStatus() == TaskStatus.DONE).count();
        long overdueTasks = tasks.stream().filter(Task::isOverdue).count();
        long blockedTasks = tasks.stream().filter(Task::isBlocked).count();

        double averageProgress = tasks.stream()
                .mapToInt(Task::getProgress)
                .average()
                .orElse(0.0);

        return TaskStatsResponse.builder()
                .totalTasks(totalTasks)
                .todoTasks(todoTasks)
                .inProgressTasks(inProgressTasks)
                .reviewTasks(reviewTasks)
                .completedTasks(completedTasks)
                .overdueTasks(overdueTasks)
                .blockedTasks(blockedTasks)
                .averageProgress(averageProgress)
                .build();
    }

    @Transactional(readOnly = true)
    public Page<TaskSummary> getOverdueTasks(TaskFilterRequest filterRequest, int page, int size, User user) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(
                Sort.Order.asc("dueDate"),
                Sort.Order.desc("priority")
        ));

        Specification<Task> spec = buildTaskSpecification(filterRequest, user);
        Page<Task> tasksPage = taskRepository.findAll(spec, pageable);

        return tasksPage.map(this::mapToTaskSummary);
    }

    @Transactional(readOnly = true)
    public Page<TaskSummary> getTasksDueSoon(int page, int size, int days, Long projectId, User user) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime deadline = now.plusDays(days);

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Order.asc("dueDate")));

        List<Task> tasks;
        if (projectId != null) {
            Project project = findProjectWithAccess(projectId, user);
            tasks = taskRepository.findUserTasksDueSoon(user, now, deadline);
        } else {
            tasks = taskRepository.findTasksDueSoon(now, deadline);
        }

        List<Task> accessibleTasks = tasks.stream()
                .filter(task -> taskRepository.hasUserAccessToTask(user, task.getId()))
                .collect(Collectors.toList());

        int start = page * size;
        int end = Math.min(start + size, accessibleTasks.size());
        List<Task> pageContent = accessibleTasks.subList(start, end);

        return new org.springframework.data.domain.PageImpl<>(
                pageContent.stream().map(this::mapToTaskSummary).collect(Collectors.toList()),
                pageable,
                accessibleTasks.size()
        );
    }

    @Transactional(readOnly = true)
    public Page<TaskSummary> searchTasks(TaskFilterRequest filterRequest, int page, int size, User user) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(
                Sort.Order.desc("updatedAt")
        ));

        Specification<Task> spec = buildTaskSpecification(filterRequest, user);
        Page<Task> tasksPage = taskRepository.findAll(spec, pageable);

        return tasksPage.map(this::mapToTaskSummary);
    }

    @Transactional(readOnly = true)
    public List<TaskSummary> getSubtasks(Long taskId, User user) {
        Task parentTask = findTaskWithAccess(taskId, user);
        List<Task> subtasks = taskRepository.findByParentTaskAndIsArchivedFalseOrderByCreatedAtAsc(parentTask);

        return subtasks.stream()
                .map(this::mapToTaskSummary)
                .collect(Collectors.toList());
    }

    public TaskResponse createSubtask(Long parentTaskId, CreateTaskRequest request, User creator) {
        Task parentTask = findTaskWithAccess(parentTaskId, creator);

        if (!canUserCreateTasks(creator, parentTask.getProject())) {
            throw new AuthException("You don't have permission to create subtasks in this project");
        }

        CreateTaskRequest subtaskRequest = CreateTaskRequest.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .priority(request.getPriority())
                .assigneeId(request.getAssigneeId())
                .dueDate(request.getDueDate())
                .storyPoints(request.getStoryPoints())
                .tags(request.getTags())
                .parentTaskId(parentTaskId)
                .dependencyIds(request.getDependencyIds())
                .build();

        return createTask(parentTask.getProject().getId(), subtaskRequest, creator);
    }

    public TaskResponse archiveTask(Long taskId, User user) {
        Task task = findTaskWithAccess(taskId, user);

        if (!canUserDeleteTasks(user, task.getProject())) {
            throw new AuthException("You don't have permission to archive this task");
        }

        task.setIsArchived(true);
        task = taskRepository.save(task);

        log.info("Task archived: {} by user: {}", task.getTitle(), user.getUsername());

        return mapToTaskResponse(task);
    }

    public TaskResponse restoreTask(Long taskId, User user) {
        Task task = findTaskWithAccess(taskId, user);

        if (!canUserDeleteTasks(user, task.getProject())) {
            throw new AuthException("You don't have permission to restore this task");
        }

        task.setIsArchived(false);
        task = taskRepository.save(task);

        log.info("Task restored: {} by user: {}", task.getTitle(), user.getUsername());

        return mapToTaskResponse(task);
    }


    private Project findProjectWithAccess(Long projectId, User user) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new AuthException("Project not found"));

        if (!projectRepository.hasUserAccessToProject(user, projectId)) {
            throw new AuthException("You don't have access to this project");
        }

        return project;
    }

    private Task findTaskWithAccess(Long taskId, User user) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new AuthException("Task not found"));

        if (!taskRepository.hasUserAccessToTask(user, taskId)) {
            throw new AuthException("You don't have access to this task");
        }

        return task;
    }

    private User findUserWithProjectAccess(Long userId, Project project) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AuthException("User not found"));

        if (!projectRepository.hasUserAccessToProject(user, project.getId())) {
            throw new AuthException("User doesn't have access to this project");
        }

        return user;
    }

    private boolean canUserCreateTasks(User user, Project project) {
        if (project.getOwner().equals(user)) {
            return true;
        }

        return projectMemberRepository.findByProjectAndUser(project, user)
                .map(ProjectMember::canCreateTasks)
                .orElse(false);
    }

    private boolean canUserEditTasks(User user, Project project) {
        if (project.getOwner().equals(user)) {
            return true;
        }

        return projectMemberRepository.findByProjectAndUser(project, user)
                .map(ProjectMember::canEditTasks)
                .orElse(false);
    }

    private boolean canUserDeleteTasks(User user, Project project) {
        if (project.getOwner().equals(user)) {
            return true;
        }

        return projectMemberRepository.findByProjectAndUser(project, user)
                .map(ProjectMember::canDeleteTasks)
                .orElse(false);
    }

    private void addTaskDependencies(Task task, List<Long> dependencyIds, User user) {
        for (Long dependencyId : dependencyIds) {
            Task dependencyTask = findTaskWithAccess(dependencyId, user);

            if (!task.getProject().getId().equals(dependencyTask.getProject().getId())) {
                throw new AuthException("Dependencies must be within the same project");
            }

            if (!task.getId().equals(dependencyTask.getId()) &&
                    !wouldCreateCircularDependency(task, dependencyTask)) {
                task.addDependency(dependencyTask);
            }
        }
    }

    private boolean wouldCreateCircularDependency(Task task, Task potentialDependency) {
        return checkCircularDependency(potentialDependency, task.getId());
    }

    private boolean checkCircularDependency(Task current, Long targetTaskId) {
        if (current.getId().equals(targetTaskId)) {
            return true;
        }

        for (Task dependency : current.getDependencies()) {
            if (checkCircularDependency(dependency, targetTaskId)) {
                return true;
            }
        }

        return false;
    }

    private void updateParentTaskProgress(Task parentTask) {
        parentTask.updateProgressFromSubtasks();
        taskRepository.save(parentTask);
    }

    private Specification<Task> buildTaskSpecification(TaskFilterRequest filterRequest, User user) {
        return (root, query, cb) -> {
            var predicates = new java.util.ArrayList<jakarta.persistence.criteria.Predicate>();

            predicates.add(cb.equal(root.get("isArchived"), false));

            if (filterRequest.getProjectId() != null) {
                predicates.add(cb.equal(root.get("project").get("id"), filterRequest.getProjectId()));
            }

            if (filterRequest.getStatus() != null) {
                predicates.add(cb.equal(root.get("status"), filterRequest.getStatus()));
            }

            if (filterRequest.getPriority() != null) {
                predicates.add(cb.equal(root.get("priority"), filterRequest.getPriority()));
            }

            if (filterRequest.getAssigneeId() != null) {
                predicates.add(cb.equal(root.get("assignee").get("id"), filterRequest.getAssigneeId()));
            }

            if (filterRequest.getIsOverdue() != null && filterRequest.getIsOverdue()) {
                predicates.add(cb.and(
                        cb.isNotNull(root.get("dueDate")),
                        cb.lessThan(root.get("dueDate"), LocalDateTime.now()),
                        cb.notEqual(root.get("status"), TaskStatus.DONE),
                        cb.notEqual(root.get("status"), TaskStatus.CANCELLED)
                ));
            }

            if (filterRequest.getIsBlocked() != null && filterRequest.getIsBlocked()) {
                var dependencyJoin = root.join("dependencies", jakarta.persistence.criteria.JoinType.INNER);
                predicates.add(cb.notEqual(dependencyJoin.get("status"), TaskStatus.DONE));
            }

            if (filterRequest.getTags() != null && !filterRequest.getTags().trim().isEmpty()) {
                predicates.add(cb.like(
                        cb.lower(root.get("tags")),
                        "%" + filterRequest.getTags().toLowerCase() + "%"
                ));
            }

            if (filterRequest.getDueDateFrom() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("dueDate"), filterRequest.getDueDateFrom()));
            }

            if (filterRequest.getDueDateTo() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("dueDate"), filterRequest.getDueDateTo()));
            }

            if (filterRequest.getSearch() != null && !filterRequest.getSearch().trim().isEmpty()) {
                String searchTerm = "%" + filterRequest.getSearch().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("title")), searchTerm),
                        cb.like(cb.lower(root.get("description")), searchTerm)
                ));
            }

            var userProjectsSubquery = query.subquery(Long.class);
            var projectRoot = userProjectsSubquery.from(Project.class);
            var memberJoin = projectRoot.join("members", jakarta.persistence.criteria.JoinType.LEFT);
            userProjectsSubquery.select(projectRoot.get("id"))
                    .where(cb.or(
                            cb.equal(projectRoot.get("owner"), user),
                            cb.equal(memberJoin.get("user"), user)
                    ));
            predicates.add(root.get("project").get("id").in(userProjectsSubquery));

            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
    }

    private TaskResponse mapToTaskResponse(Task task) {
        return mapToTaskResponse(task, false);
    }

    private TaskResponse mapToTaskResponse(Task task, boolean skipRelations) {
        var builder = TaskResponse.builder()
                .id(task.getId())
                .title(task.getTitle())
                .description(task.getDescription())
                .status(task.getStatus())
                .priority(task.getPriority())
                .dueDate(task.getDueDate())
                .completedDate(task.getCompletedDate())
                .tags(task.getTags())
                .storyPoints(task.getStoryPoints())
                .progress(task.getProgress())
                .isArchived(task.getIsArchived())
                .isOverdue(task.isOverdue())
                .isBlocked(task.isBlocked())
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .creator(mapToUserSummary(task.getCreator()))
                .assignee(task.getAssignee() != null ? mapToUserSummary(task.getAssignee()) : null)
                .project(mapToProjectSummary(task.getProject()))
                .commentsCount(task.getComments().size())
                .tagList(task.getTagList());

        if (!skipRelations) {
            builder.subtasks(task.getSubtasks().stream()
                    .filter(subtask -> !subtask.getIsArchived())
                    .map(subtask -> mapToTaskResponse(subtask, true))
                    .collect(Collectors.toList()));

            if (task.getParentTask() != null) {
                builder.parentTask(mapToTaskResponse(task.getParentTask(), true));
            }

            builder.dependencies(task.getDependencies().stream()
                    .map(dep -> mapToTaskResponse(dep, true))
                    .collect(Collectors.toList()));

            builder.dependentTasks(task.getDependentTasks().stream()
                    .map(dep -> mapToTaskResponse(dep, true))
                    .collect(Collectors.toList()));
        }

        return builder.build();
    }

    private TaskSummary mapToTaskSummary(Task task) {
        return TaskSummary.builder()
                .id(task.getId())
                .title(task.getTitle())
                .description(task.getDescription())
                .status(task.getStatus())
                .priority(task.getPriority())
                .dueDate(task.getDueDate())
                .progress(task.getProgress())
                .isOverdue(task.isOverdue())
                .isBlocked(task.isBlocked())
                .updatedAt(task.getUpdatedAt())
                .assignee(task.getAssignee() != null ? mapToUserSummary(task.getAssignee()) : null)
                .project(mapToProjectSummary(task.getProject()))
                .tagList(task.getTagList())
                .build();
    }

    private UserSummary mapToUserSummary(User user) {
        return UserSummary.builder()
                .id(user.getId())
                .username(user.getUsername())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .avatar(user.getAvatar())
                .jobTitle(user.getJobTitle())
                .build();
    }

    private ProjectSummary mapToProjectSummary(Project project) {
        return ProjectSummary.builder()
                .id(project.getId())
                .name(project.getName())
                .color(project.getColor())
                .build();
    }
}