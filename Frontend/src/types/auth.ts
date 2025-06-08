export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: string;
  isVerified: boolean;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  user: User;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  timestamp: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
}
