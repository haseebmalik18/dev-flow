// GitHubCommitTaskLinkRepository.java
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
public interface GitHubCommitTaskLinkRepository extends JpaRepository<GitHubCommitTaskLink, Long> {

    // Find links by commit
    List<GitHubCommitTaskLink> findByGitHubCommit(GitHubCommit commit);

    // Find links by task
    List<GitHubCommitTaskLink> findByTask(Task task);

    // Find link by commit and task
    Optional<GitHubCommitTaskLink> findByGitHubCommitAndTask(GitHubCommit commit, Task task);

    // Find links by project
    @Query("""
        SELECT ctl FROM GitHubCommitTaskLink ctl 
        WHERE ctl.task.project = :project 
        ORDER BY ctl.createdAt DESC
    """)
    List<GitHubCommitTaskLink> findByProject(@Param("project") Project project);

    // Find links by link type
    List<GitHubCommitTaskLink> findByLinkType(GitHubLinkType linkType);

    // Find recent links
    @Query("""
        SELECT ctl FROM GitHubCommitTaskLink ctl 
        WHERE ctl.task.project = :project 
        AND ctl.createdAt >= :since 
        ORDER BY ctl.createdAt DESC
    """)
    List<GitHubCommitTaskLink> findRecentLinks(@Param("project") Project project, @Param("since") LocalDateTime since);

    // Check if link exists
    boolean existsByGitHubCommitAndTask(GitHubCommit commit, Task task);

    // Get link statistics
    @Query("""
        SELECT NEW map(
            COUNT(ctl) as totalLinks,
            COUNT(CASE WHEN ctl.linkType = 'REFERENCE' THEN 1 END) as references,
            COUNT(CASE WHEN ctl.linkType = 'CLOSES' THEN 1 END) as closes,
            COUNT(CASE WHEN ctl.linkType = 'FIXES' THEN 1 END) as fixes,
            COUNT(CASE WHEN ctl.linkType = 'RESOLVES' THEN 1 END) as resolves
        ) 
        FROM GitHubCommitTaskLink ctl 
        WHERE ctl.task.project = :project
    """)
    Object getLinkStatistics(@Param("project") Project project);

    // Find tasks with multiple commit links
    @Query("""
        SELECT ctl.task, COUNT(ctl) as linkCount 
        FROM GitHubCommitTaskLink ctl 
        WHERE ctl.task.project = :project 
        GROUP BY ctl.task 
        HAVING COUNT(ctl) > 1 
        ORDER BY linkCount DESC
    """)
    List<Object[]> findTasksWithMultipleCommitLinks(@Param("project") Project project);
}