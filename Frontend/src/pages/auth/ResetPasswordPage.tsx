import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { authService } from "../../services/authService";
import { ResetPasswordRequest } from "../../types/auth";

export const ResetPasswordPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || "";

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ResetPasswordRequest>({
    defaultValues: { email },
  });

  const watchNewPassword = watch("newPassword");

  const onSubmit = async (data: ResetPasswordRequest) => {
    setIsLoading(true);
    try {
      const response = await authService.resetPassword(data);
      if (response.success) {
        toast.success("Password reset successfully!");
        navigate("/login");
      }
    } catch (error: any) {
      const message = error.response?.data?.message || "Password reset failed";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!email) {
    return (
      <AuthLayout
        title="Email Required"
        subtitle="Please start from forgot password"
      >
        <div className="text-center space-y-4">
          <p className="text-gray-600">
            You need to request a reset code first.
          </p>
          <Link to="/forgot-password">
            <Button variant="primary">Forgot Password</Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Enter the code and your new password"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>

          <p className="text-gray-600 text-sm">
            Check your email for the 6-digit reset code
          </p>
        </div>

        <Input
          {...register("email")}
          type="email"
          value={email}
          disabled
          className="bg-gray-50"
        />

        <Input
          {...register("code", {
            required: "Reset code is required",
            pattern: {
              value: /^\d{6}$/,
              message: "Code must be 6 digits",
            },
          })}
          type="text"
          placeholder="000000"
          maxLength={6}
          className="text-center text-2xl tracking-widest font-mono"
          error={errors.code?.message}
        />

        <div className="relative">
          <Input
            {...register("newPassword", {
              required: "New password is required",
              minLength: { value: 6, message: "At least 6 characters" },
            })}
            type={showPassword ? "text" : "password"}
            placeholder="New password"
            icon={<Lock className="w-5 h-5" />}
            error={errors.newPassword?.message}
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

        {watchNewPassword && (
          <div className="space-y-2">
            <div className="text-sm text-gray-600">Password strength:</div>
            <div className="flex space-x-1">
              <div
                className={`h-2 w-full rounded ${
                  watchNewPassword.length >= 6 ? "bg-green-500" : "bg-gray-200"
                }`}
              />
              <div
                className={`h-2 w-full rounded ${
                  watchNewPassword.length >= 8 ? "bg-green-500" : "bg-gray-200"
                }`}
              />
              <div
                className={`h-2 w-full rounded ${
                  /[A-Z]/.test(watchNewPassword)
                    ? "bg-green-500"
                    : "bg-gray-200"
                }`}
              />
              <div
                className={`h-2 w-full rounded ${
                  /[0-9]/.test(watchNewPassword)
                    ? "bg-green-500"
                    : "bg-gray-200"
                }`}
              />
            </div>
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          loading={isLoading}
          size="lg"
          icon={<CheckCircle className="w-5 h-5" />}
        >
          Reset Password
        </Button>

        <div className="text-center text-sm text-gray-600">
          <Link
            to="/login"
            className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            Back to Sign In
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};
