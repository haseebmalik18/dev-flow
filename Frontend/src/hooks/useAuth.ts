import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "./useAuthStore";
import { authService } from "../services/authService";
import toast from "react-hot-toast";

export const useAuth = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, token, isAuthenticated, setAuth, clearAuth } = useAuthStore();

  const login = useCallback(
    async (credentials: { usernameOrEmail: string; password: string }) => {
      try {
        await queryClient.clear();
        clearAuth();

        const response = await authService.login(credentials);

        if (response.success && response.data) {
          setAuth(response.data.user, response.data.accessToken);
          toast.success("Login successful!");
          navigate("/dashboard");
          return response;
        }
      } catch (error: any) {
        const message = error.response?.data?.message || "Login failed";
        toast.error(message);
        throw error;
      }
    },
    [setAuth, clearAuth, queryClient, navigate]
  );

  const logout = useCallback(async () => {
    clearAuth();

    await queryClient.clear();

    toast.success("Logged out successfully");
    navigate("/login");
  }, [clearAuth, queryClient, navigate]);

  const verifyEmailAndLogin = useCallback(
    async (data: { email: string; code: string }) => {
      try {
        await queryClient.clear();
        clearAuth();

        const response = await authService.verifyEmail(data);

        if (response.success && response.data) {
          setAuth(response.data.user, response.data.accessToken);
          toast.success("Email verified successfully!");
          navigate("/dashboard");
          return response;
        }
      } catch (error: any) {
        const message = error.response?.data?.message || "Verification failed";
        toast.error(message);
        throw error;
      }
    },
    [setAuth, clearAuth, queryClient, navigate]
  );

  return {
    user,
    token,
    isAuthenticated,
    login,
    logout,
    verifyEmailAndLogin,
  };
};
