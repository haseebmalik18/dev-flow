package com.devflow.backend.service;

import com.devflow.backend.dto.project.ProjectDTOs.*;
import com.devflow.backend.entity.*;
import com.devflow.backend.exception.AuthException;
import com.devflow.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final ActivityRepository activityRepository;
    private final ActivityService activityService;

    public ProjectResponse createProject(CreateProjectRequest request, User owner) {
        Project project = Project.builder()
                .name(request.getName())
                .description(request.getDescription())
                .priority(request.getPriority() != null ? request.getPriority() : Priority.MEDIUM)
                .startDate(request.getStartDate() != null ?
                        request.getStartDate().atStartOfDay() : null)
                .dueDate(request.getDueDate() != null ?
                        request.getDueDate().atTime(23, 59, 59) : null)
                .color(request.getColor() != null ? request.getColor() : "#3B82F6")
                .budget(request.getBudget())
                .owner(owner)
                .status(ProjectStatus.PLANNING)
                .build();

        project = projectRepository.save(project);

        ProjectMember ownerMember = ProjectMember.builder()
                .project(project)
                .user(owner)
                .role(ProjectRole.OWNER)
                .build();
        projectMemberRepository.save(ownerMember);

        activityService.createProjectCreatedActivity(owner, project);


        log.info("Project created: {} by user: {}", project.getName(), owner.getUsername());
        return mapToProjectResponse(project);
    }

    @Transactional(readOnly = true)
    public Page<ProjectSummary> getUserProjects(User user, int page, int size, String search) {
        Pageable pageable = PageRequest.of(page, size);

        Page<Project> projects;
        if (search != null && !search.trim().isEmpty()) {
            projects = projectRepository.searchUserProjects(user, search.trim(), pageable);
        } else {
            projects = projectRepository.findProjectsByUserMembership(user, pageable);
        }

        return projects.map(this::mapToProjectSummary);
    }

    @Transactional(readOnly = true)
    public ProjectResponse getProjectById(Long projectId, User user) {
        Project project = findProjectWithAccess(projectId, user);
        return mapToProjectResponse(project);
    }

    public ProjectResponse updateProject(Long projectId, UpdateProjectRequest request, User user) {
        Project project = findProjectWithAccess(projectId, user);

        if (!canUserManageProject(user, project)) {
            throw new AuthException("You don't have permission to update this project");
        }


        Map<String, Object> changes = new HashMap<>();
        ProjectStatus oldStatus = project.getStatus();
        boolean statusChanged = false;


        if (request.getName() != null && !request.getName().equals(project.getName())) {
            changes.put("name", Map.of("old", project.getName(), "new", request.getName()));
            project.setName(request.getName());
        }

        if (request.getDescription() != null && !request.getDescription().equals(project.getDescription())) {
            changes.put("description", "updated");
            project.setDescription(request.getDescription());
        }

        if (request.getStatus() != null && !request.getStatus().equals(oldStatus)) {
            changes.put("status", Map.of("old", oldStatus.name(), "new", request.getStatus().name()));
            project.setStatus(request.getStatus());
            statusChanged = true;

            if (request.getStatus() == ProjectStatus.COMPLETED && oldStatus != ProjectStatus.COMPLETED) {
                project.setCompletedDate(LocalDateTime.now());
                project.setProgress(100);
            }
        }

        if (request.getPriority() != null && !request.getPriority().equals(project.getPriority())) {
            changes.put("priority", Map.of("old", project.getPriority().name(), "new", request.getPriority().name()));
            project.setPriority(request.getPriority());
        }

        if (request.getStartDate() != null) {
            project.setStartDate(request.getStartDate().atStartOfDay());
            changes.put("startDate", "updated");
        }
        if (request.getDueDate() != null) {
            project.setDueDate(request.getDueDate().atTime(23, 59, 59));
            changes.put("dueDate", "updated");
        }
        if (request.getColor() != null && !request.getColor().equals(project.getColor())) {
            changes.put("color", Map.of("old", project.getColor(), "new", request.getColor()));
            project.setColor(request.getColor());
        }
        if (request.getBudget() != null) {
            project.setBudget(request.getBudget());
            changes.put("budget", "updated");
        }
        if (request.getSpent() != null) {
            project.setSpent(request.getSpent());
            changes.put("spent", "updated");
        }
        if (request.getProgress() != null && !request.getProgress().equals(project.getProgress())) {
            changes.put("progress", Map.of("old", project.getProgress(), "new", request.getProgress()));
            project.setProgress(request.getProgress());
        }

        project = projectRepository.save(project);


        if (!changes.isEmpty()) {

            activityService.createProjectUpdatedActivity(user, project, changes);


            if (statusChanged) {
                activityService.createProjectStatusChangedActivity(user, project, oldStatus, request.getStatus());
            }
        }



        log.info("Project updated: {} by user: {}", project.getName(), user.getUsername());
        return mapToProjectResponse(project);
    }

    public void archiveProject(Long projectId, User user) {
        Project project = findProjectWithAccess(projectId, user);

        if (!canUserManageProject(user, project)) {
            throw new AuthException("You don't have permission to archive this project");
        }

        project.setIsArchived(true);
        projectRepository.save(project);


        activityService.createProjectArchivedActivity(user, project);


        log.info("Project archived: {} by user: {}", project.getName(), user.getUsername());
    }

    public ProjectMemberResponse addMember(Long projectId, AddMemberRequest request, User inviter) {
        Project project = findProjectWithAccess(projectId, inviter);

        if (!canUserManageMembers(inviter, project)) {
            throw new AuthException("You don't have permission to add members to this project");
        }

        User newMember = userRepository.findByUsernameOrEmail(request.getUsernameOrEmail(), request.getUsernameOrEmail())
                .orElseThrow(() -> new AuthException("User not found"));

        if (projectMemberRepository.existsByProjectAndUser(project, newMember)) {
            throw new AuthException("User is already a member of this project");
        }

        ProjectMember projectMember = ProjectMember.builder()
                .project(project)
                .user(newMember)
                .role(request.getRole())
                .invitedBy(inviter)
                .build();

        projectMember = projectMemberRepository.save(projectMember);


        activityService.createMemberAddedActivity(inviter, newMember, project, request.getRole());


        log.info("Member added to project: {} - User: {} by: {}",
                project.getName(), newMember.getUsername(), inviter.getUsername());

        return mapToProjectMemberResponse(projectMember);
    }

    public void removeMember(Long projectId, Long memberId, User remover) {
        Project project = findProjectWithAccess(projectId, remover);

        ProjectMember member = projectMemberRepository.findById(memberId)
                .orElseThrow(() -> new AuthException("Project member not found"));

        if (!member.getProject().getId().equals(projectId)) {
            throw new AuthException("Member does not belong to this project");
        }

        if (member.getRole() == ProjectRole.OWNER) {
            throw new AuthException("Cannot remove project owner");
        }

        if (!canUserManageMembers(remover, project) && !member.getUser().equals(remover)) {
            throw new AuthException("You don't have permission to remove this member");
        }

        User removedUser = member.getUser();
        projectMemberRepository.delete(member);


        activityService.createMemberRemovedActivity(remover, removedUser, project);


        log.info("Member removed from project: {} - User: {} by: {}",
                project.getName(), removedUser.getUsername(), remover.getUsername());
    }

    @Transactional(readOnly = true)
    public List<ProjectMemberResponse> getProjectMembers(Long projectId, User user) {
        Project project = findProjectWithAccess(projectId, user);

        List<ProjectMember> members = projectMemberRepository.findByProjectOrderByJoinedAtAsc(project);
        return members.stream()
                .map(this::mapToProjectMemberResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ProjectStatsResponse getUserProjectStats(User user) {
        List<Project> userProjects = projectRepository.findProjectsByUserMembership(user, Pageable.unpaged()).getContent();

        long totalProjects = userProjects.size();
        long activeProjects = userProjects.stream()
                .filter(p -> p.getStatus() == ProjectStatus.ACTIVE)
                .count();
        long completedProjects = userProjects.stream()
                .filter(p -> p.getStatus() == ProjectStatus.COMPLETED)
                .count();

        double averageProgress = userProjects.stream()
                .mapToInt(Project::getProgress)
                .average()
                .orElse(0.0);

        List<Task> allTasks = userProjects.stream()
                .flatMap(p -> p.getTasks().stream())
                .filter(t -> !t.getIsArchived())
                .collect(Collectors.toList());

        long totalTasks = allTasks.size();
        long completedTasks = allTasks.stream()
                .filter(t -> t.getStatus() == TaskStatus.DONE)
                .count();
        long overdueTasks = allTasks.stream()
                .filter(Task::isOverdue)
                .count();

        int teamMembersCount = userProjects.stream()
                .mapToInt(Project::getTeamSize)
                .sum();

        return ProjectStatsResponse.builder()
                .totalProjects(totalProjects)
                .activeProjects(activeProjects)
                .completedProjects(completedProjects)
                .averageProgress(averageProgress)
                .totalTasks(totalTasks)
                .completedTasks(completedTasks)
                .overdueTasks(overdueTasks)
                .teamMembersCount(teamMembersCount)
                .build();
    }



    private Project findProjectWithAccess(Long projectId, User user) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new AuthException("Project not found"));

        if (!projectRepository.hasUserAccessToProject(user, projectId)) {
            throw new AuthException("You don't have access to this project");
        }

        return project;
    }

    private boolean canUserManageProject(User user, Project project) {
        if (project.getOwner().equals(user)) {
            return true;
        }

        return projectMemberRepository.findByProjectAndUser(project, user)
                .map(ProjectMember::canManageProject)
                .orElse(false);
    }

    private boolean canUserManageMembers(User user, Project project) {
        if (project.getOwner().equals(user)) {
            return true;
        }

        return projectMemberRepository.findByProjectAndUser(project, user)
                .map(ProjectMember::canManageMembers)
                .orElse(false);
    }

    private ProjectResponse mapToProjectResponse(Project project) {
        List<ProjectMember> members = projectMemberRepository.findByProjectOrderByJoinedAtAsc(project);

        return ProjectResponse.builder()
                .id(project.getId())
                .name(project.getName())
                .description(project.getDescription())
                .status(project.getStatus())
                .priority(project.getPriority())
                .startDate(project.getStartDate())
                .dueDate(project.getDueDate())
                .completedDate(project.getCompletedDate())
                .color(project.getColor())
                .progress(project.getProgress())
                .budget(project.getBudget())
                .spent(project.getSpent())
                .isArchived(project.getIsArchived())
                .createdAt(project.getCreatedAt())
                .updatedAt(project.getUpdatedAt())
                .owner(mapToUserSummary(project.getOwner()))
                .teamSize(members.size())
                .members(members.stream().map(this::mapToProjectMemberResponse).collect(Collectors.toList()))
                .totalTasks(project.getTasks().size())
                .completedTasks((int) project.getCompletedTasksCount())
                .overdueTasks((int) project.getTasks().stream().filter(Task::isOverdue).count())
                .healthStatus(project.getHealthStatus())
                .build();
    }

    private ProjectSummary mapToProjectSummary(Project project) {
        return ProjectSummary.builder()
                .id(project.getId())
                .name(project.getName())
                .description(project.getDescription())
                .status(project.getStatus())
                .priority(project.getPriority())
                .dueDate(project.getDueDate())
                .color(project.getColor())
                .progress(project.getProgress())
                .teamSize(project.getTeamSize())
                .totalTasks(project.getTotalTasksCount())
                .completedTasks((int) project.getCompletedTasksCount())
                .healthStatus(project.getHealthStatus())
                .updatedAt(project.getUpdatedAt())
                .build();
    }

    private ProjectMemberResponse mapToProjectMemberResponse(ProjectMember member) {
        return ProjectMemberResponse.builder()
                .id(member.getId())
                .user(mapToUserSummary(member.getUser()))
                .role(member.getRole())
                .joinedAt(member.getJoinedAt())
                .invitedBy(member.getInvitedBy() != null ? mapToUserSummary(member.getInvitedBy()) : null)
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
}