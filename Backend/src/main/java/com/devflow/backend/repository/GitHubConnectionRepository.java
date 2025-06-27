package com.devflow.backend.repository;

import com.devflow.backend.entity.GitHubConnection;
import com.devflow.backend.entity.GitHubConnectionStatus;
import com.devflow.backend.entity.Project;
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

    List<GitHubConnection> findByProjectOrderByCreatedAtDesc(Project project);

    List<GitHubConnection> findByProjectAndStatusOrderByCreatedAtDesc(Project project, GitHubConnectionStatus status);

    List<GitHubConnection> findByStatusOrderByCreatedAtDesc(GitHubConnectionStatus status);

    boolean existsByProjectAndRepositoryFullNameAndStatus(Project project, String repositoryFullName, GitHubConnectionStatus status);

    boolean existsActiveConnectionForProjectAndRepository(Project project, String repositoryFullName);

    Optional<GitHubConnection> findByRepositoryFullNameAndStatus(String repositoryFullName, GitHubConnectionStatus status);

    List<GitHubConnection> findByWebhookStatusAndLastWebhookAtBefore(String webhookStatus, LocalDateTime before);

    @Query("SELECT gc FROM GitHubConnection gc WHERE gc.status = :status AND gc.lastWebhookAt < :threshold")
    List<GitHubConnection> findStaleConnections(@Param("threshold") LocalDateTime threshold);

    @Query("SELECT COUNT(gc) as totalConnections, " +
            "SUM(CASE WHEN gc.status = 'ACTIVE' THEN 1 ELSE 0 END) as activeConnections, " +
            "SUM(CASE WHEN gc.webhookStatus = 'ACTIVE' THEN 1 ELSE 0 END) as webhooksActive, " +
            "SUM(CASE WHEN gc.errorCount > 0 THEN 1 ELSE 0 END) as connectionsWithErrors, " +
            "SUM(CASE WHEN gc.lastWebhookAt > :recentThreshold THEN 1 ELSE 0 END) as recentActivity " +
            "FROM GitHubConnection gc")
    Object getHealthStatistics(@Param("recentThreshold") LocalDateTime recentThreshold);

    @Modifying
    @Query("DELETE FROM GitHubConnection gc WHERE gc.status = 'DISCONNECTED' AND gc.updatedAt < :cutoff")
    void deleteOldDisconnectedConnections(@Param("cutoff") LocalDateTime cutoff);

    @Query("SELECT gc FROM GitHubConnection gc WHERE gc.project.id = :projectId AND gc.status = 'ACTIVE'")
    List<GitHubConnection> findActiveConnectionsByProjectId(@Param("projectId") Long projectId);

    @Query("SELECT gc FROM GitHubConnection gc WHERE gc.repositoryFullName = :repositoryFullName AND gc.status = 'ACTIVE'")
    Optional<GitHubConnection> findActiveConnectionByRepository(@Param("repositoryFullName") String repositoryFullName);

    @Query("SELECT COUNT(gc) FROM GitHubConnection gc WHERE gc.project.id = :projectId AND gc.status = 'ACTIVE'")
    long countActiveConnectionsByProject(@Param("projectId") Long projectId);

    @Query("SELECT gc FROM GitHubConnection gc WHERE gc.connectedBy.id = :userId ORDER BY gc.createdAt DESC")
    List<GitHubConnection> findByConnectedByIdOrderByCreatedAtDesc(@Param("userId") Long userId);

    @Query("SELECT gc FROM GitHubConnection gc WHERE gc.webhookId = :webhookId")
    Optional<GitHubConnection> findByWebhookId(@Param("webhookId") String webhookId);

    @Query("SELECT gc FROM GitHubConnection gc WHERE gc.installationId = :installationId")
    List<GitHubConnection> findByInstallationId(@Param("installationId") Long installationId);

    @Query("SELECT gc FROM GitHubConnection gc WHERE gc.errorCount >= :errorThreshold")
    List<GitHubConnection> findConnectionsWithErrors(@Param("errorThreshold") Integer errorThreshold);

    @Query("SELECT gc FROM GitHubConnection gc WHERE gc.lastSyncAt IS NULL OR gc.lastSyncAt < :threshold")
    List<GitHubConnection> findConnectionsNeedingSync(@Param("threshold") LocalDateTime threshold);
}