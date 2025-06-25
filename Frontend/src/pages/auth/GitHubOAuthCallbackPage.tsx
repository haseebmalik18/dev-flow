// Frontend/src/pages/auth/GitHubOAuthCallbackPage.tsx
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Github, CheckCircle, X, AlertTriangle } from "lucide-react";

export const GitHubOAuthCallbackPage: React.FC = () => {
  const location = useLocation();
  const [status, setStatus] = useState<"processing" | "success" | "error">(
    "processing"
  );
  const [message, setMessage] = useState("Processing GitHub authorization...");

  useEffect(() => {
    const handleCallback = () => {
      try {
        const urlParams = new URLSearchParams(location.search);
        const code = urlParams.get("code");
        const state = urlParams.get("state");
        const error = urlParams.get("error");
        const errorDescription = urlParams.get("error_description");

        // Check if we're in a popup window
        const isPopup = window.opener && window.opener !== window;

        if (error) {
          setStatus("error");
          setMessage(errorDescription || "GitHub authorization failed");

          if (isPopup) {
            window.opener.postMessage(
              {
                type: "GITHUB_OAUTH_ERROR",
                error: error,
                description: errorDescription,
              },
              window.location.origin
            );

            setTimeout(() => {
              window.close();
            }, 3000);
          }
          return;
        }

        if (!code || !state) {
          setStatus("error");
          setMessage("Missing authorization code or state parameter");

          if (isPopup) {
            window.opener.postMessage(
              {
                type: "GITHUB_OAUTH_ERROR",
                error: "missing_parameters",
                description: "Missing authorization code or state parameter",
              },
              window.location.origin
            );

            setTimeout(() => {
              window.close();
            }, 3000);
          }
          return;
        }

        // Success case
        setStatus("success");
        setMessage("Authorization successful! Redirecting...");

        if (isPopup) {
          // Send success message to parent window
          window.opener.postMessage(
            {
              type: "GITHUB_OAUTH_SUCCESS",
              code: code,
              state: state,
            },
            window.location.origin
          );

          // Close popup after a short delay
          setTimeout(() => {
            window.close();
          }, 1500);
        } else {
          // If not in popup, redirect to main app
          const redirectUrl =
            sessionStorage.getItem("github_oauth_redirect") || "/dashboard";
          sessionStorage.removeItem("github_oauth_redirect");

          setTimeout(() => {
            window.location.href = redirectUrl;
          }, 2000);
        }
      } catch (error) {
        console.error("Error handling GitHub OAuth callback:", error);
        setStatus("error");
        setMessage(
          "An unexpected error occurred while processing the authorization"
        );

        if (window.opener && window.opener !== window) {
          window.opener.postMessage(
            {
              type: "GITHUB_OAUTH_ERROR",
              error: "unexpected_error",
              description: "An unexpected error occurred",
            },
            window.location.origin
          );

          setTimeout(() => {
            window.close();
          }, 3000);
        }
      }
    };

    // Small delay to ensure DOM is ready
    setTimeout(handleCallback, 100);
  }, [location]);

  const getStatusIcon = () => {
    switch (status) {
      case "processing":
        return (
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        );
      case "success":
        return <CheckCircle className="w-16 h-16 text-green-600" />;
      case "error":
        return <AlertTriangle className="w-16 h-16 text-red-600" />;
      default:
        return <Github className="w-16 h-16 text-gray-400" />;
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
        return "text-gray-600";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center">
          {/* GitHub Logo */}
          <div className="mb-6">
            <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Github className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              GitHub Authorization
            </h1>
          </div>

          {/* Status Icon */}
          <div className="mb-6 flex justify-center">{getStatusIcon()}</div>

          {/* Status Message */}
          <div className="mb-6">
            <h2 className={`text-lg font-semibold mb-2 ${getStatusColor()}`}>
              {status === "processing" && "Processing..."}
              {status === "success" && "Success!"}
              {status === "error" && "Error"}
            </h2>
            <p className="text-gray-600 text-sm">{message}</p>
          </div>

          {/* Additional Info */}
          <div className="text-xs text-gray-500">
            {status === "processing" && (
              <p>Please wait while we complete the authorization process.</p>
            )}
            {status === "success" && (
              <p>This window will close automatically.</p>
            )}
            {status === "error" && (
              <p>You can safely close this window and try again.</p>
            )}
          </div>

          {/* Manual Close Button for Error State */}
          {status === "error" && window.opener && window.opener !== window && (
            <button
              onClick={() => window.close()}
              className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <X className="w-4 h-4 mr-2" />
              Close Window
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
