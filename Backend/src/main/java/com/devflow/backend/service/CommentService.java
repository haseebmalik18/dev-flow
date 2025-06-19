package com.devflow.backend.service;

import com.devflow.backend.dto.comment.CommentDTOs.*;
import com.devflow.backend.entity.*;
import com.devflow.backend.exception.AuthException;
import com.devflow.backend.repository.*;
import com.devflow.backend.service.ActivityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CommentService {

    private final CommentRepository commentRepository;
    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final ActivityRepository activityRepository;
    private final ActivityService activityService;

    public CommentResponse createComment(CreateCommentRequest request, User author) {
        Comment comment = Comment.builder()
                .content(request.getContent())
                .author(author)
                .build();


        if (request.getTaskId() != null) {
            Task task = taskRepository.findById(request.getTaskId())
                    .orElseThrow(() -> new AuthException("Task not found"));

            if (!taskRepository.hasUserAccessToTask(author, task.getId())) {
                throw new AuthException("You don't have access to this task");
            }

            comment.setTask(task);
        } else if (request.getProjectId() != null) {
            Project project = projectRepository.findById(request.getProjectId())
                    .orElseThrow(() -> new AuthException("Project not found"));

            if (!projectRepository.hasUserAccessToProject(author, project.getId())) {
                throw new AuthException("You don't have access to this project");
            }

            comment.setProject(project);
        } else {
            throw new AuthException("Comment must be associated with a task or project");
        }


        if (request.getParentCommentId() != null) {
            Comment parentComment = commentRepository.findById(request.getParentCommentId())
                    .orElseThrow(() -> new AuthException("Parent comment not found"));
            comment.setParentComment(parentComment);
        }


        if (request.getMentionedUserIds() != null && !request.getMentionedUserIds().isEmpty()) {
            List<User> mentionedUsers = userRepository.findAllById(request.getMentionedUserIds());
            comment.getMentionedUsers().addAll(mentionedUsers);
        }

        comment = commentRepository.save(comment);


        if (comment.getTask() != null) {
            activityService.createCommentAddedActivity(author, comment, comment.getTask());
        }


        if (!comment.getMentionedUsers().isEmpty()) {
            for (User mentionedUser : comment.getMentionedUsers()) {
                if (comment.getTask() != null) {
                    activityService.createCommentMentionedActivity(author, mentionedUser, comment, comment.getTask());
                }
            }
        }

        log.info("Comment created by user: {} on {}",
                author.getUsername(),
                comment.getTask() != null ? "task: " + comment.getTask().getTitle() : "project: " + comment.getProject().getName());

        return mapToCommentResponse(comment);
    }

    @Transactional(readOnly = true)
    public CommentResponse getCommentById(Long commentId, User user) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new AuthException("Comment not found"));

        if (!hasUserAccessToComment(user, comment)) {
            throw new AuthException("You don't have access to this comment");
        }

        return mapToCommentResponse(comment);
    }

    public CommentResponse updateComment(Long commentId, UpdateCommentRequest request, User user) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new AuthException("Comment not found"));

        if (!comment.getAuthor().equals(user)) {
            throw new AuthException("You can only edit your own comments");
        }

        comment.updateContent(request.getContent());


        if (request.getMentionedUserIds() != null) {
            comment.getMentionedUsers().clear();
            if (!request.getMentionedUserIds().isEmpty()) {
                List<User> mentionedUsers = userRepository.findAllById(request.getMentionedUserIds());
                comment.getMentionedUsers().addAll(mentionedUsers);
            }
        }

        comment = commentRepository.save(comment);

        log.info("Comment updated by user: {}", user.getUsername());

        return mapToCommentResponse(comment);
    }

    public void deleteComment(Long commentId, User user) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new AuthException("Comment not found"));

        if (!comment.getAuthor().equals(user)) {
            throw new AuthException("You can only delete your own comments");
        }

        commentRepository.delete(comment);

        log.info("Comment deleted by user: {}", user.getUsername());
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> getTaskComments(Long taskId, User user) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new AuthException("Task not found"));

        if (!taskRepository.hasUserAccessToTask(user, taskId)) {
            throw new AuthException("You don't have access to this task");
        }

        List<Comment> comments = commentRepository.findByTaskAndParentCommentIsNullOrderByCreatedAtAsc(task);
        return comments.stream()
                .map(this::mapToCommentResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> getProjectComments(Long projectId, User user) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new AuthException("Project not found"));

        if (!projectRepository.hasUserAccessToProject(user, projectId)) {
            throw new AuthException("You don't have access to this project");
        }

        List<Comment> comments = commentRepository.findByProjectOrderByCreatedAtDesc(project);
        return comments.stream()
                .map(this::mapToCommentResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<CommentSummary> getRecentComments(User user, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));


        Page<Project> userProjects = projectRepository.findProjectsByUserMembership(user, Pageable.unpaged());
        List<Project> projects = userProjects.getContent();

        if (projects.isEmpty()) {
            return Page.empty(pageable);
        }


        LocalDateTime since = LocalDateTime.now().minusDays(30);
        List<Comment> allComments = projects.stream()
                .flatMap(project -> commentRepository.findRecentCommentsByProject(project, since).stream())
                .sorted((c1, c2) -> c2.getCreatedAt().compareTo(c1.getCreatedAt()))
                .collect(Collectors.toList());


        int start = page * size;
        int end = Math.min(start + size, allComments.size());
        List<Comment> pageComments = allComments.subList(start, end);

        List<CommentSummary> commentSummaries = pageComments.stream()
                .map(this::mapToCommentSummary)
                .collect(Collectors.toList());

        return new PageImpl<>(commentSummaries, pageable, allComments.size());
    }

    @Transactional(readOnly = true)
    public Page<CommentSummary> searchComments(String query, Long projectId, User user, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        if (projectId != null) {
            Project project = projectRepository.findById(projectId)
                    .orElseThrow(() -> new AuthException("Project not found"));

            if (!projectRepository.hasUserAccessToProject(user, projectId)) {
                throw new AuthException("You don't have access to this project");
            }

            List<Comment> comments = commentRepository.searchCommentsByProject(project, query);
            List<CommentSummary> commentSummaries = comments.stream()
                    .map(this::mapToCommentSummary)
                    .collect(Collectors.toList());


            int start = page * size;
            int end = Math.min(start + size, commentSummaries.size());
            List<CommentSummary> pageComments = commentSummaries.subList(start, end);

            return new PageImpl<>(pageComments, pageable, commentSummaries.size());
        }

        return Page.empty(pageable);
    }

    @Transactional(readOnly = true)
    public Page<CommentSummary> getMentions(User user, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        List<Comment> comments = commentRepository.findCommentsMentioningUser(user);
        List<CommentSummary> commentSummaries = comments.stream()
                .map(this::mapToCommentSummary)
                .collect(Collectors.toList());


        int start = page * size;
        int end = Math.min(start + size, commentSummaries.size());
        List<CommentSummary> pageComments = commentSummaries.subList(start, end);

        return new PageImpl<>(pageComments, pageable, commentSummaries.size());
    }

    @Transactional(readOnly = true)
    public List<UserSummary> getMentionableUsers(String search, Long projectId, User user) {
        if (projectId != null) {
            Project project = projectRepository.findById(projectId)
                    .orElseThrow(() -> new AuthException("Project not found"));

            if (!projectRepository.hasUserAccessToProject(user, projectId)) {
                throw new AuthException("You don't have access to this project");
            }


            return project.getMembers().stream()
                    .map(ProjectMember::getUser)
                    .filter(u -> u.getFullName().toLowerCase().contains(search.toLowerCase()) ||
                            u.getUsername().toLowerCase().contains(search.toLowerCase()))
                    .map(this::mapToUserSummary)
                    .collect(Collectors.toList());
        }


        return List.of();
    }

    private boolean hasUserAccessToComment(User user, Comment comment) {
        if (comment.getTask() != null) {
            return taskRepository.hasUserAccessToTask(user, comment.getTask().getId());
        } else if (comment.getProject() != null) {
            return projectRepository.hasUserAccessToProject(user, comment.getProject().getId());
        }
        return false;
    }

    private CommentResponse mapToCommentResponse(Comment comment) {
        return CommentResponse.builder()
                .id(comment.getId())
                .content(comment.getContent())
                .isEdited(comment.getIsEdited())
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .author(mapToUserSummary(comment.getAuthor()))
                .task(comment.getTask() != null ? mapToTaskSummary(comment.getTask()) : null)
                .project(comment.getProject() != null ? mapToProjectSummary(comment.getProject()) : null)
                .parentComment(comment.getParentComment() != null ? mapToCommentSummary(comment.getParentComment()) : null)
                .replies(comment.getReplies().stream()
                        .map(this::mapToCommentResponse)
                        .collect(Collectors.toList()))
                .mentionedUsers(comment.getMentionedUsers().stream()
                        .map(this::mapToUserSummary)
                        .collect(Collectors.toList()))
                .build();
    }

    private CommentSummary mapToCommentSummary(Comment comment) {
        return CommentSummary.builder()
                .id(comment.getId())
                .content(comment.getContent())
                .isEdited(comment.getIsEdited())
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .author(mapToUserSummary(comment.getAuthor()))
                .task(comment.getTask() != null ? mapToTaskSummary(comment.getTask()) : null)
                .project(comment.getProject() != null ? mapToProjectSummary(comment.getProject()) : null)
                .repliesCount(comment.getReplies().size())
                .mentionedUsers(comment.getMentionedUsers().stream()
                        .map(this::mapToUserSummary)
                        .collect(Collectors.toList()))
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

    private TaskSummary mapToTaskSummary(Task task) {
        return TaskSummary.builder()
                .id(task.getId())
                .title(task.getTitle())
                .status(task.getStatus().name())
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