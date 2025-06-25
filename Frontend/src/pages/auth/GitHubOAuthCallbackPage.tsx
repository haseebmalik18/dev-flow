import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle, XCircle, Github } from "lucide-react";

export const GitHubOAuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"processing" | "success" | "error">(
    "processing"
  );
  const [message, setMessage] = useState("Processing GitHub authorization...");

  useEffect(() => {
    const processCallback = () => {
      try {
        // Get parameters from URL
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");

        console.log("GitHub OAuth callback received:", {
          code: code ? "present" : "missing",
          state: state ? "present" : "missing",
          error,
          errorDescription,
        });

        if (error) {
          // Handle OAuth error
          const errorMsg =
            errorDescription || error || "Unknown error occurred";
          console.error("GitHub OAuth error:", errorMsg);

          setStatus("error");
          setMessage(`Authorization failed: ${errorMsg}`);

          // Send error message to parent window
          if (window.opener) {
            window.opener.postMessage(
              {
                type: "GITHUB_OAUTH_ERROR",
                error: error,
                description: errorDescription,
                message: errorMsg,
              },
              window.location.origin
            );
          }

          // Close popup after showing error briefly
          setTimeout(() => {
            window.close();
          }, 3000);

          return;
        }

        if (!code || !state) {
          const errorMsg = "Missing authorization code or state parameter";
          console.error("GitHub OAuth error:", errorMsg);

          setStatus("error");
          setMessage(errorMsg);

          // Send error message to parent window
          if (window.opener) {
            window.opener.postMessage(
              {
                type: "GITHUB_OAUTH_ERROR",
                error: "missing_parameters",
                description: errorMsg,
                message: errorMsg,
              },
              window.location.origin
            );
          }

          // Close popup after showing error briefly
          setTimeout(() => {
            window.close();
          }, 3000);

          return;
        }

        // Success case
        console.log("GitHub OAuth success, sending data to parent window");

        setStatus("success");
        setMessage("Authorization successful! Closing window...");

        // Send success message to parent window
        if (window.opener) {
          window.opener.postMessage(
            {
              type: "GITHUB_OAUTH_SUCCESS",
              code: code,
              state: state,
            },
            window.location.origin
          );
        }

        // Close popup after brief delay
        setTimeout(() => {
          window.close();
        }, 1000);
      } catch (error) {
        console.error("Error processing GitHub OAuth callback:", error);

        setStatus("error");
        setMessage(
          "An unexpected error occurred while processing the authorization"
        );

        // Send error message to parent window
        if (window.opener) {
          window.opener.postMessage(
            {
              type: "GITHUB_OAUTH_ERROR",
              error: "processing_error",
              description: "An unexpected error occurred",
              message:
                "An unexpected error occurred while processing the authorization",
            },
            window.location.origin
          );
        }

        // Close popup after showing error briefly
        setTimeout(() => {
          window.close();
        }, 3000);
      }
    };

    // Small delay to ensure component is mounted
    const timer = setTimeout(processCallback, 100);

    return () => clearTimeout(timer);
  }, [searchParams]);

  // Fallback: if window doesn't close automatically, provide manual close button
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      if (status !== "processing") {
        const closeButton = document.getElementById("manual-close");
        if (closeButton) {
          closeButton.style.display = "block";
        }
      }
    }, 5000);

    return () => clearTimeout(fallbackTimer);
  }, [status]);

  const handleManualClose = () => {
    window.close();
  };

  const getStatusIcon = () => {
    switch (status) {
      case "processing":
        return <Loader2 className="w-8 h-8 animate-spin text-blue-600" />;
      case "success":
        return <CheckCircle className="w-8 h-8 text-green-600" />;
      case "error":
        return <XCircle className="w-8 h-8 text-red-600" />;
      default:
        return <Loader2 className="w-8 h-8 animate-spin text-blue-600" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "processing":
        return "text-blue-600";
      case "success":
        return "text-green-600";
      case "error":
        return "text-red-600";
      default:
        return "text-blue-600";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <Github className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            GitHub Authorization
          </h1>
        </div>

        <div className="mb-6">
          <div className="flex justify-center mb-4">{getStatusIcon()}</div>
          <p className={`text-lg font-medium ${getStatusColor()}`}>{message}</p>
        </div>

        {status === "success" && (
          <div className="text-sm text-gray-600 mb-4">
            You can close this window and return to DevFlow.
          </div>
        )}

        {status === "error" && (
          <div className="text-sm text-gray-600 mb-4">
            Please try the authorization process again.
          </div>
        )}

        <button
          id="manual-close"
          onClick={handleManualClose}
          className="hidden bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Close Window
        </button>

        <div className="mt-6 text-xs text-gray-500">
          If this window doesn't close automatically, you can close it manually.
        </div>
      </div>
    </div>
  );
};
