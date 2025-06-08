import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { authService } from "../../services/authService";
import { useAuthStore } from "../../hooks/useAuthStore";
import type { LoginRequest } from "../../types/auth";

export const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>();

  const onSubmit = async (data: LoginRequest) => {
    setIsLoading(true);
    try {
      const response = await authService.login(data);
      if (response.success && response.data) {
        setAuth(response.data.user, response.data.accessToken);
        toast.success("Welcome back!");
        navigate("/dashboard");
      }
    } catch (error: any) {
      const message = error.response?.data?.message || "Login failed";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome Back" subtitle="Sign in to your DevFlow account">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Input
          {...register("usernameOrEmail", {
            required: "Username or email is required",
          })}
          type="text"
          placeholder="Username or email"
          icon={<Mail className="w-5 h-5" />}
          error={errors.usernameOrEmail?.message}
        />

        <div className="relative">
          <Input
            {...register("password", {
              required: "Password is required",
            })}
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            icon={<Lock className="w-5 h-5" />}
            error={errors.password?.message}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>

        <div className="flex items-center justify-between text-sm">
          <Link
            to="/forgot-password"
            className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" loading={isLoading} size="lg">
          Sign In
        </Button>

        <div className="text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            Sign up
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};
