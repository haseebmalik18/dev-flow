import React, { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Button } from "../../components/ui/Button";
import { authService } from "../../services/authService";
import { useAuth } from "../../hooks/useAuth";
import { VerificationCodeInput } from "../../components/ui/VerificationCodeInput";

export const VerifyEmailPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [codeError, setCodeError] = useState("");

  const location = useLocation();
  const email = location.state?.email || "";
  const { verifyEmailAndLogin } = useAuth();

  const submissionController = useRef<AbortController | null>(null);
  const isSubmitting = useRef(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  useEffect(() => {
    return () => {
      if (submissionController.current) {
        submissionController.current.abort();
      }
    };
  }, []);

  const handleCodeComplete = async (code: string) => {
    if (isSubmitting.current || isLoading) {
      console.warn("Verification already in progress");
      return;
    }

    if (submissionController.current) {
      submissionController.current.abort();
    }

    submissionController.current = new AbortController();
    isSubmitting.current = true;
    setIsLoading(true);
    setCodeError("");

    try {
      await verifyEmailAndLogin({ email, code });
    } catch (error: any) {
      if (!submissionController.current?.signal.aborted) {
        const message =
          error.response?.data?.message || "Invalid verification code";
        setCodeError(message);
      }
    } finally {
      if (!submissionController.current?.signal.aborted) {
        isSubmitting.current = false;
        setIsLoading(false);
      }
    }
  };

  const handleResend = async () => {
    if (!canResend || !email || isResending) return;

    setIsResending(true);
    try {
      const response = await authService.resendVerification({ email });
      if (response.success) {
        toast.success("New verification code sent!");
        setCanResend(false);
        setCountdown(60);
        setCodeError("");

        if (submissionController.current) {
          submissionController.current.abort();
        }
        isSubmitting.current = false;
        setIsLoading(false);
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
      subtitle="Check your inbox and enter the code below"
    >
      <div className="space-y-8">
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <p className="text-gray-700 font-medium">
              We've sent a verification code to
            </p>
            <p className="text-blue-600 font-semibold bg-blue-50 px-4 py-2 rounded-lg inline-block">
              {email}
            </p>
            <p className="text-sm text-gray-500">
              Enter the 6-digit code to verify your account
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <VerificationCodeInput
            onComplete={handleCodeComplete}
            error={codeError}
            disabled={isLoading}
          />

          {isLoading && (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 text-blue-600">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium">Verifying code...</span>
              </div>
            </div>
          )}
        </div>

        <div className="text-center space-y-4 pt-4 border-t border-gray-100">
          <p className="text-gray-600 text-sm">Didn't receive the code?</p>

          {canResend ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleResend}
              loading={isResending}
              disabled={isLoading}
              icon={<RefreshCw className="w-4 h-4" />}
              className="text-blue-600 border-blue-600 hover:bg-blue-600 hover:text-white font-medium"
            >
              Resend Code
            </Button>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-500 rounded-md text-sm">
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              <span>Resend in {countdown}s</span>
            </div>
          )}
        </div>

        <div className="text-center pt-4">
          <Link
            to="/login"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};
