import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Send, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { authService } from "../../services/authService";
import type { ForgotPasswordRequest } from "../../types/auth";

export const ForgotPasswordPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordRequest>();

  const onSubmit = async (data: ForgotPasswordRequest) => {
    setIsLoading(true);
    try {
      const response = await authService.forgotPassword(data);
      if (response.success) {
        toast.success("Reset code sent to your email!");
        navigate("/reset-password", { state: { email: data.email } });
      }
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Failed to send reset code";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Forgot Password"
      subtitle="Enter your email to receive a reset code"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>

          <p className="text-gray-600 text-sm">
            We'll send you a 6-digit code to reset your password
          </p>
        </div>

        <Input
          {...register("email", {
            required: "Email is required",
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: "Invalid email address",
            },
          })}
          type="email"
          placeholder="Enter your email"
          icon={<Mail className="w-5 h-5" />}
          error={errors.email?.message}
        />

        <Button
          type="submit"
          className="w-full"
          loading={isLoading}
          size="lg"
          icon={<Send className="w-5 h-5" />}
        >
          Send Reset Code
        </Button>

        <div className="text-center space-y-4">
          <Link
            to="/login"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Sign In
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};
