import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Lock, Eye, EyeOff, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { authService } from "../../services/authService";
import { RegisterRequest } from "../../types/auth";

export const RegisterPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterRequest>();

  const onSubmit = async (data: RegisterRequest) => {
    setIsLoading(true);
    try {
      const response = await authService.register(data);
      if (response.success) {
        toast.success(
          "Registration successful! Check your email for verification code."
        );
        navigate("/verify-email", { state: { email: data.email } });
      }
    } catch (error: any) {
      const message = error.response?.data?.message || "Registration failed";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Join DevFlow and start managing projects intelligently"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Input
            {...register("firstName", {
              required: "First name is required",
              minLength: { value: 2, message: "At least 2 characters" },
            })}
            type="text"
            placeholder="First name"
            icon={<User className="w-5 h-5" />}
            error={errors.firstName?.message}
          />

          <Input
            {...register("lastName", {
              required: "Last name is required",
              minLength: { value: 2, message: "At least 2 characters" },
            })}
            type="text"
            placeholder="Last name"
            icon={<User className="w-5 h-5" />}
            error={errors.lastName?.message}
          />
        </div>

        <Input
          {...register("username", {
            required: "Username is required",
            minLength: { value: 3, message: "At least 3 characters" },
            pattern: {
              value: /^[a-zA-Z0-9_]+$/,
              message: "Only letters, numbers, and underscores allowed",
            },
          })}
          type="text"
          placeholder="Username"
          icon={<UserPlus className="w-5 h-5" />}
          error={errors.username?.message}
        />

        <Input
          {...register("email", {
            required: "Email is required",
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: "Invalid email address",
            },
          })}
          type="email"
          placeholder="Email address"
          icon={<Mail className="w-5 h-5" />}
          error={errors.email?.message}
        />

        <div className="relative">
          <Input
            {...register("password", {
              required: "Password is required",
              minLength: { value: 6, message: "At least 6 characters" },
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

        <Button type="submit" className="w-full" loading={isLoading} size="lg">
          Create Account
        </Button>

        <div className="text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            Sign in
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};
