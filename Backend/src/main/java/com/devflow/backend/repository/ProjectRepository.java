package com.devflow.backend.repository;

import com.devflow.backend.entity.Project;
import com.devflow.backend.entity.ProjectHealth;
import com.devflow.backend.entity.ProjectStatus;
import com.devflow.backend.entity.User;
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
public interface ProjectRepository extends JpaRepository<Project, Long> {


    Page<Project> findByOwnerAndIsArchivedFalseOrderByUpdatedAtDesc(User owner, Pageable pageable);


    @Query("""
        SELECT DISTINCT p FROM Project p 
        LEFT JOIN p.members pm 
        WHERE (p.owner = :user OR pm.user = :user) 
        AND p.isArchived = false 
        ORDER BY p.updatedAt DESC
    """)
    Page<Project> findProjectsByUserMembership(@Param("user") User user, Pageable pageable);


    List<Project> findByStatusAndIsArchivedFalse(ProjectStatus status);


    @Query("""
        SELECT p FROM Project p 
        WHERE p.dueDate BETWEEN :now AND :deadline 
        AND p.status != 'COMPLETED' 
        AND p.isArchived = false
    """)
    List<Project> findProjectsDueSoon(@Param("now") LocalDateTime now, @Param("deadline") LocalDateTime deadline);

    @Query("""
        SELECT p FROM Project p 
        WHERE p.dueDate < :now 
        AND p.status != 'COMPLETED' 
        AND p.isArchived = false
    """)
    List<Project> findOverdueProjects(@Param("now") LocalDateTime now);


    @Query("""
        SELECT DISTINCT p FROM Project p 
        LEFT JOIN p.members pm 
        WHERE (p.owner = :user OR pm.user = :user) 
        AND p.isArchived = false 
        AND (LOWER(p.name) LIKE LOWER(CONCAT('%', :searchTerm, '%')) 
             OR LOWER(p.description) LIKE LOWER(CONCAT('%', :searchTerm, '%')))
        ORDER BY p.updatedAt DESC
    """)
    Page<Project> searchUserProjects(@Param("user") User user, @Param("searchTerm") String searchTerm, Pageable pageable);


    @Query("""
        SELECT new map(
            COUNT(p) as totalProjects,
            COUNT(CASE WHEN p.status = 'ACTIVE' THEN 1 END) as activeProjects,
            COUNT(CASE WHEN p.status = 'COMPLETED' THEN 1 END) as completedProjects,
            AVG(p.progress) as averageProgress
        )
        FROM Project p 
        LEFT JOIN p.members pm 
        WHERE (p.owner = :user OR pm.user = :user) 
        AND p.isArchived = false
    """)
    Object getProjectStatsByUser(@Param("user") User user);


    @Query("""
        SELECT DISTINCT p FROM Project p 
        LEFT JOIN p.members pm 
        LEFT JOIN p.activities a 
        WHERE (p.owner = :user OR pm.user = :user) 
        AND p.isArchived = false 
        AND (p.updatedAt >= :since OR a.createdAt >= :since)
        ORDER BY GREATEST(p.updatedAt, COALESCE(MAX(a.createdAt), p.updatedAt)) DESC
    """)
    List<Project> findRecentProjectsByUser(@Param("user") User user, @Param("since") LocalDateTime since, Pageable pageable);


    @Query("""
        SELECT COUNT(p) > 0 FROM Project p 
        LEFT JOIN p.members pm 
        WHERE p.id = :projectId 
        AND (p.owner = :user OR pm.user = :user)
    """)
    boolean hasUserAccessToProject(@Param("user") User user, @Param("projectId") Long projectId);


    @Query("""
        SELECT p FROM Project p 
        WHERE p.owner = :owner 
        AND p.isArchived = false 
        AND (:status IS NULL OR p.status = :status)
        ORDER BY p.updatedAt DESC
    """)
    Page<Project> findByOwnerAndOptionalStatus(@Param("owner") User owner, @Param("status") ProjectStatus status, Pageable pageable);


    @Query("""
        SELECT p.status, COUNT(p) FROM Project p 
        LEFT JOIN p.members pm 
        WHERE (p.owner = :user OR pm.user = :user) 
        AND p.isArchived = false 
        GROUP BY p.status
    """)
    List<Object[]> countProjectsByStatusForUser(@Param("user") User user);


    @Query("""
        SELECT p FROM Project p 
        LEFT JOIN p.members pm 
        WHERE (p.owner = :user OR pm.user = :user) 
        AND p.isArchived = false 
        AND p.status = 'ACTIVE'
        AND p.dueDate IS NOT NULL 
        AND p.progress < (
            (EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - p.startDate)) / 
             EXTRACT(EPOCH FROM (p.dueDate - p.startDate))) * 100
        )
    """)
    List<Project> findProjectsBehindSchedule(@Param("user") User user);
}