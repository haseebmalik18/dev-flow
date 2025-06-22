// GitHubPRTaskLinkRepository.java
package com.devflow.backend.repository;

import com.devflow.backend.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface GitHubPRTaskLinkRepository extends JpaRepository<GitHubPRTaskLink, Long> {

    // Find links by PR
    List<GitHubPRTaskLink> findByGitHubPullRequest(GitHubPullRequest pullRequest);

    // Find links by task
    List<GitHubPRTaskLink> findByTask(Task task);

    // Find link by PR and task
    Optional<GitHubPRTaskLink> findByGitHubPullRequestAndTask(GitHubPullRequest pullRequest, Task task);

    // Find links by project
    @Query("""
        SELECT ptl FROM GitHubPRTaskLink ptl 
        WHERE ptl.task.project = :project 
        ORDER BY ptl.createdAt DESC
    """)
    List<GitHubPRTaskLink> findByProject(@Param("project") Project project);

    // Find links by link type
    List<GitHubPRTaskLink> findByLinkType(GitHubLinkType linkType);

    // Find links with auto status update enabled
    @Query("""
        SELECT ptl FROM GitHubPRTaskLink ptl 
        WHERE ptl.autoStatusUpdate = true 
        AND ptl.task.project = :project
    """)
    List<GitHubPRTaskLink> findLinksWithAutoStatusUpdate(@Param("project") Project project);

    // Find recent links
    @Query("""
        SELECT ptl FROM GitHubPRTaskLink ptl 
        WHERE ptl.task.project = :project 
        AND ptl.createdAt >= :since 
        ORDER BY ptl.createdAt DESC
    """)
    List<GitHubPRTaskLink> findRecentLinks(@Param("project") Project project, @Param("since") LocalDateTime since);

    // Check if link exists
    boolean existsByGitHubPullRequestAndTask(GitHubPullRequest pullRequest, Task task);

    // Get link statistics
    @Query("""
        SELECT NEW map(
            COUNT(ptl) as totalLinks,
            COUNT(CASE WHEN ptl.linkType = 'REFERENCE' THEN 1 END) as references,
            COUNT(CASE WHEN ptl.linkType = 'CLOSES' THEN 1 END) as closes,
            COUNT(CASE WHEN ptl.linkType = 'FIXES' THEN 1 END) as fixes,
            COUNT(CASE WHEN ptl.linkType = 'RESOLVES' THEN 1 END) as resolves,
            COUNT(CASE WHEN ptl.autoStatusUpdate = true THEN 1 END) as autoUpdateEnabled
        ) 
        FROM GitHubPRTaskLink ptl 
        WHERE ptl.task.project = :project
    """)
    Object getLinkStatistics(@Param("project") Project project);

    // Find tasks with multiple PR links
    @Query("""
        SELECT ptl.task, COUNT(ptl) as linkCount 
        FROM GitHubPRTaskLink ptl 
        WHERE ptl.task.project = :project 
        GROUP BY ptl.task 
        HAVING COUNT(ptl) > 1 
        ORDER BY linkCount DESC
    """)
    List<Object[]> findTasksWithMultiplePRLinks(@Param("project") Project project);
};