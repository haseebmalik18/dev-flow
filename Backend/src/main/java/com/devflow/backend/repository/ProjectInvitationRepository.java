package com.devflow.backend.repository;

import com.devflow.backend.entity.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectInvitationRepository extends JpaRepository<ProjectInvitation, Long> {


    Optional<ProjectInvitation> findByToken(String token);


    @Query("""
        SELECT pi FROM ProjectInvitation pi 
        WHERE pi.email = :email 
        AND pi.status = 'PENDING' 
        AND pi.expiresAt > :now
        ORDER BY pi.createdAt DESC
    """)
    List<ProjectInvitation> findPendingInvitationsByEmail(@Param("email") String email, @Param("now") LocalDateTime now);


    Page<ProjectInvitation> findByProjectOrderByCreatedAtDesc(Project project, Pageable pageable);


    Page<ProjectInvitation> findByInvitedByOrderByCreatedAtDesc(User invitedBy, Pageable pageable);


    boolean existsByProjectAndEmailAndStatusIn(Project project, String email, List<InvitationStatus> statuses);


    Optional<ProjectInvitation> findByProjectAndEmailAndStatus(Project project, String email, InvitationStatus status);


    @Query("""
        SELECT pi.status, COUNT(pi) FROM ProjectInvitation pi 
        WHERE pi.project = :project 
        GROUP BY pi.status
    """)
    List<Object[]> countInvitationsByStatusForProject(@Param("project") Project project);


    @Query("""
        SELECT pi FROM ProjectInvitation pi 
        WHERE pi.status = 'PENDING' 
        AND pi.expiresAt < :now
    """)
    List<ProjectInvitation> findExpiredPendingInvitations(@Param("now") LocalDateTime now);


    @Modifying
    @Query("""
        UPDATE ProjectInvitation pi 
        SET pi.status = 'EXPIRED' 
        WHERE pi.status = 'PENDING' 
        AND pi.expiresAt < :now
    """)
    int markExpiredInvitations(@Param("now") LocalDateTime now);


    List<ProjectInvitation> findByUserOrderByCreatedAtDesc(User user);


    List<ProjectInvitation> findByProjectAndStatus(Project project, InvitationStatus status);


    @Modifying
    @Query("DELETE FROM ProjectInvitation pi WHERE pi.createdAt < :cutoff")
    void deleteOldInvitations(@Param("cutoff") LocalDateTime cutoff);


    @Query("""
        SELECT CASE WHEN COUNT(pm) > 0 THEN true ELSE false END 
        FROM ProjectMember pm 
        WHERE pm.project = :project 
        AND pm.user.email = :email
    """)
    boolean isUserAlreadyMember(@Param("project") Project project, @Param("email") String email);


    @Query("""
        SELECT new map(
            COUNT(pi) as total,
            COUNT(CASE WHEN pi.status = 'PENDING' THEN 1 END) as pending,
            COUNT(CASE WHEN pi.status = 'ACCEPTED' THEN 1 END) as accepted,
            COUNT(CASE WHEN pi.status = 'DECLINED' THEN 1 END) as declined,
            COUNT(CASE WHEN pi.status = 'EXPIRED' THEN 1 END) as expired
        )
        FROM ProjectInvitation pi 
        WHERE pi.invitedBy = :user
    """)
    Object getInvitationStatsByUser(@Param("user") User user);


    @Query("""
        SELECT pi FROM ProjectInvitation pi 
        WHERE pi.project IN :projects 
        AND pi.createdAt >= :since
        ORDER BY pi.createdAt DESC
    """)
    List<ProjectInvitation> findRecentInvitationsByProjects(@Param("projects") List<Project> projects, @Param("since") LocalDateTime since);


    @Modifying
    @Query("""
        UPDATE ProjectInvitation pi 
        SET pi.status = 'CANCELLED' 
        WHERE pi.project = :project 
        AND pi.email = :email 
        AND pi.status = 'PENDING'
    """)
    int cancelExistingInvitations(@Param("project") Project project, @Param("email") String email);
}