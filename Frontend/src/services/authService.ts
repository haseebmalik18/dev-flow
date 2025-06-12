import api from "../config/api";
import type {
  RegisterRequest,
  LoginRequest,
  VerifyEmailRequest,
  ResendVerificationRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  AuthResponse,
  User,
  ApiResponse,
} from "../types/auth";

export const authService = {
  register: async (data: RegisterRequest): Promise<ApiResponse<User>> => {
    const response = await api.post("/auth/register", data);
    return response.data;
  },

  login: async (data: LoginRequest): Promise<ApiResponse<AuthResponse>> => {
    const response = await api.post("/auth/login", data);
    return response.data;
  },

  verifyEmail: async (
    data: VerifyEmailRequest
  ): Promise<ApiResponse<AuthResponse>> => {
    const response = await api.post("/auth/verify-email", data);
    return response.data;
  },

  resendVerification: async (
    data: ResendVerificationRequest
  ): Promise<ApiResponse<void>> => {
    const response = await api.post("/auth/resend-verification", data);
    return response.data;
  },

  forgotPassword: async (
    data: ForgotPasswordRequest
  ): Promise<ApiResponse<void>> => {
    const response = await api.post("/auth/forgot-password", data);
    return response.data;
  },

  resetPassword: async (
    data: ResetPasswordRequest
  ): Promise<ApiResponse<void>> => {
    const response = await api.post("/auth/reset-password", data);
    return response.data;
  },

  logout: async (): Promise<ApiResponse<void>> => {
    try {
      const response = await api.post("/auth/logout");
      return response.data;
    } catch (error) {
      return {
        success: true,
        message: "Logged out locally",
        timestamp: new Date().toISOString(),
      };
    }
  },
};
