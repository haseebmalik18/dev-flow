package com.devflow.backend.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

public class AuthDTOs {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RegisterRequest {
        @NotBlank(message = "Username is required")
        @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
        private String username;

        @NotBlank(message = "Email is required")
        @Email(message = "Email should be valid")
        private String email;

        @NotBlank(message = "Password is required")
        @Size(min = 6, message = "Password must be at least 6 characters")
        private String password;

        @NotBlank(message = "First name is required")
        @Size(min = 2, max = 100, message = "First name must be between 2 and 100 characters")
        private String firstName;

        @NotBlank(message = "Last name is required")
        @Size(min = 2, max = 100, message = "Last name must be between 2 and 100 characters")
        private String lastName;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LoginRequest {
        @NotBlank(message = "Username or email is required")
        private String usernameOrEmail;

        @NotBlank(message = "Password is required")
        private String password;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VerifyEmailRequest {
        @NotBlank(message = "Email is required")
        @Email(message = "Email should be valid")
        private String email;

        @NotBlank(message = "Verification code is required")
        @Size(min = 6, max = 6, message = "Verification code must be 6 characters")
        private String code;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResendVerificationRequest {
        @NotBlank(message = "Email is required")
        @Email(message = "Email should be valid")
        private String email;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ForgotPasswordRequest {
        @NotBlank(message = "Email is required")
        @Email(message = "Email should be valid")
        private String email;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResetPasswordRequest {
        @NotBlank(message = "Email is required")
        @Email(message = "Email should be valid")
        private String email;

        @NotBlank(message = "Verification code is required")
        @Size(min = 6, max = 6, message = "Verification code must be 6 characters")
        private String code;

        @NotBlank(message = "New password is required")
        @Size(min = 6, message = "Password must be at least 6 characters")
        private String newPassword;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AuthResponse {
        private String accessToken;
        private String tokenType = "Bearer";
        private UserInfo user;

        public AuthResponse(String accessToken, UserInfo user) {
            this.accessToken = accessToken;
            this.user = user;
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserInfo {
        private Long id;
        private String username;
        private String email;
        private String firstName;
        private String lastName;
        private String avatar;
        private String role;
        private Boolean isVerified;
    }
}