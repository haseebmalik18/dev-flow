package com.devflow.backend.repository;

import com.devflow.backend.entity.Project;
import com.devflow.backend.entity.Task;
import com.devflow.backend.entity.TaskStatus;
import com.devflow.backend.entity.Priority;
import com.devflow.backend.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long>, JpaSpecificationExecutor<Task> {

    Page<Task> findByProjectAndIsArchivedFalseOrderByCreatedAtDesc(Project project, Pageable pageable);

    Page<Task> findByAssigneeAndIsArchivedFalseOrderByDueDateAsc(User assignee, Pageable pageable);

    Page<Task> findByCreatorAndIsArchivedFalseOrderByCreatedAtDesc(User creator, Pageable pageable);

    List<Task> findByProjectAndStatusAndIsArchivedFalse(Project project, TaskStatus status);

    @Query("""
        SELECT t FROM Task t 
        WHERE t.dueDate < :now 
        AND t.status NOT IN ('DONE', 'CANCELLED') 
        AND t.isArchived = false
    """)
    List<Task> findOverdueTasks(@Param("now") LocalDateTime now);

    @Query("""
        SELECT t FROM Task t 
        WHERE t.assignee = :user 
        AND t.dueDate < :now 
        AND t.status NOT IN ('DONE', 'CANCELLED') 
        AND t.isArchived = false
        ORDER BY t.dueDate ASC
    """)
    List<Task> findOverdueTasksByUser(@Param("user") User user, @Param("now") LocalDateTime now);

    @Query("""
        SELECT t FROM Task t 
        WHERE t.dueDate BETWEEN :now AND :deadline 
        AND t.status NOT IN ('DONE', 'CANCELLED') 
        AND t.isArchived = false
        ORDER BY t.dueDate ASC
    """)
    List<Task> findTasksDueSoon(@Param("now") LocalDateTime now, @Param("deadline") LocalDateTime deadline);

    @Query("""
        SELECT t FROM Task t 
        JOIN t.project p 
        LEFT JOIN p.members pm 
        WHERE (p.owner = :user OR pm.user = :user OR t.assignee = :user) 
        AND t.isArchived = false 
        AND (LOWER(t.title) LIKE LOWER(CONCAT('%', :searchTerm, '%')) 
             OR LOWER(t.description) LIKE LOWER(CONCAT('%', :searchTerm, '%')))
        ORDER BY t.updatedAt DESC
    """)
    Page<Task> searchUserTasks(@Param("user") User user, @Param("searchTerm") String searchTerm, Pageable pageable);

    @Query("""
        SELECT t FROM Task t 
        WHERE t.project = :project 
        AND t.isArchived = false 
        AND (:status IS NULL OR t.status = :status)
        AND (:assignee IS NULL OR t.assignee = :assignee)
        AND (:priority IS NULL OR t.priority = :priority)
        ORDER BY 
            CASE WHEN t.priority = 'CRITICAL' THEN 1
                 WHEN t.priority = 'HIGH' THEN 2
                 WHEN t.priority = 'MEDIUM' THEN 3
                 ELSE 4 END,
            t.dueDate ASC NULLS LAST,
            t.createdAt DESC
    """)
    Page<Task> findTasksWithFilters(
            @Param("project") Project project,
            @Param("status") TaskStatus status,
            @Param("assignee") User assignee,
            @Param("priority") Priority priority,
            Pageable pageable
    );

    @Query("""
        SELECT new map(
            COUNT(t) as totalTasks,
            COUNT(CASE WHEN t.status = 'TODO' THEN 1 END) as todoTasks,
            COUNT(CASE WHEN t.status = 'IN_PROGRESS' THEN 1 END) as inProgressTasks,
            COUNT(CASE WHEN t.status = 'REVIEW' THEN 1 END) as reviewTasks,
            COUNT(CASE WHEN t.status = 'DONE' THEN 1 END) as completedTasks,
            COUNT(CASE WHEN t.dueDate < CURRENT_TIMESTAMP AND t.status NOT IN ('DONE', 'CANCELLED') THEN 1 END) as overdueTasks
        )
        FROM Task t 
        WHERE t.project = :project 
        AND t.isArchived = false
    """)
    Object getTaskStatsByProject(@Param("project") Project project);

    @Query("""
        SELECT new map(
            COUNT(t) as totalTasks,
            COUNT(CASE WHEN t.status = 'TODO' THEN 1 END) as todoTasks,
            COUNT(CASE WHEN t.status = 'IN_PROGRESS' THEN 1 END) as inProgressTasks,
            COUNT(CASE WHEN t.status = 'REVIEW' THEN 1 END) as reviewTasks,
            COUNT(CASE WHEN t.status = 'DONE' THEN 1 END) as completedTasks,
            COUNT(CASE WHEN t.dueDate < CURRENT_TIMESTAMP AND t.status NOT IN ('DONE', 'CANCELLED') THEN 1 END) as overdueTasks
        )
        FROM Task t 
        WHERE t.assignee = :user 
        AND t.isArchived = false
    """)
    Object getTaskStatsByUser(@Param("user") User user);

    @Query("""
        SELECT DISTINCT t FROM Task t 
        JOIN t.dependencies d 
        WHERE t.project = :project 
        AND t.isArchived = false 
        AND t.status NOT IN ('DONE', 'CANCELLED')
        AND d.status != 'DONE'
    """)
    List<Task> findBlockedTasks(@Param("project") Project project);

    @Query("""
        SELECT t FROM Task t 
        WHERE (t.assignee = :user OR t.creator = :user)
        AND t.isArchived = false 
        AND t.updatedAt >= :since
        ORDER BY t.updatedAt DESC
    """)
    List<Task> findRecentTasksByUser(@Param("user") User user, @Param("since") LocalDateTime since, Pageable pageable);

    List<Task> findByParentTaskAndIsArchivedFalseOrderByCreatedAtAsc(Task parentTask);

    List<Task> findByProjectAndParentTaskIsNullAndIsArchivedFalseOrderByCreatedAtDesc(Project project);

    @Query("""
        SELECT t.status, COUNT(t) FROM Task t 
        WHERE t.project = :project 
        AND t.isArchived = false 
        GROUP BY t.status
    """)
    List<Object[]> countTasksByStatusForProject(@Param("project") Project project);

    @Query("""
        SELECT t.priority, COUNT(t) FROM Task t 
        WHERE t.project = :project 
        AND t.isArchived = false 
        GROUP BY t.priority
    """)
    List<Object[]> countTasksByPriorityForProject(@Param("project") Project project);

    @Query("""
        SELECT t FROM Task t 
        WHERE t.assignee = :user 
        AND t.project IN :projects 
        AND t.isArchived = false 
        ORDER BY t.dueDate ASC NULLS LAST, t.priority DESC
    """)
    List<Task> findTasksByUserAndProjects(@Param("user") User user, @Param("projects") List<Project> projects);

    @Query("""
        SELECT COUNT(t) > 0 FROM Task t 
        JOIN t.project p 
        LEFT JOIN p.members pm 
        WHERE t.id = :taskId 
        AND (p.owner = :user OR pm.user = :user OR t.assignee = :user)
    """)
    boolean hasUserAccessToTask(@Param("user") User user, @Param("taskId") Long taskId);

    @Query("""
        SELECT t FROM Task t 
        WHERE t.assignee = :user 
        AND t.dueDate BETWEEN :now AND :deadline 
        AND t.status NOT IN ('DONE', 'CANCELLED') 
        AND t.isArchived = false 
        ORDER BY t.dueDate ASC
    """)
    List<Task> findUserTasksDueSoon(@Param("user") User user, @Param("now") LocalDateTime now, @Param("deadline") LocalDateTime deadline);

    @Query("""
        SELECT DISTINCT t FROM Task t 
        JOIN t.dependencies d 
        WHERE t.isArchived = false 
        AND t.status NOT IN ('DONE', 'CANCELLED')
        AND d.status != 'DONE'
    """)
    List<Task> findAllBlockedTasks();

    @Query("""
        SELECT t FROM Task t 
        WHERE t.project = :project 
        AND t.isArchived = false 
        AND EXISTS (
            SELECT d FROM Task d 
            WHERE d MEMBER OF t.dependencies 
            AND d.status != 'DONE'
        )
    """)
    List<Task> findBlockedTasksByProject(@Param("project") Project project);

    List<Task> findByAssigneeAndProjectAndIsArchivedFalseOrderByDueDateAsc(User assignee, Project project);

    List<Task> findByCreatorAndProjectAndIsArchivedFalseOrderByCreatedAtDesc(User creator, Project project);

    @Query("""
        SELECT t FROM Task t 
        WHERE t.project IN :projects 
        AND t.isArchived = false 
        AND t.assignee = :user 
        ORDER BY t.dueDate ASC NULLS LAST, t.priority DESC
    """)
    List<Task> findTasksByUserAndProjectsIn(@Param("user") User user, @Param("projects") List<Project> projects);

    @Query("""
        SELECT COUNT(t) FROM Task t 
        WHERE t.project = :project 
        AND t.status = :status 
        AND t.isArchived = false
    """)
    long countByProjectAndStatus(@Param("project") Project project, @Param("status") TaskStatus status);

    @Query("""
        SELECT COUNT(t) FROM Task t 
        WHERE t.assignee = :user 
        AND t.status = :status 
        AND t.isArchived = false
    """)
    long countByAssigneeAndStatus(@Param("user") User user, @Param("status") TaskStatus status);
}