package com.devflow.backend.repository;

import com.devflow.backend.entity.Task;
import com.devflow.backend.entity.TaskAttachment;
import com.devflow.backend.entity.User;
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
public interface TaskAttachmentRepository extends JpaRepository<TaskAttachment, Long> {


    List<TaskAttachment> findByTaskAndIsDeletedFalseOrderByCreatedAtDesc(Task task);


    Page<TaskAttachment> findByUploadedByAndIsDeletedFalseOrderByCreatedAtDesc(User user, Pageable pageable);


    Optional<TaskAttachment> findByIdAndIsDeletedFalse(Long id);

    Optional<TaskAttachment> findByS3KeyAndIsDeletedFalse(String s3Key);


    long countByTaskAndIsDeletedFalse(Task task);


    @Query("SELECT COALESCE(SUM(ta.fileSize), 0) FROM TaskAttachment ta WHERE ta.task = :task AND ta.isDeleted = false")
    Long getTotalFileSizeByTask(@Param("task") Task task);


    @Query("SELECT COALESCE(SUM(ta.fileSize), 0) FROM TaskAttachment ta WHERE ta.uploadedBy = :user AND ta.isDeleted = false")
    Long getTotalFileSizeByUser(@Param("user") User user);


    @Query("SELECT ta FROM TaskAttachment ta WHERE ta.urlExpiresAt < :now AND ta.isDeleted = false")
    List<TaskAttachment> findAttachmentsWithExpiredUrls(@Param("now") LocalDateTime now);


    List<TaskAttachment> findByTaskAndContentTypeStartingWithAndIsDeletedFalseOrderByCreatedAtDesc(
            Task task, String contentTypePrefix);


    @Query("""
        SELECT ta FROM TaskAttachment ta 
        WHERE ta.task = :task 
        AND ta.isDeleted = false 
        AND (LOWER(ta.fileName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) 
             OR LOWER(ta.originalFileName) LIKE LOWER(CONCAT('%', :searchTerm, '%')))
        ORDER BY ta.createdAt DESC
    """)
    List<TaskAttachment> searchAttachmentsByTask(@Param("task") Task task, @Param("searchTerm") String searchTerm);


    @Query("""
        SELECT new map(
            COUNT(ta) as totalCount,
            COALESCE(SUM(ta.fileSize), 0) as totalSize,
            COUNT(CASE WHEN ta.contentType LIKE 'image/%' THEN 1 END) as imageCount,
            COUNT(CASE WHEN ta.contentType IN ('application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain') THEN 1 END) as documentCount,
            COUNT(CASE WHEN ta.contentType IN ('application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed') THEN 1 END) as archiveCount
        )
        FROM TaskAttachment ta 
        WHERE ta.task = :task 
        AND ta.isDeleted = false
    """)
    Object getAttachmentStatsByTask(@Param("task") Task task);


    @Query("""
        SELECT new map(
            COUNT(ta) as totalCount,
            COALESCE(SUM(ta.fileSize), 0) as totalSize,
            COUNT(CASE WHEN ta.contentType LIKE 'image/%' THEN 1 END) as imageCount,
            COUNT(CASE WHEN ta.contentType IN ('application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain') THEN 1 END) as documentCount,
            COUNT(CASE WHEN ta.contentType IN ('application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed') THEN 1 END) as archiveCount
        )
        FROM TaskAttachment ta 
        WHERE ta.uploadedBy = :user 
        AND ta.isDeleted = false
    """)
    Object getAttachmentStatsByUser(@Param("user") User user);


    @Query("""
        SELECT ta FROM TaskAttachment ta 
        JOIN ta.task t 
        JOIN t.project p 
        LEFT JOIN p.members pm 
        WHERE (p.owner = :user OR pm.user = :user)
        AND ta.isDeleted = false 
        AND ta.createdAt >= :since
        ORDER BY ta.createdAt DESC
    """)
    Page<TaskAttachment> findRecentAttachmentsByUserProjects(
            @Param("user") User user,
            @Param("since") LocalDateTime since,
            Pageable pageable);


    @Modifying
    @Query("DELETE FROM TaskAttachment ta WHERE ta.isDeleted = true AND ta.deletedAt < :cutoff")
    void deleteOldDeletedAttachments(@Param("cutoff") LocalDateTime cutoff);


    @Modifying
    @Query("UPDATE TaskAttachment ta SET ta.s3Url = :url, ta.urlExpiresAt = :expiresAt WHERE ta.id = :id")
    void updateAttachmentUrl(@Param("id") Long id, @Param("url") String url, @Param("expiresAt") LocalDateTime expiresAt);

    @Query("""
        SELECT COUNT(ta) > 0 FROM TaskAttachment ta 
        JOIN ta.task t 
        JOIN t.project p 
        LEFT JOIN p.members pm 
        WHERE ta.id = :attachmentId 
        AND (p.owner = :user OR pm.user = :user OR ta.uploadedBy = :user)
        AND ta.isDeleted = false
    """)
    boolean hasUserAccessToAttachment(@Param("user") User user, @Param("attachmentId") Long attachmentId);
}