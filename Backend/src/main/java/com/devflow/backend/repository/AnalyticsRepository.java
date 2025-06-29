package com.devflow.backend.repository;

import com.devflow.backend.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AnalyticsRepository extends JpaRepository<Project, Long> {

    @Query("""
        SELECT new map(
            COUNT(p) as totalProjects,
            COUNT(CASE WHEN p.status = 'ACTIVE' THEN 1 END) as activeProjects,
            COUNT(CASE WHEN p.status = 'COMPLETED' THEN 1 END) as completedProjects,
            COUNT(CASE WHEN p.dueDate < :now AND p.status != 'COMPLETED' THEN 1 END) as delayedProjects,
            COUNT(CASE WHEN p.status = 'CANCELLED' THEN 1 END) as cancelledProjects,
            AVG(p.progress) as averageProgress
        )
        FROM Project p 
        LEFT JOIN p.members pm 
        WHERE (p.owner = :user OR pm.user = :user)
        AND p.isArchived = false
        AND (:startDate IS NULL OR p.createdAt >= :startDate)
        AND (:endDate IS NULL OR p.createdAt <= :endDate)
    """)
    Object getProjectMetrics(@Param("user") User user,
                             @Param("startDate") LocalDateTime startDate,
                             @Param("endDate") LocalDateTime endDate,
                             @Param("now") LocalDateTime now);

    @Query("""
        SELECT new map(
            COUNT(t) as totalTasks,
            COUNT(CASE WHEN t.status = 'DONE' THEN 1 END) as completedTasks,
            COUNT(CASE WHEN t.status = 'IN_PROGRESS' THEN 1 END) as inProgressTasks,
            COUNT(CASE WHEN t.status = 'TODO' THEN 1 END) as todoTasks,
            COUNT(CASE WHEN t.status = 'REVIEW' THEN 1 END) as reviewTasks,
            COUNT(CASE WHEN t.dueDate < :now AND t.status != 'DONE' THEN 1 END) as overdueTasks,
            AVG(CASE WHEN t.completedDate IS NOT NULL AND t.createdAt IS NOT NULL 
                THEN EXTRACT(EPOCH FROM (t.completedDate - t.createdAt)) / 86400.0 END) as averageDuration
        )
        FROM Task t 
        JOIN t.project p
        LEFT JOIN p.members pm 
        WHERE (p.owner = :user OR pm.user = :user OR t.assignee = :user)
        AND t.isArchived = false
        AND (:startDate IS NULL OR t.createdAt >= :startDate)
        AND (:endDate IS NULL OR t.createdAt <= :endDate)
    """)
    Object getTaskMetrics(@Param("user") User user,
                          @Param("startDate") LocalDateTime startDate,
                          @Param("endDate") LocalDateTime endDate,
                          @Param("now") LocalDateTime now);

    @Query("""
        SELECT t.status as status, COUNT(t) as count
        FROM Task t 
        JOIN t.project p
        LEFT JOIN p.members pm 
        WHERE (p.owner = :user OR pm.user = :user OR t.assignee = :user)
        AND t.isArchived = false
        AND (:startDate IS NULL OR t.createdAt >= :startDate)
        AND (:endDate IS NULL OR t.createdAt <= :endDate)
        GROUP BY t.status
    """)
    List<Object[]> getTaskStatusDistribution(@Param("user") User user,
                                             @Param("startDate") LocalDateTime startDate,
                                             @Param("endDate") LocalDateTime endDate);

    @Query("""
        SELECT t.priority as priority, COUNT(t) as count
        FROM Task t 
        JOIN t.project p
        LEFT JOIN p.members pm 
        WHERE (p.owner = :user OR pm.user = :user OR t.assignee = :user)
        AND t.isArchived = false
        AND (:startDate IS NULL OR t.createdAt >= :startDate)
        AND (:endDate IS NULL OR t.createdAt <= :endDate)
        GROUP BY t.priority
    """)
    List<Object[]> getTaskPriorityDistribution(@Param("user") User user,
                                               @Param("startDate") LocalDateTime startDate,
                                               @Param("endDate") LocalDateTime endDate);

    @Query("""
        SELECT 
            u.id as userId,
            u.username as username,
            CONCAT(u.firstName, ' ', u.lastName) as fullName,
            u.avatar as avatar,
            u.jobTitle as jobTitle,
            COUNT(t) as totalTasks,
            COUNT(CASE WHEN t.status = 'DONE' THEN 1 END) as completedTasks,
            COALESCE(SUM(t.storyPoints), 0) as totalStoryPoints,
            AVG(CASE WHEN t.completedDate IS NOT NULL AND t.createdAt IS NOT NULL 
                THEN EXTRACT(EPOCH FROM (t.completedDate - t.createdAt)) / 86400.0 END) as averageDuration
        FROM User u
        LEFT JOIN Task t ON t.assignee = u
        LEFT JOIN Project p ON t.project = p
        LEFT JOIN p.members pm ON pm.user = u
        WHERE (p.owner = :currentUser OR pm.user = :currentUser OR u = :currentUser)
        AND (t.isArchived = false OR t IS NULL)
        AND (:startDate IS NULL OR t.createdAt >= :startDate OR t IS NULL)
        AND (:endDate IS NULL OR t.createdAt <= :endDate OR t IS NULL)
        GROUP BY u.id, u.username, u.firstName, u.lastName, u.avatar, u.jobTitle
        HAVING COUNT(t) > 0
        ORDER BY completedTasks DESC
    """)
    List<Object[]> getTeamMemberPerformance(@Param("currentUser") User currentUser,
                                            @Param("startDate") LocalDateTime startDate,
                                            @Param("endDate") LocalDateTime endDate);

    @Query("""
        SELECT 
            DATE(t.createdAt) as date,
            COUNT(t) as tasksCreated,
            COUNT(CASE WHEN t.status = 'DONE' THEN 1 END) as tasksCompleted
        FROM Task t 
        JOIN t.project p
        LEFT JOIN p.members pm 
        WHERE (p.owner = :user OR pm.user = :user OR t.assignee = :user)
        AND t.isArchived = false
        AND t.createdAt >= :startDate
        AND t.createdAt <= :endDate
        GROUP BY DATE(t.createdAt)
        ORDER BY DATE(t.createdAt)
    """)
    List<Object[]> getDailyTaskTrends(@Param("user") User user,
                                      @Param("startDate") LocalDateTime startDate,
                                      @Param("endDate") LocalDateTime endDate);

    @Query("""
        SELECT 
            DATE(p.createdAt) as date,
            COUNT(p) as projectsCreated,
            COUNT(CASE WHEN p.status = 'COMPLETED' THEN 1 END) as projectsCompleted
        FROM Project p 
        LEFT JOIN p.members pm 
        WHERE (p.owner = :user OR pm.user = :user)
        AND p.isArchived = false
        AND p.createdAt >= :startDate
        AND p.createdAt <= :endDate
        GROUP BY DATE(p.createdAt)
        ORDER BY DATE(p.createdAt)
    """)
    List<Object[]> getDailyProjectTrends(@Param("user") User user,
                                         @Param("startDate") LocalDateTime startDate,
                                         @Param("endDate") LocalDateTime endDate);

    @Query("""
        SELECT 
            t.assignee.id as userId,
            COUNT(t) as activeTasks,
            COUNT(CASE WHEN t.dueDate < :now AND t.status != 'DONE' THEN 1 END) as overdueTasks,
            COALESCE(SUM(t.storyPoints), 0) as totalStoryPoints
        FROM Task t 
        JOIN t.project p
        LEFT JOIN p.members pm 
        WHERE (p.owner = :user OR pm.user = :user)
        AND t.assignee IS NOT NULL
        AND t.isArchived = false
        AND t.status NOT IN ('DONE', 'CANCELLED')
        GROUP BY t.assignee.id
    """)
    List<Object[]> getTeamWorkload(@Param("user") User user, @Param("now") LocalDateTime now);

    @Query("""
        SELECT 
            p.id as projectId,
            p.name as projectName,
            COUNT(pm) as teamSize,
            COUNT(t) as totalTasks,
            COUNT(CASE WHEN t.status NOT IN ('DONE', 'CANCELLED') THEN 1 END) as activeTasks
        FROM Project p 
        LEFT JOIN p.members pm 
        LEFT JOIN p.tasks t ON t.isArchived = false
        WHERE (p.owner = :user OR EXISTS (SELECT 1 FROM p.members pm2 WHERE pm2.user = :user))
        AND p.isArchived = false
        GROUP BY p.id, p.name
    """)
    List<Object[]> getProjectWorkloads(@Param("user") User user);

    @Query("""
        SELECT 
            EXTRACT(HOUR FROM t.completedDate) as hour,
            COUNT(t) as tasksCompleted
        FROM Task t 
        JOIN t.project p
        LEFT JOIN p.members pm 
        WHERE (p.owner = :user OR pm.user = :user OR t.assignee = :user)
        AND t.completedDate IS NOT NULL
        AND t.completedDate >= :startDate
        AND t.completedDate <= :endDate
        GROUP BY EXTRACT(HOUR FROM t.completedDate)
        ORDER BY EXTRACT(HOUR FROM t.completedDate)
    """)
    List<Object[]> getProductivityByHour(@Param("user") User user,
                                         @Param("startDate") LocalDateTime startDate,
                                         @Param("endDate") LocalDateTime endDate);

    @Query("""
        SELECT 
            EXTRACT(DOW FROM t.completedDate) as dayOfWeek,
            COUNT(t) as tasksCompleted,
            AVG(CASE WHEN t.completedDate IS NOT NULL AND t.createdAt IS NOT NULL 
                THEN EXTRACT(EPOCH FROM (t.completedDate - t.createdAt)) / 86400.0 END) as averageDuration
        FROM Task t 
        JOIN t.project p
        LEFT JOIN p.members pm 
        WHERE (p.owner = :user OR pm.user = :user OR t.assignee = :user)
        AND t.completedDate IS NOT NULL
        AND t.completedDate >= :startDate
        AND t.completedDate <= :endDate
        GROUP BY EXTRACT(DOW FROM t.completedDate)
        ORDER BY EXTRACT(DOW FROM t.completedDate)
    """)
    List<Object[]> getProductivityByDayOfWeek(@Param("user") User user,
                                              @Param("startDate") LocalDateTime startDate,
                                              @Param("endDate") LocalDateTime endDate);

    @Query("""
        SELECT 
            DATE_TRUNC('week', t.completedDate) as week,
            COUNT(t) as tasksCompleted,
            COALESCE(SUM(t.storyPoints), 0) as storyPointsCompleted
        FROM Task t 
        JOIN t.project p
        LEFT JOIN p.members pm 
        WHERE (p.owner = :user OR pm.user = :user OR t.assignee = :user)
        AND t.completedDate IS NOT NULL
        AND t.completedDate >= :startDate
        AND t.completedDate <= :endDate
        GROUP BY DATE_TRUNC('week', t.completedDate)
        ORDER BY DATE_TRUNC('week', t.completedDate)
    """)
    List<Object[]> getWeeklyVelocity(@Param("user") User user,
                                     @Param("startDate") LocalDateTime startDate,
                                     @Param("endDate") LocalDateTime endDate);

    @Query("""
        SELECT new map(
            COUNT(DISTINCT t.assignee) as activeMembers,
            COUNT(DISTINCT p) as activeProjects,
            AVG(CASE WHEN pm.user IS NOT NULL THEN 
                (SELECT COUNT(t2) FROM Task t2 WHERE t2.assignee = pm.user AND t2.isArchived = false) 
                ELSE 0 END) as averageTasksPerMember
        )
        FROM Project p 
        LEFT JOIN p.members pm 
        LEFT JOIN p.tasks t ON t.isArchived = false
        WHERE (p.owner = :user OR pm.user = :user)
        AND p.isArchived = false
    """)
    Object getTeamMetrics(@Param("user") User user);

    @Query("""
        SELECT 
            DATE(a.createdAt) as date,
            COUNT(a) as totalActivities,
            COUNT(CASE WHEN a.type = 'TASK_COMPLETED' THEN 1 END) as tasksCompleted,
            COUNT(CASE WHEN a.type = 'COMMENT_ADDED' THEN 1 END) as comments
        FROM Activity a 
        JOIN a.project p
        LEFT JOIN p.members pm 
        WHERE (p.owner = :user OR pm.user = :user)
        AND a.createdAt >= :startDate
        AND a.createdAt <= :endDate
        GROUP BY DATE(a.createdAt)
        ORDER BY DATE(a.createdAt)
    """)
    List<Object[]> getDailyActivitySummary(@Param("user") User user,
                                           @Param("startDate") LocalDateTime startDate,
                                           @Param("endDate") LocalDateTime endDate);

    @Query("""
        SELECT DISTINCT t 
        FROM Task t 
        JOIN t.project p
        LEFT JOIN p.members pm 
        WHERE (p.owner = :user OR pm.user = :user)
        AND t.isArchived = false
        AND t.status NOT IN ('DONE', 'CANCELLED')
        AND EXISTS (SELECT 1 FROM t.dependencies dep WHERE dep.status != 'DONE')
    """)
    List<Task> getBlockedTasks(@Param("user") User user);

    @Query("""
        SELECT p.id, p.name, p.status, p.priority, p.progress, p.dueDate,
               COUNT(t) as totalTasks,
               COUNT(CASE WHEN t.status = 'DONE' THEN 1 END) as completedTasks,
               COUNT(CASE WHEN t.dueDate < :now AND t.status != 'DONE' THEN 1 END) as overdueTasks,
               COUNT(DISTINCT pm.user) as teamSize
        FROM Project p 
        LEFT JOIN p.members pm 
        LEFT JOIN p.tasks t ON t.isArchived = false
        WHERE p.id = :projectId
        AND (p.owner = :user OR pm.user = :user)
        AND p.isArchived = false
        GROUP BY p.id, p.name, p.status, p.priority, p.progress, p.dueDate
    """)
    Object getProjectAnalytics(@Param("projectId") Long projectId,
                               @Param("user") User user,
                               @Param("now") LocalDateTime now);

    @Query("""
        SELECT 
            t.assignee.id as userId,
            t.assignee.username as username,
            CONCAT(t.assignee.firstName, ' ', t.assignee.lastName) as fullName,
            t.status as status,
            COUNT(t) as count
        FROM Task t 
        WHERE t.project.id = :projectId
        AND t.assignee IS NOT NULL
        AND t.isArchived = false
        AND (:startDate IS NULL OR t.createdAt >= :startDate)
        AND (:endDate IS NULL OR t.createdAt <= :endDate)
        GROUP BY t.assignee.id, t.assignee.username, t.assignee.firstName, t.assignee.lastName, t.status
        ORDER BY t.assignee.username, t.status
    """)
    List<Object[]> getProjectTeamTaskBreakdown(@Param("projectId") Long projectId,
                                               @Param("startDate") LocalDateTime startDate,
                                               @Param("endDate") LocalDateTime endDate);

    @Query("""
        SELECT 
            DATE(t.createdAt) as date,
            p.progress as progress
        FROM Project p 
        LEFT JOIN p.tasks t ON t.isArchived = false
        WHERE p.id = :projectId
        AND t.createdAt >= :startDate
        AND t.createdAt <= :endDate
        ORDER BY DATE(t.createdAt)
    """)
    List<Object[]> getProjectProgressTrend(@Param("projectId") Long projectId,
                                           @Param("startDate") LocalDateTime startDate,
                                           @Param("endDate") LocalDateTime endDate);

    @Query("""
        SELECT COUNT(c) as commitCount
        FROM GitHubCommit c
        JOIN c.gitHubConnection gc
        WHERE gc.project.id = :projectId
        AND c.commitDate >= :startDate
        AND c.commitDate <= :endDate
    """)
    Long getProjectCommitCount(@Param("projectId") Long projectId,
                               @Param("startDate") LocalDateTime startDate,
                               @Param("endDate") LocalDateTime endDate);

    @Query("""
        SELECT COUNT(pr) as prCount
        FROM GitHubPullRequest pr
        JOIN pr.gitHubConnection gc
        WHERE gc.project.id = :projectId
        AND pr.createdDate >= :startDate
        AND pr.createdDate <= :endDate
    """)
    Long getProjectPullRequestCount(@Param("projectId") Long projectId,
                                    @Param("startDate") LocalDateTime startDate,
                                    @Param("endDate") LocalDateTime endDate);
}