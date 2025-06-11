

package com.devflow.backend.controller;

import com.devflow.backend.dto.common.ApiResponse;
import com.devflow.backend.entity.User;
import com.devflow.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;


    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> searchUsers(
            @RequestParam String query,
            @RequestParam(required = false) Long excludeProjectId,
            @RequestParam(defaultValue = "10") int limit,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        List<Map<String, Object>> users = userService.searchUsersForInvitation(query, excludeProjectId, limit, user);

        return ResponseEntity.ok(ApiResponse.success("Users retrieved successfully", users));
    }


    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getUserProfile(
            @RequestParam String identifier,
            Authentication authentication) {

        User currentUser = (User) authentication.getPrincipal();
        Map<String, Object> userProfile = userService.getUserProfileByIdentifier(identifier, currentUser);

        return ResponseEntity.ok(ApiResponse.success("User profile retrieved successfully", userProfile));
    }


    @GetMapping("/check-email")
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkEmailExists(
            @RequestParam String email) {

        boolean exists = userService.emailExists(email);
        Map<String, Object> result = Map.of(
                "email", email,
                "exists", exists,
                "message", exists ? "User already has an account" : "User will be invited to create an account"
        );

        return ResponseEntity.ok(ApiResponse.success("Email check completed", result));
    }
}