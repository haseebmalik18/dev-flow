// Updated GitHubConnectModal.tsx with development reset functionality
import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Github,
  Search,
  Star,
  GitFork,
  Lock,
  Unlock,
  ExternalLink,
  Check,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Settings,
} from "lucide-react";
import { Button } from "../ui/Button";
import {
  useGitHubOAuth,
  useGitHubOAuthCallback,
  useSearchGitHubRepositories,
  useCreateGitHubConnection,
} from "../../hooks/useGithub";
import { api } from "../../config/api";
import type { GitHubRepository } from "../../services/githubService";

interface GitHubConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  projectName: string;
}

// Development Reset Component
const DevGitHubReset: React.FC<{ projectId: number }> = ({ projectId }) => {
  const [isResetting, setIsResetting] = useState(false);
  const [isClearingConnections, setIsClearingConnections] = useState(false);

  const handleResetOAuth = async () => {
    if (
      !window.confirm(
        "This will reset OAuth state for testing. You'll need to revoke authorization on GitHub too. Continue?"
      )
    ) {
      return;
    }

    setIsResetting(true);
    try {
      const response = await api.post(
        `/github/oauth/reset?projectId=${projectId}`
      );

      if (response.data.success) {
        const data = response.data.data;
        alert(
          `OAuth state reset!\n\nNext steps:\n1. ✅ Local state cleared\n2. Go to: ${data.githubUrl}\n3. Find your DevFlow app and click "Revoke"\n4. Try OAuth again`
        );
      }
    } catch (error: any) {
      console.error("Failed to reset OAuth:", error);
      const message =
        error.response?.data?.message || "Failed to reset OAuth state";
      alert(`Error: ${message}`);
    } finally {
      setIsResetting(false);
    }
  };

  const handleClearConnections = async () => {
    if (
      !window.confirm(
        "This will delete ALL GitHub connections for this project. Continue?"
      )
    ) {
      return;
    }

    setIsClearingConnections(true);
    try {
      const response = await api.delete(
        `/github/dev/projects/${projectId}/connections/clear`
      );

      if (response.data.success) {
        const data = response.data.data;
        alert(
          `Cleared ${data.deletedConnections} GitHub connections for project ${projectId}`
        );
        // Refresh the page or trigger a refetch
        window.location.reload();
      }
    } catch (error: any) {
      console.error("Failed to clear connections:", error);
      const message =
        error.response?.data?.message || "Failed to clear connections";
      alert(`Error: ${message}`);
    } finally {
      setIsClearingConnections(false);
    }
  };

  const openGitHubAuthorizations = () => {
    window.open("https://github.com/settings/applications", "_blank");
  };

  // Only show in development
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex items-center space-x-2 mb-3">
        <Settings className="w-4 h-4 text-yellow-600" />
        <h4 className="text-sm font-medium text-yellow-800">
          Development Testing Tools
        </h4>
      </div>

      <div className="grid grid-cols-1 gap-2 mb-3">
        <button
          onClick={handleResetOAuth}
          disabled={isResetting}
          className="flex items-center justify-center space-x-2 text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-2 rounded transition-colors disabled:opacity-50"
        >
          {isResetting ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Resetting OAuth...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3 h-3" />
              <span>Reset OAuth State</span>
            </>
          )}
        </button>

        <button
          onClick={handleClearConnections}
          disabled={isClearingConnections}
          className="flex items-center justify-center space-x-2 text-xs bg-red-100 hover:bg-red-200 text-red-800 px-3 py-2 rounded transition-colors disabled:opacity-50"
        >
          {isClearingConnections ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Clearing Connections...</span>
            </>
          ) : (
            <>
              <Trash2 className="w-3 h-3" />
              <span>Clear All Connections</span>
            </>
          )}
        </button>

        <button
          onClick={openGitHubAuthorizations}
          className="flex items-center justify-center space-x-2 text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-2 rounded transition-colors"
        >
          <Github className="w-3 h-3" />
          <span>GitHub Authorizations</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      <div className="text-xs text-yellow-700 space-y-1">
        <p>
          <strong>Reset OAuth:</strong> Clears local state + guides you to
          revoke on GitHub
        </p>
        <p>
          <strong>Clear Connections:</strong> Removes all GitHub repo
          connections for this project
        </p>
        <p>
          <strong>GitHub Authorizations:</strong> Direct link to manage your
          OAuth apps
        </p>
      </div>
    </div>
  );
};

