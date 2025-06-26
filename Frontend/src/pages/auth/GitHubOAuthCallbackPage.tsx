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
        const success = searchParams.get("success");
        const error = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");
        const messageParam = searchParams.get("message");
        const githubUser = searchParams.get("github_user");
        const githubName = searchParams.get("github_name");
        const repoCount = searchParams.get("repo_count");

        console.log("GitHub OAuth callback received:", {
          success,
          error,
          errorDescription,
          message: messageParam,
          githubUser,
          githubName,
          repoCount,
        });

        if (error) {
          const errorMsg =
            errorDescription || error || "Unknown error occurred";
          console.error("GitHub OAuth error:", errorMsg);

          setStatus("error");
          setMessage(`Authorization failed: ${errorMsg}`);

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

          setTimeout(() => {
            window.close();
          }, 3000);

          return;
        }

        if (success === "true") {
          console.log(
            "GitHub OAuth success, backend already processed everything"
          );

          setStatus("success");

          let successMsg = messageParam || "Authorization successful!";
          if (githubUser) {
            successMsg += ` Connected as ${githubName || githubUser}.`;
          }
          if (repoCount) {
            successMsg += ` Found ${repoCount} accessible repositories.`;
          }
          successMsg += " Closing window...";

          setMessage(successMsg);

          if (window.opener) {
            window.opener.postMessage(
              {
                type: "GITHUB_OAUTH_SUCCESS",
                message: messageParam,
                github_user: githubUser,
                github_name: githubName,
                repo_count: repoCount,
              },
              window.location.origin
            );
          }

          setTimeout(() => {
            window.close();
          }, 2000);
          return;
        }

        const code = searchParams.get("code");
        const state = searchParams.get("state");

        if (code && state) {
          console.warn(
            "Received legacy code/state parameters - this should not happen with new backend flow"
          );

          setStatus("error");
          setMessage(
            "Legacy OAuth flow detected. Please update your application."
          );

          if (window.opener) {
            window.opener.postMessage(
              {
                type: "GITHUB_OAUTH_ERROR",
                error: "legacy_flow",
                description: "Legacy OAuth flow is no longer supported",
                message:
                  "Please update your application to use the new OAuth flow",
              },
              window.location.origin
            );
          }

          setTimeout(() => {
            window.close();
          }, 3000);

          return;
        }

        console.error("No valid OAuth callback parameters found");

        setStatus("error");
        setMessage("Invalid callback - no authorization parameters found");

        if (window.opener) {
          window.opener.postMessage(
            {
              type: "GITHUB_OAUTH_ERROR",
              error: "invalid_callback",
              description: "No valid authorization parameters found",
              message: "Invalid OAuth callback - please try again",
            },
            window.location.origin
          );
        }

        setTimeout(() => {
          window.close();
        }, 3000);
      } catch (error) {
        console.error("Error processing GitHub OAuth callback:", error);

        setStatus("error");
        setMessage(
          "An unexpected error occurred while processing the authorization"
        );

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

        setTimeout(() => {
          window.close();
        }, 3000);
      }
    };

    const timer = setTimeout(processCallback, 100);

    return () => clearTimeout(timer);
  }, [searchParams]);

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
            <p>✅ GitHub account successfully connected!</p>
            <p className="mt-1">
              You can close this window and return to DevFlow.
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="text-sm text-gray-600 mb-4">
            <p>❌ Authorization failed</p>
            <p className="mt-1">Please try the authorization process again.</p>
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

        {process.env.NODE_ENV === "development" && (
          <div className="mt-4 p-3 bg-gray-100 rounded-lg text-left">
            <h4 className="text-xs font-medium text-gray-700 mb-2">
              Debug Info (Development Only):
            </h4>
            <div className="text-xs text-gray-600 space-y-1">
              <p>URL Params:</p>
              <ul className="list-disc list-inside ml-2 space-y-0.5">
                <li>success: {searchParams.get("success") || "null"}</li>
                <li>error: {searchParams.get("error") || "null"}</li>
                <li>
                  github_user: {searchParams.get("github_user") || "null"}
                </li>
                <li>
                  github_name: {searchParams.get("github_name") || "null"}
                </li>
                <li>repo_count: {searchParams.get("repo_count") || "null"}</li>
                <li>message: {searchParams.get("message") || "null"}</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
