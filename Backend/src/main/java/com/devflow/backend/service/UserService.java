

package com.devflow.backend.service;

import com.devflow.backend.entity.Project;
import com.devflow.backend.entity.User;
import com.devflow.backend.repository.ProjectMemberRepository;
import com.devflow.backend.repository.ProjectRepository;
import com.devflow.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;

    public List<Map<String, Object>> searchUsersForInvitation(String query, Long excludeProjectId, int limit, User currentUser) {
        List<User> users = userRepository.searchUsers(query, PageRequest.of(0, limit));

        return users.stream()
                .filter(user -> !user.equals(currentUser))
                .filter(user -> excludeProjectId == null || !isUserMemberOfProject(user, excludeProjectId))
                .map(this::mapUserForInvitation)
                .collect(Collectors.toList());
    }

    public Map<String, Object> getUserProfileByIdentifier(String identifier, User currentUser) {
        User user = userRepository.findByUsernameOrEmail(identifier, identifier)
                .orElse(null);

        if (user == null) {
            return Map.of(
                    "exists", false,
                    "identifier", identifier,
                    "message", "User not found"
            );
        }

        Map<String, Object> profile = new HashMap<>();
        profile.put("exists", true);
        profile.put("id", user.getId());
        profile.put("username", user.getUsername());
        profile.put("email", user.getEmail());
        profile.put("firstName", user.getFirstName());
        profile.put("lastName", user.getLastName());
        profile.put("fullName", user.getFullName());
        profile.put("avatar", user.getAvatar());
        profile.put("jobTitle", user.getJobTitle());
        profile.put("isVerified", user.getIsVerified());

        return profile;
    }

    public boolean emailExists(String email) {
        return userRepository.existsByEmail(email);
    }

    public List<Map<String, Object>> getMentionableUsersInProject(Long projectId, String search, User currentUser) {
        Project project = projectRepository.findById(projectId).orElse(null);
        if (project == null || !projectRepository.hasUserAccessToProject(currentUser, projectId)) {
            return List.of();
        }

        return projectMemberRepository.findByProjectOrderByJoinedAtAsc(project)
                .stream()
                .map(member -> member.getUser())
                .filter(user -> search == null || search.isEmpty() ||
                        user.getFullName().toLowerCase().contains(search.toLowerCase()) ||
                        user.getUsername().toLowerCase().contains(search.toLowerCase()))
                .map(this::mapUserForMention)
                .collect(Collectors.toList());
    }

    private boolean isUserMemberOfProject(User user, Long projectId) {
        Project project = projectRepository.findById(projectId).orElse(null);
        return project != null && projectMemberRepository.existsByProjectAndUser(project, user);
    }

    private Map<String, Object> mapUserForInvitation(User user) {
        Map<String, Object> userMap = new HashMap<>();
        userMap.put("id", user.getId());
        userMap.put("username", user.getUsername());
        userMap.put("email", user.getEmail());
        userMap.put("firstName", user.getFirstName());
        userMap.put("lastName", user.getLastName());
        userMap.put("fullName", user.getFullName());
        userMap.put("initials", user.getInitials());
        userMap.put("avatar", user.getAvatar());
        userMap.put("jobTitle", user.getJobTitle());
        userMap.put("isVerified", user.getIsVerified());
        return userMap;
    }

    private Map<String, Object> mapUserForMention(User user) {
        Map<String, Object> userMap = new HashMap<>();
        userMap.put("id", user.getId());
        userMap.put("username", user.getUsername());
        userMap.put("displayName", user.getFullName());
        userMap.put("avatar", user.getAvatar());
        return userMap;
    }
}