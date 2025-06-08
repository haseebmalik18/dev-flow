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
public interface ProjectMemberRepository extends JpaRepository<ProjectMember, Long> {


    List<ProjectMember> findByProjectOrderByJoinedAtAsc(Project project);


    List<ProjectMember> findByUserOrderByJoinedAtDesc(User user);


    Optional<ProjectMember> findByProjectAndUser(Project project, User user);


    boolean existsByProjectAndUser(Project project, User user);


    List<ProjectMember> findByProjectAndRole(Project project, ProjectRole role);


    long countByProject(Project project);


    @Query("""
        SELECT pm FROM ProjectMember pm 
        WHERE pm.project = :project 
        AND pm.role IN ('OWNER', 'ADMIN')
    """)
    List<ProjectMember> findProjectManagers(@Param("project") Project project);


    @Query("""
        SELECT pm.role FROM ProjectMember pm 
        WHERE pm.project = :project AND pm.user = :user
    """)
    Optional<ProjectRole> findUserRoleInProject(@Param("project") Project project, @Param("user") User user);

    void deleteByProjectAndUser(Project project, User user);
}