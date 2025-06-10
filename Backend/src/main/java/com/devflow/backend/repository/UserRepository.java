package com.devflow.backend.repository;

import com.devflow.backend.entity.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    Optional<User> findByUsernameOrEmail(String username, String email);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    @Query("""
    SELECT u FROM User u 
    WHERE LOWER(u.username) LIKE LOWER(CONCAT('%', :search, '%')) 
    OR LOWER(u.firstName) LIKE LOWER(CONCAT('%', :search, '%')) 
    OR LOWER(u.lastName) LIKE LOWER(CONCAT('%', :search, '%'))
    ORDER BY u.firstName, u.lastName
""")
    List<User> searchUsers(@Param("search") String search, Pageable pageable);

    @Query("SELECT u FROM User u WHERE u.isActive = true AND u.isVerified = true")
    Optional<User> findActiveVerifiedUser(String usernameOrEmail);
}