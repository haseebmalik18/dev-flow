

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
public interface CommentRepository extends JpaRepository<Comment, Long> {


    List<Comment> findByTaskOrderByCreatedAtAsc(Task task);

    List<Comment> findByProjectOrderByCreatedAtDesc(Project project);


    List<Comment> findByParentCommentOrderByCreatedAtAsc(Comment parentComment);

    @Query("""
        SELECT c FROM Comment c 
        WHERE c.project = :project 
        AND c.createdAt >= :since
        ORDER BY c.createdAt DESC
    """)
    List<Comment> findRecentCommentsByProject(@Param("project") Project project, @Param("since") LocalDateTime since);


    @Query("""
        SELECT c FROM Comment c 
        JOIN c.mentionedUsers mu 
        WHERE mu = :user 
        ORDER BY c.createdAt DESC
    """)
    List<Comment> findCommentsMentioningUser(@Param("user") User user);


    long countByTask(Task task);


    long countByProject(Project project);


    List<Comment> findByTaskAndParentCommentIsNullOrderByCreatedAtAsc(Task task);


    @Query("""
        SELECT c FROM Comment c 
        WHERE (c.task.project = :project OR c.project = :project)
        AND LOWER(c.content) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
        ORDER BY c.createdAt DESC
    """)
    List<Comment> searchCommentsByProject(@Param("project") Project project, @Param("searchTerm") String searchTerm);
}
