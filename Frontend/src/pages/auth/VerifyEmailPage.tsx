import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Mail, RefreshCw, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { authService } from "../../services/authService";
import { VerifyEmailRequest } from "../../types/auth";

export const VerifyEmailPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || "";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyEmailRequest>({
    defaultValues: { email },
  });

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const onSubmit = async (data: VerifyEmailRequest) => {
    setIsLoading(true);
    try {
      const response = await authService.verifyEmail(data);
      if (response.success) {
        toast.success("Email verified successfully!");
        navigate("/login");
      }
    } catch (error: any) {
      const message = error.response?.data?.message || "Verification failed";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || !email) return;

    setIsResending(true);
    try {
      const response = await authService.resendVerification({ email });
      if (response.success) {
        toast.success("Verification code sent!");
        setCanResend(false);
        setCountdown(60);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to resend code";
      toast.error(message);
    } finally {
      setIsResending(false);
    }
  };

  if (!email) {
    return (
      <AuthLayout
        title="Email Required"
        subtitle="Please provide your email address"
      >
        <div className="text-center space-y-4">
          <p className="text-gray-600">
            We need your email address to send a verification code.
          </p>
          <Link to="/register">
            <Button variant="primary">Go to Registration</Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Verify Your Email"
      subtitle={`We've sent a 6-digit code to ${email}`}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>

          <p className="text-gray-600 text-sm">
            Enter the 6-digit verification code sent to your email
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
            required: "Verification code is required",
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

        <Button
          type="submit"
          className="w-full"
          loading={isLoading}
          size="lg"
          icon={<CheckCircle className="w-5 h-5" />}
        >
          Verify Email
        </Button>

        <div className="text-center space-y-2">
          <p className="text-gray-600 text-sm">Didn't receive the code?</p>

          <Button
            type="button"
            variant="ghost"
            onClick={handleResend}
            disabled={!canResend}
            loading={isResending}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            {canResend ? "Resend Code" : `Resend in ${countdown}s`}
          </Button>
        </div>

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
