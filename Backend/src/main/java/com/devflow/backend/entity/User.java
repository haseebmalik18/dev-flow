
package com.devflow.backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "users")
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(min = 3, max = 50)
    @Column(unique = true, nullable = false)
    private String username;

    @NotBlank
    @Email
    @Column(unique = true, nullable = false)
    private String email;

    @NotBlank
    @Size(min = 6)
    @Column(nullable = false)
    private String password;

    @NotBlank
    @Size(min = 2, max = 100)
    @Column(nullable = false)
    private String firstName;

    @NotBlank
    @Size(min = 2, max = 100)
    @Column(nullable = false)
    private String lastName;

    @Column
    private String avatar;

    @Column
    private String jobTitle;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false)
    private Role role = Role.MEMBER;

    @Getter
    @Builder.Default
    @Column(nullable = false)
    private Boolean isVerified = false;

    @Getter
    @Builder.Default
    @Column(nullable = false)
    private Boolean isActive = true;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }


    public String getFullName() {
        return firstName + " " + lastName;
    }

    public String getInitials() {
        return (firstName.substring(0, 1) + lastName.substring(0, 1)).toUpperCase();
    }


    public boolean canUserManageProject() {
        return this.role == Role.ADMIN || this.role == Role.MANAGER;
    }

    public boolean canUserManageMembers() {
        return this.role == Role.ADMIN || this.role == Role.MANAGER;
    }


    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return isActive;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return isVerified && isActive;
    }
    public void setIsVerified(Boolean isVerified) {
        this.isVerified = isVerified;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }
}