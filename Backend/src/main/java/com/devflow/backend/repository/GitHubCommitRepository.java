// GitHubCommitRepository.java
package com.devflow.backend.repository;

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
public interface GitHubCommitRepository extends JpaRepository<GitHubCommit, Long> {

    // Find commit by SHA
    Optional<GitHubCommit> findByCommitSha(String commitSha);

    // Find commits by connection
    Page<GitHubCommit> findByGitHubConnectionOrderByCommitDateDesc(GitHubConnection connection, Pageable pageable);

    // Find commits by task
    @Query("""
        SELECT gc FROM GitHubCommit gc 
        JOIN gc.taskLinks tl 
        WHERE tl.task = :task 
        ORDER BY gc.commitDate DESC
    """)
    List<GitHubCommit> findByTaskOrderByCommitDateDesc(@Param("task") Task task);

    // Find commits by project
    @Query("""
        SELECT gc FROM GitHubCommit gc 
        WHERE gc.gitHubConnection.project = :project 
        ORDER BY gc.commitDate DESC
    """)
    Page<GitHubCommit> findByProjectOrderByCommitDateDesc(@Param("project") Project project, Pageable pageable);

    // Find recent commits for a connection
    @Query("""
        SELECT gc FROM GitHubCommit gc 
        WHERE gc.gitHubConnection = :connection 
        AND gc.commitDate >= :since 
        ORDER BY gc.commitDate DESC
    """)
    List<GitHubCommit> findRecentCommits(
            @Param("connection") GitHubConnection connection,
            @Param("since") LocalDateTime since
    );

    // Find commits by author
    @Query("""
        SELECT gc FROM GitHubCommit gc 
        WHERE gc.gitHubConnection = :connection 
        AND (gc.authorEmail = :email OR gc.authorUsername = :username)
        ORDER BY gc.commitDate DESC
    """)
    List<GitHubCommit> findByConnectionAndAuthor(
            @Param("connection") GitHubConnection connection,
            @Param("email") String email,
            @Param("username") String username
    );

    // Find commits with task links
    @Query("""
        SELECT DISTINCT gc FROM GitHubCommit gc 
        JOIN gc.taskLinks tl 
        WHERE gc.gitHubConnection.project = :project 
        ORDER BY gc.commitDate DESC
    """)
    List<GitHubCommit> findCommitsWithTaskLinksByProject(@Param("project") Project project);

    // Find commits by branch
    @Query("""
        SELECT gc FROM GitHubCommit gc 
        WHERE gc.gitHubConnection = :connection 
        AND gc.branchName = :branchName 
        ORDER BY gc.commitDate DESC
    """)
    List<GitHubCommit> findByConnectionAndBranch(
            @Param("connection") GitHubConnection connection,
            @Param("branchName") String branchName
    );

    // Search commits by message
    @Query("""
        SELECT gc FROM GitHubCommit gc 
        WHERE gc.gitHubConnection.project = :project 
        AND LOWER(gc.commitMessage) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
        ORDER BY gc.commitDate DESC
    """)
    Page<GitHubCommit> searchCommitsByMessage(
            @Param("project") Project project,
            @Param("searchTerm") String searchTerm,
            Pageable pageable
    );

    // Get commit statistics for project
    @Query("""
        SELECT NEW map(
            COUNT(gc) as totalCommits,
            COUNT(DISTINCT gc.authorEmail) as uniqueAuthors,
            COUNT(DISTINCT gc.branchName) as uniqueBranches,
            SUM(gc.additions) as totalAdditions,
            SUM(gc.deletions) as totalDeletions,
            SUM(gc.changedFiles) as totalChangedFiles
        ) 
        FROM GitHubCommit gc 
        WHERE gc.gitHubConnection.project = :project 
        AND gc.commitDate >= :since
    """)
    Object getCommitStatistics(@Param("project") Project project, @Param("since") LocalDateTime since);

    // Check if commit exists
    boolean existsByCommitSha(String commitSha);

    // Find commits needing task linking
    @Query("""
        SELECT gc FROM GitHubCommit gc 
        WHERE gc.gitHubConnection = :connection 
        AND SIZE(gc.taskLinks) = 0 
        AND gc.commitDate >= :since
        ORDER BY gc.commitDate DESC
    """)
    List<GitHubCommit> findCommitsNeedingTaskLinking(
            @Param("connection") GitHubConnection connection,
            @Param("since") LocalDateTime since
    );
}