export const GitHubConnectModal: React.FC<GitHubConnectModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectName,
}) => {
  const [step, setStep] = useState<"oauth" | "search" | "connect">("oauth");
  const [accessToken, setAccessToken] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepository | null>(
    null
  );
  const [githubUserInfo, setGithubUserInfo] = useState<any>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [isOAuthInProgress, setIsOAuthInProgress] = useState(false);

  const gitHubOAuthMutation = useGitHubOAuth();
  const gitHubCallbackMutation = useGitHubOAuthCallback();
  const createConnectionMutation = useCreateGitHubConnection();

  const {
    data: searchResults,
    isLoading: isSearching,
    error: searchError,
  } = useSearchGitHubRepositories(accessToken, searchQuery, 1, 50);

  // CRITICAL FIX: Validate projectId and close modal if invalid
  useEffect(() => {
    if (isOpen && (!projectId || isNaN(projectId) || projectId <= 0)) {
      console.error(
        "GitHubConnectModal: Invalid projectId provided:",
        projectId
      );
      alert("Invalid project selected. Please refresh the page and try again.");
      onClose();
    }
  }, [isOpen, projectId, onClose]);

  // Enhanced OAuth callback handler with better error handling
  useEffect(() => {
    if (!isOpen) return;

    const handleMessage = (event: MessageEvent) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) {
        console.warn("Received message from unexpected origin:", event.origin);
        return;
      }

      console.log("Received OAuth message:", event.data);

      if (event.data.type === "GITHUB_OAUTH_SUCCESS") {
        const { code, state } = event.data;

        if (!code || !state) {
          console.error("Missing code or state in OAuth success message");
          setOauthError("Invalid OAuth response: missing authorization data");
          setIsOAuthInProgress(false);
          return;
        }

        console.log("Processing OAuth callback with code and state");

        gitHubCallbackMutation.mutate(
          { code, state },
          {
            onSuccess: (response) => {
              console.log("OAuth callback processed successfully:", response);
              if (response.data) {
                setAccessToken(response.data.accessToken);
                setGithubUserInfo(response.data.userInfo);
                setStep("search");
                setOauthError(null);
                setIsOAuthInProgress(false);
              } else {
                setOauthError("Invalid response from OAuth callback");
                setIsOAuthInProgress(false);
              }
            },
            onError: (error: any) => {
              console.error("OAuth callback error:", error);
              const errorMessage =
                error.response?.data?.message ||
                error.message ||
                "Unknown error occurred";
              setOauthError(
                `Failed to complete GitHub authorization: ${errorMessage}`
              );
              setIsOAuthInProgress(false);
            },
          }
        );
      }

      if (event.data.type === "GITHUB_OAUTH_ERROR") {
        console.error("GitHub OAuth error:", event.data);
        const errorMessage =
          event.data.description ||
          event.data.error ||
          "Unknown error occurred";
        setOauthError(`GitHub authorization failed: ${errorMessage}`);
        setIsOAuthInProgress(false);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isOpen, gitHubCallbackMutation]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep("oauth");
      setAccessToken("");
      setSearchQuery("");
      setSelectedRepo(null);
      setGithubUserInfo(null);
      setOauthError(null);
      setIsOAuthInProgress(false);
    }
  }, [isOpen]);

  const handleStartOAuth = useCallback(() => {
    // CRITICAL FIX: Validate projectId before making request
    if (!projectId || isNaN(projectId) || projectId <= 0) {
      console.error("Cannot start OAuth: invalid projectId", projectId);
      setOauthError(
        "Invalid project ID. Please refresh the page and try again."
      );
      return;
    }

    // Clear any previous errors
    setOauthError(null);
    setIsOAuthInProgress(true);

    console.log("Starting OAuth for projectId:", projectId);

    gitHubOAuthMutation.mutate(projectId, {
      onSuccess: (response) => {
        if (response.data?.authorizationUrl) {
          console.log(
            "Opening OAuth popup with URL:",
            response.data.authorizationUrl
          );

          // Store current location for redirect after OAuth
          sessionStorage.setItem(
            "github_oauth_redirect",
            window.location.pathname
          );

          // Open popup window with specific features for better compatibility
          const popup = window.open(
            response.data.authorizationUrl,
            "github-oauth",
            "width=600,height=700,scrollbars=yes,resizable=yes,status=yes,location=yes"
          );

          if (!popup) {
            setOauthError(
              "Please allow popups for this site to connect with GitHub."
            );
            setIsOAuthInProgress(false);
            return;
          }

          // Focus the popup
          popup.focus();

          // Check if popup was closed manually
          const checkClosed = setInterval(() => {
            if (popup.closed) {
              clearInterval(checkClosed);
              console.log("OAuth popup was closed manually");
              setIsOAuthInProgress(false);
            }
          }, 1000);

          // Set a timeout to close popup if it takes too long (5 minutes)
          const timeout = setTimeout(() => {
            if (!popup.closed) {
              popup.close();
              clearInterval(checkClosed);
              console.log("OAuth popup timed out");
              setOauthError("OAuth process timed out. Please try again.");
              setIsOAuthInProgress(false);
            }
          }, 5 * 60 * 1000);

          // Clean up timeout if popup closes normally
          const originalCheckClosed = checkClosed;
          const enhancedCheckClosed = setInterval(() => {
            if (popup.closed) {
              clearInterval(enhancedCheckClosed);
              clearTimeout(timeout);
              setIsOAuthInProgress(false);
            }
          }, 1000);
        } else {
          setOauthError("Failed to get authorization URL from server");
          setIsOAuthInProgress(false);
        }
      },
      onError: (error: any) => {
        console.error("Failed to initiate OAuth:", error);
        const errorMessage =
          error.response?.data?.message ||
          error.message ||
          "Unknown error occurred";
        setOauthError(`Failed to initiate GitHub OAuth: ${errorMessage}`);
        setIsOAuthInProgress(false);
      },
    });
  }, [gitHubOAuthMutation, projectId]);

  const handleSelectRepository = useCallback((repo: GitHubRepository) => {
    setSelectedRepo(repo);
    setStep("connect");
  }, []);

  const handleConnectRepository = useCallback(() => {
    if (!selectedRepo) return;

    // CRITICAL FIX: Validate projectId before creating connection
    if (!projectId || isNaN(projectId) || projectId <= 0) {
      console.error("Cannot connect repository: invalid projectId", projectId);
      alert("Invalid project ID. Please refresh the page and try again.");
      return;
    }

    createConnectionMutation.mutate(
      {
        projectId,
        repositoryFullName: selectedRepo.fullName,
        repositoryUrl: selectedRepo.url,
        repositoryId: selectedRepo.id,
        accessToken,
      },
      {
        onSuccess: () => {
          onClose();
          // Reset state
          setStep("oauth");
          setAccessToken("");
          setSearchQuery("");
          setSelectedRepo(null);
          setGithubUserInfo(null);
          setOauthError(null);
          setIsOAuthInProgress(false);
        },
        onError: (error: any) => {
          console.error("Failed to create connection:", error);
          const errorMessage =
            error.response?.data?.message ||
            error.message ||
            "Unknown error occurred";
          alert(`Failed to connect repository: ${errorMessage}`);
        },
      }
    );
  }, [selectedRepo, projectId, accessToken, createConnectionMutation, onClose]);

  const handleBackToSearch = useCallback(() => {
    setStep("search");
    setSelectedRepo(null);
  }, []);

  const handleResetOAuth = useCallback(() => {
    setStep("oauth");
    setAccessToken("");
    setSearchQuery("");
    setSelectedRepo(null);
    setGithubUserInfo(null);
    setOauthError(null);
    setIsOAuthInProgress(false);
  }, []);

  const handleRetryOAuth = useCallback(() => {
    setOauthError(null);
    setIsOAuthInProgress(false);
    handleStartOAuth();
  }, [handleStartOAuth]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // CRITICAL FIX: Don't render if projectId is invalid
  if (!isOpen || !projectId || isNaN(projectId) || projectId <= 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
              <Github className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Connect GitHub Repository
              </h2>
              <p className="text-sm text-gray-600">
                Link a repository to {projectName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error Display */}
          {oauthError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800">
                    Connection Error
                  </h3>
                  <p className="text-sm text-red-700 mt-1">{oauthError}</p>
                  <button
                    onClick={handleRetryOAuth}
                    className="mt-3 text-sm text-red-600 hover:text-red-800 font-medium"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Development Reset Tools */}
          <DevGitHubReset projectId={projectId} />

          {/* Step 1: OAuth */}
          {step === "oauth" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Github className="w-8 h-8 text-gray-600" />
              </div>

              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Connect Your GitHub Account
              </h3>
              <p className="text-gray-600 mb-6">
                We'll need access to your GitHub repositories to set up the
                integration.
              </p>

              <Button
                onClick={handleStartOAuth}
                loading={gitHubOAuthMutation.isPending || isOAuthInProgress}
                icon={<Github className="w-5 h-5" />}
                className="bg-gray-900 hover:bg-gray-800"
                disabled={!projectId || isNaN(projectId) || projectId <= 0}
              >
                {isOAuthInProgress
                  ? "Opening GitHub..."
                  : "Authorize GitHub Access"}
              </Button>

              <div className="mt-6 text-sm text-gray-500">
                <p>This will open a new window to authenticate with GitHub.</p>
                <p className="mt-1">
                  We only request the minimum permissions needed.
                </p>
                {isOAuthInProgress && (
                  <p className="mt-2 text-blue-600 font-medium">
                    Please complete the authorization in the popup window.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Search Repositories */}
          {step === "search" && (
            <div className="space-y-4">
              {githubUserInfo && (
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <img
                      src={githubUserInfo.avatarUrl}
                      alt={githubUserInfo.name || githubUserInfo.login}
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <div className="font-medium text-gray-900">
                        Connected as{" "}
                        {githubUserInfo.name || githubUserInfo.login}
                      </div>
                      <div className="text-sm text-gray-600">
                        GitHub account connected successfully
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleResetOAuth}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Change Account
                  </button>
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search your repositories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {isSearching && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">
                    Searching repositories...
                  </span>
                </div>
              )}

              {searchError && (
                <div className="flex items-center justify-center py-8 text-red-600">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  <span>Failed to search repositories</span>
                </div>
              )}

              {searchResults && searchResults.repositories.length > 0 && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {searchResults.repositories.map((repo) => (
                    <div
                      key={repo.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleSelectRepository(repo)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-gray-900 truncate">
                            {repo.fullName}
                          </h4>
                          {repo.isPrivate ? (
                            <Lock className="w-4 h-4 text-gray-400" />
                          ) : (
                            <Unlock className="w-4 h-4 text-gray-400" />
                          )}
                        </div>

                        {repo.description && (
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {repo.description}
                          </p>
                        )}

                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          {repo.language && (
                            <span className="flex items-center">
                              <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
                              {repo.language}
                            </span>
                          )}
                          <span className="flex items-center">
                            <Star className="w-4 h-4 mr-1" />
                            {repo.stargazersCount}
                          </span>
                          <span className="flex items-center">
                            <GitFork className="w-4 h-4 mr-1" />
                            {repo.forksCount}
                          </span>
                          <span>Updated {formatDate(repo.updatedAt)}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <a
                          href={repo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 text-gray-400 hover:text-gray-600"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <Button size="sm" variant="outline">
                          Select
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {searchQuery &&
                searchResults &&
                searchResults.repositories.length === 0 &&
                !isSearching && (
                  <div className="text-center py-8">
                    <Github className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No repositories found
                    </h3>
                    <p className="text-gray-600">
                      Try adjusting your search terms or check if you have
                      access to the repository.
                    </p>
                  </div>
                )}

              {!searchQuery && (
                <div className="text-center py-8">
                  <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Search for a repository
                  </h3>
                  <p className="text-gray-600">
                    Enter a repository name to find and connect it to your
                    project.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Confirm Connection */}
          {step === "connect" && selectedRepo && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Ready to Connect
                </h3>
                <p className="text-gray-600">
                  Confirm the details below to connect this repository to your
                  project.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Repository
                  </label>
                  <div className="mt-1 flex items-center space-x-2">
                    {selectedRepo.isPrivate ? (
                      <Lock className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Unlock className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="font-medium text-gray-900">
                      {selectedRepo.fullName}
                    </span>
                    <a
                      href={selectedRepo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Project
                  </label>
                  <div className="mt-1 font-medium text-gray-900">
                    {projectName}
                  </div>
                </div>

                {selectedRepo.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Description
                    </label>
                    <div className="mt-1 text-gray-700">
                      {selectedRepo.description}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div>
                    <div className="text-sm font-medium text-gray-600">
                      Language
                    </div>
                    <div className="text-gray-900">
                      {selectedRepo.language || "N/A"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600">
                      Stars
                    </div>
                    <div className="text-gray-900">
                      {selectedRepo.stargazersCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600">
                      Forks
                    </div>
                    <div className="text-gray-900">
                      {selectedRepo.forksCount}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">
                  What happens next?
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>
                    • A webhook will be set up to receive repository events
                  </li>
                  <li>
                    • Commits will be automatically linked to tasks via commit
                    messages
                  </li>
                  <li>
                    • Pull requests will be tracked and associated with tasks
                  </li>
                  <li>
                    • Task statuses will be updated based on PR and commit
                    activities
                  </li>
                </ul>
              </div>

              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={handleBackToSearch}>
                  Back to Search
                </Button>

                <Button
                  onClick={handleConnectRepository}
                  loading={createConnectionMutation.isPending}
                  icon={<Github className="w-5 h-5" />}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Connect Repository
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Loading Overlay */}
        {(gitHubOAuthMutation.isPending ||
          gitHubCallbackMutation.isPending) && (
          <div className="absolute inset-0 bg-white/90 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-gray-600">
                {gitHubOAuthMutation.isPending && "Initiating GitHub OAuth..."}
                {gitHubCallbackMutation.isPending &&
                  "Completing authentication..."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
