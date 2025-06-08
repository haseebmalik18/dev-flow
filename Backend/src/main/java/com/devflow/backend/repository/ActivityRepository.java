package com.devflow.backend.repository;

import com.devflow.backend.entity.Activity;

import com.devflow.backend.entity.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;


@Repository
public interface ActivityRepository extends JpaRepository<Activity, Long> {


    Page<Activity> findByProjectOrderByCreatedAtDesc(Project project, Pageable pageable);


    Page<Activity> findByUserOrderByCreatedAtDesc(User user, Pageable pageable);


    List<Activity> findByTaskOrderByCreatedAtDesc(Task task);


    @Query("""
        SELECT a FROM Activity a 
        JOIN a.project p 
        LEFT JOIN p.members pm 
        WHERE (p.owner = :user OR pm.user = :user)
        AND a.createdAt >= :since
        ORDER BY a.createdAt DESC
    """)
    List<Activity> findRecentActivitiesByUserProjects(@Param("user") User user, @Param("since") LocalDateTime since, Pageable pageable);


    List<Activity> findByTypeAndProjectOrderByCreatedAtDesc(ActivityType type, Project project);


    @Query("""
        SELECT a FROM Activity a 
        WHERE a.project = :project 
        AND a.createdAt BETWEEN :startDate AND :endDate
        ORDER BY a.createdAt DESC
    """)
    List<Activity> findActivitiesByProjectAndDateRange(
            @Param("project") Project project,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    @Query("""
        SELECT a.type, COUNT(a) FROM Activity a 
        WHERE a.project = :project 
        AND a.createdAt >= :since
        GROUP BY a.type
    """)
    List<Object[]> countActivitiesByTypeForProject(@Param("project") Project project, @Param("since") LocalDateTime since);


    @Query("""
        SELECT a FROM Activity a 
        WHERE (a.user = :user OR a.targetUser = :user)
        AND a.project = :project
        ORDER BY a.createdAt DESC
    """)
    List<Activity> findActivitiesInvolvingUser(@Param("user") User user, @Param("project") Project project);


    @Query("DELETE FROM Activity a WHERE a.createdAt < :cutoff")
    void deleteOldActivities(@Param("cutoff") LocalDateTime cutoff);

    @Query("""
        SELECT new map(
            COUNT(a) as totalActivities,
            COUNT(DISTINCT a.user) as activeUsers,
            COUNT(CASE WHEN a.type = 'TASK_COMPLETED' THEN 1 END) as tasksCompleted,
            COUNT(CASE WHEN a.type = 'TASK_CREATED' THEN 1 END) as tasksCreated
        )
        FROM Activity a 
        WHERE a.project = :project 
        AND a.createdAt >= :since
    """)
    Object getActivityStatsByProject(@Param("project") Project project, @Param("since") LocalDateTime since);
}