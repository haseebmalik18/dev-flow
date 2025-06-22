// GitHubConnectionRepository.java
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
public interface GitHubConnectionRepository extends JpaRepository<GitHubConnection, Long> {

    // Find connections by project
    List<GitHubConnection> findByProjectOrderByCreatedAtDesc(Project project);

    // Find connection by project and repository
    Optional<GitHubConnection> findByProjectAndRepositoryFullName(Project project, String repositoryFullName);

    // Find connections by user
    @Query("""
        SELECT gc FROM GitHubConnection gc 
        WHERE gc.connectedBy = :user 
        ORDER BY gc.createdAt DESC
    """)
    List<GitHubConnection> findByConnectedByOrderByCreatedAtDesc(@Param("user") User user);

    // Find connections by status
    List<GitHubConnection> findByStatusOrderByCreatedAtDesc(GitHubConnectionStatus status);

    // Find connections by webhook status
    List<GitHubConnection> findByWebhookStatusOrderByCreatedAtDesc(GitHubWebhookStatus webhookStatus);

    // Find connections with errors
    @Query("""
        SELECT gc FROM GitHubConnection gc 
        WHERE gc.errorCount > 0 
        ORDER BY gc.errorCount DESC, gc.updatedAt DESC
    """)
    List<GitHubConnection> findConnectionsWithErrors();

    // Find stale connections (no webhook activity)
    @Query("""
        SELECT gc FROM GitHubConnection gc 
        WHERE gc.status = 'ACTIVE' 
        AND (gc.lastWebhookAt IS NULL OR gc.lastWebhookAt < :threshold)
        ORDER BY gc.lastWebhookAt ASC NULLS FIRST
    """)
    List<GitHubConnection> findStaleConnections(@Param("threshold") LocalDateTime threshold);

    // Find connections by installation ID
    List<GitHubConnection> findByInstallationId(Long installationId);

    // Find connection by webhook ID
    Optional<GitHubConnection> findByWebhookId(String webhookId);

    // Check if repository is already connected to project
    @Query("""
        SELECT COUNT(gc) > 0 FROM GitHubConnection gc 
        WHERE gc.project = :project 
        AND gc.repositoryFullName = :repositoryFullName 
        AND gc.status != 'DISCONNECTED'
    """)
    boolean existsActiveConnectionForProjectAndRepository(
            @Param("project") Project project,
            @Param("repositoryFullName") String repositoryFullName
    );

    // Find user's accessible connections
    @Query("""
        SELECT gc FROM GitHubConnection gc 
        JOIN gc.project p 
        LEFT JOIN p.members pm 
        WHERE (p.owner = :user OR pm.user = :user) 
        AND gc.status = 'ACTIVE'
        ORDER BY gc.createdAt DESC
    """)
    List<GitHubConnection> findAccessibleConnectionsByUser(@Param("user") User user);

    // Update webhook status
    @Modifying
    @Query("""
        UPDATE GitHubConnection gc 
        SET gc.webhookStatus = :status, gc.updatedAt = CURRENT_TIMESTAMP 
        WHERE gc.id = :connectionId
    """)
    void updateWebhookStatus(@Param("connectionId") Long connectionId, @Param("status") GitHubWebhookStatus status);

    // Update last webhook received time
    @Modifying
    @Query("""
        UPDATE GitHubConnection gc 
        SET gc.lastWebhookAt = :timestamp, gc.errorCount = 0, gc.errorMessage = NULL, gc.updatedAt = CURRENT_TIMESTAMP 
        WHERE gc.id = :connectionId
    """)
    void updateLastWebhookReceived(@Param("connectionId") Long connectionId, @Param("timestamp") LocalDateTime timestamp);

    // Increment error count
    @Modifying
    @Query("""
        UPDATE GitHubConnection gc 
        SET gc.errorCount = COALESCE(gc.errorCount, 0) + 1, 
            gc.errorMessage = :errorMessage, 
            gc.updatedAt = CURRENT_TIMESTAMP 
        WHERE gc.id = :connectionId
    """)
    void incrementErrorCount(@Param("connectionId") Long connectionId, @Param("errorMessage") String errorMessage);

    // Get health statistics
    @Query("""
        SELECT NEW map(
            COUNT(gc) as total,
            COUNT(CASE WHEN gc.status = 'ACTIVE' THEN 1 END) as active,
            COUNT(CASE WHEN gc.webhookStatus = 'ACTIVE' THEN 1 END) as webhooksActive,
            COUNT(CASE WHEN gc.errorCount > 0 THEN 1 END) as withErrors,
            COUNT(CASE WHEN gc.lastWebhookAt > :threshold THEN 1 END) as recentActivity
        ) 
        FROM GitHubConnection gc
    """)
    Object getHealthStatistics(@Param("threshold") LocalDateTime threshold);

    // Clean up old disconnected connections
    @Modifying
    @Query("""
        DELETE FROM GitHubConnection gc 
        WHERE gc.status = 'DISCONNECTED' 
        AND gc.updatedAt < :cutoff
    """)
    void deleteOldDisconnectedConnections(@Param("cutoff") LocalDateTime cutoff);
}