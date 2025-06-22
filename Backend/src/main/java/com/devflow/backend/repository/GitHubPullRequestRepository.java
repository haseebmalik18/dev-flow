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
public interface GitHubPullRequestRepository extends JpaRepository<GitHubPullRequest, Long> {

    // Find PR by connection and number
    Optional<GitHubPullRequest> findByGitHubConnectionAndPrNumber(GitHubConnection connection, Integer prNumber);

    // Find PRs by connection
    Page<GitHubPullRequest> findByGitHubConnectionOrderByCreatedDateDesc(GitHubConnection connection, Pageable pageable);

    // Find PRs by task
    @Query("""
        SELECT gpr FROM GitHubPullRequest gpr 
        JOIN gpr.taskLinks tl 
        WHERE tl.task = :task 
        ORDER BY gpr.createdDate DESC
    """)
    List<GitHubPullRequest> findByTaskOrderByCreatedDateDesc(@Param("task") Task task);

    // Find PRs by project
    @Query("""
        SELECT gpr FROM GitHubPullRequest gpr 
        WHERE gpr.gitHubConnection.project = :project 
        ORDER BY gpr.createdDate DESC
    """)
    Page<GitHubPullRequest> findByProjectOrderByCreatedDateDesc(@Param("project") Project project, Pageable pageable);

    // Find PRs by status
    @Query("""
        SELECT gpr FROM GitHubPullRequest gpr 
        WHERE gpr.gitHubConnection = :connection 
        AND gpr.status = :status 
        ORDER BY gpr.createdDate DESC
    """)
    List<GitHubPullRequest> findByConnectionAndStatus(
            @Param("connection") GitHubConnection connection,
            @Param("status") GitHubPRStatus status
    );

    // Find PRs by author
    @Query("""
        SELECT gpr FROM GitHubPullRequest gpr 
        WHERE gpr.gitHubConnection = :connection 
        AND gpr.authorUsername = :authorUsername 
        ORDER BY gpr.createdDate DESC
    """)
    List<GitHubPullRequest> findByConnectionAndAuthor(
            @Param("connection") GitHubConnection connection,
            @Param("authorUsername") String authorUsername
    );

    // Find open PRs
    @Query("""
        SELECT gpr FROM GitHubPullRequest gpr 
        WHERE gpr.gitHubConnection.project = :project 
        AND gpr.status = 'OPEN' 
        ORDER BY gpr.createdDate DESC
    """)
    List<GitHubPullRequest> findOpenPRsByProject(@Param("project") Project project);

    // Find merged PRs
    @Query("""
        SELECT gpr FROM GitHubPullRequest gpr 
        WHERE gpr.gitHubConnection.project = :project 
        AND gpr.status = 'CLOSED' 
        AND gpr.mergedDate IS NOT NULL 
        ORDER BY gpr.mergedDate DESC
    """)
    List<GitHubPullRequest> findMergedPRsByProject(@Param("project") Project project);

    // Find PRs with task links
    @Query("""
        SELECT DISTINCT gpr FROM GitHubPullRequest gpr 
        JOIN gpr.taskLinks tl 
        WHERE gpr.gitHubConnection.project = :project 
        ORDER BY gpr.createdDate DESC
    """)
    List<GitHubPullRequest> findPRsWithTaskLinksByProject(@Param("project") Project project);

    // Search PRs by title or description
    @Query("""
        SELECT gpr FROM GitHubPullRequest gpr 
        WHERE gpr.gitHubConnection.project = :project 
        AND (LOWER(gpr.title) LIKE LOWER(CONCAT('%', :searchTerm, '%')) 
             OR LOWER(gpr.description) LIKE LOWER(CONCAT('%', :searchTerm, '%')))
        ORDER BY gpr.createdDate DESC
    """)
    Page<GitHubPullRequest> searchPRs(
            @Param("project") Project project,
            @Param("searchTerm") String searchTerm,
            Pageable pageable
    );

    // Find PRs by base branch
    @Query("""
        SELECT gpr FROM GitHubPullRequest gpr 
        WHERE gpr.gitHubConnection = :connection 
        AND gpr.baseBranch = :baseBranch 
        ORDER BY gpr.createdDate DESC
    """)
    List<GitHubPullRequest> findByConnectionAndBaseBranch(
            @Param("connection") GitHubConnection connection,
            @Param("baseBranch") String baseBranch
    );

    // Find PRs by head branch
    @Query("""
        SELECT gpr FROM GitHubPullRequest gpr 
        WHERE gpr.gitHubConnection = :connection 
        AND gpr.headBranch = :headBranch 
        ORDER BY gpr.createdDate DESC
    """)
    List<GitHubPullRequest> findByConnectionAndHeadBranch(
            @Param("connection") GitHubConnection connection,
            @Param("headBranch") String headBranch
    );

    // Get PR statistics for project
    @Query("""
        SELECT NEW map(
            COUNT(gpr) as totalPRs,
            COUNT(CASE WHEN gpr.status = 'OPEN' THEN 1 END) as openPRs,
            COUNT(CASE WHEN gpr.status = 'CLOSED' AND gpr.mergedDate IS NOT NULL THEN 1 END) as mergedPRs,
            COUNT(CASE WHEN gpr.status = 'CLOSED' AND gpr.mergedDate IS NULL THEN 1 END) as closedPRs,
            COUNT(DISTINCT gpr.authorUsername) as uniqueAuthors,
            AVG(gpr.additions) as avgAdditions,
            AVG(gpr.deletions) as avgDeletions
        ) 
        FROM GitHubPullRequest gpr 
        WHERE gpr.gitHubConnection.project = :project 
        AND gpr.createdDate >= :since
    """)
    Object getPRStatistics(@Param("project") Project project, @Param("since") LocalDateTime since);

    // Find PRs needing task linking
    @Query("""
        SELECT gpr FROM GitHubPullRequest gpr 
        WHERE gpr.gitHubConnection = :connection 
        AND SIZE(gpr.taskLinks) = 0 
        AND gpr.createdDate >= :since
        ORDER BY gpr.createdDate DESC
    """)
    List<GitHubPullRequest> findPRsNeedingTaskLinking(
            @Param("connection") GitHubConnection connection,
            @Param("since") LocalDateTime since
    );

    // Check if PR exists
    boolean existsByGitHubConnectionAndPrNumber(GitHubConnection connection, Integer prNumber);

    // Find stale open PRs
    @Query("""
        SELECT gpr FROM GitHubPullRequest gpr 
        WHERE gpr.gitHubConnection.project = :project 
        AND gpr.status = 'OPEN' 
        AND gpr.updatedDate < :threshold 
        ORDER BY gpr.updatedDate ASC
    """)
    List<GitHubPullRequest> findStaleOpenPRs(@Param("project") Project project, @Param("threshold") LocalDateTime threshold);
}