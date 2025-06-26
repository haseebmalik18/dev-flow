import React, { useState, useCallback } from "react";
import {
  Github,
  GitCommit,
  GitPullRequest,
  ExternalLink,
  Plus,
  Link as LinkIcon,
  Calendar,
  User,
  GitBranch,
  Check,
  X,
  AlertTriangle,
  Loader2,
  Settings,
} from "lucide-react";
import { Button } from "../ui/Button";
import { GitHubConnectModal } from "../github/GitHubConnectModal";
import {
  useTaskGitHubCommits,
  useTaskGitHubPullRequests,
  useCreateCommitTaskLink,
  useCreatePRTaskLink,
  useProjectGitHubConnections,
} from "../../hooks/useGithub";
import type {
  GitHubCommit,
  GitHubPullRequest,
  CreateTaskLinkRequest,
} from "../../services/gitHubService";

interface GitHubTaskIntegrationProps {
  taskId: number;
  taskTitle: string;
  projectId: number;
  projectName: string;
}

export const GitHubTaskIntegration: React.FC<GitHubTaskIntegrationProps> = ({
  taskId,
  taskTitle,
  projectId,
  projectName,
}) => {
  const [activeTab, setActiveTab] = useState<"commits" | "pullRequests">(
    "commits"
  );
  const [isLinkingCommit, setIsLinkingCommit] = useState<number | null>(null);
  const [isLinkingPR, setIsLinkingPR] = useState<number | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [lastConnectionCheck, setLastConnectionCheck] = useState(Date.now());

  console.log("GitHubTaskIntegration props:", {
    taskId,
    taskTitle,
    projectId,
    projectName,
    taskIdType: typeof taskId,
    projectIdType: typeof projectId,
    taskIdValid: taskId && Number.isInteger(taskId) && taskId > 0,
    projectIdValid: projectId && Number.isInteger(projectId) && projectId > 0,
  });

  const isValidTask = taskId && Number.isInteger(taskId) && taskId > 0;
  const isValidProject =
    projectId && Number.isInteger(projectId) && projectId > 0;

  const {
    data: connections,
    isLoading: isLoadingConnections,
    error: connectionsError,
    refetch: refetchConnections,
  } = useProjectGitHubConnections(isValidProject ? projectId : 0);

  const {
    data: commits,
    isLoading: isLoadingCommits,
    error: commitsError,
    refetch: refetchCommits,
  } = useTaskGitHubCommits(isValidTask ? taskId : 0);

  const {
    data: pullRequests,
    isLoading: isLoadingPRs,
    error: prsError,
    refetch: refetchPRs,
  } = useTaskGitHubPullRequests(isValidTask ? taskId : 0);

  const createCommitLinkMutation = useCreateCommitTaskLink();
  const createPRLinkMutation = useCreatePRTaskLink();

  const hasConnections = connections && connections.length > 0;
  const hasActiveConnections =
    connections && connections.some((conn) => conn.status === "ACTIVE");

  React.useEffect(() => {
    const handleFocus = () => {
      const now = Date.now();
      if (now - lastConnectionCheck > 5000) {
        console.log("Window focused - refreshing GitHub connections");
        refetchConnections();
        if (hasConnections) {
          refetchCommits();
          refetchPRs();
        }
        setLastConnectionCheck(now);
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === "GITHUB_OAUTH_SUCCESS") {
        console.log("GitHub OAuth success detected - refreshing connections");
        setTimeout(() => {
          refetchConnections();
          setLastConnectionCheck(Date.now());
        }, 1000);
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("message", handleMessage);
    };
  }, [
    lastConnectionCheck,
    refetchConnections,
    refetchCommits,
    refetchPRs,
    hasConnections,
  ]);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const getLinkTypeColor = (linkType: string) => {
    switch (linkType) {
      case "CLOSES":
        return "bg-green-100 text-green-800";
      case "FIXES":
        return "bg-blue-100 text-blue-800";
      case "RESOLVES":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPRStatusColor = (status: string, isMerged: boolean) => {
    if (isMerged) return "bg-purple-100 text-purple-800";

    switch (status) {
      case "OPEN":
        return "bg-green-100 text-green-800";
      case "CLOSED":
        return "bg-red-100 text-red-800";
      case "DRAFT":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleCreateCommitLink = useCallback(
    (
      commitId: number,
      linkType: "REFERENCE" | "CLOSES" | "FIXES" | "RESOLVES"
    ) => {
      if (!isValidTask) {
        console.error("Cannot create commit link: invalid taskId", taskId);
        return;
      }

      const linkData: CreateTaskLinkRequest = {
        taskId,
        linkType,
        referenceText: `Manual link to task: ${taskTitle}`,
      };

      createCommitLinkMutation.mutate(
        { commitId, data: linkData },
        {
          onSuccess: () => {
            setIsLinkingCommit(null);
          },
        }
      );
    },
    [taskId, taskTitle, createCommitLinkMutation, isValidTask]
  );

  const handleCreatePRLink = useCallback(
    (prId: number, linkType: "REFERENCE" | "CLOSES" | "FIXES" | "RESOLVES") => {
      if (!isValidTask) {
        console.error("Cannot create PR link: invalid taskId", taskId);
        return;
      }

      const linkData: CreateTaskLinkRequest = {
        taskId,
        linkType,
        referenceText: `Manual link to task: ${taskTitle}`,
        autoStatusUpdate: true,
      };

      createPRLinkMutation.mutate(
        { prId, data: linkData },
        {
          onSuccess: () => {
            setIsLinkingPR(null);
          },
        }
      );
    },
    [taskId, taskTitle, createPRLinkMutation, isValidTask]
  );

  if (!isValidTask || !isValidProject) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <Github className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                GitHub Integration
              </h3>
              <p className="text-sm text-gray-600">
                GitHub integration for this task
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="text-center py-8">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Invalid Task or Project
            </h3>
            <p className="text-gray-600 mb-4">
              Task ID: {taskId} (valid: {isValidTask ? "yes" : "no"})<br />
              Project ID: {projectId} (valid: {isValidProject ? "yes" : "no"})
            </p>
            <p className="text-gray-600">
              Please refresh the page and try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (connectionsError) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <Github className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                GitHub Integration
              </h3>
              <p className="text-sm text-gray-600">
                Error loading GitHub connections
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="text-center py-8">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Connection Error
            </h3>
            <p className="text-gray-600">
              Failed to load GitHub connections for this project.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoadingConnections) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <Github className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                GitHub Integration
              </h3>
              <p className="text-sm text-gray-600">
                Checking GitHub connections...
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">
              Loading GitHub connections...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (!hasConnections) {
    return (
      <>
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                <Github className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  GitHub Integration
                </h3>
                <p className="text-sm text-gray-600">
                  Connect GitHub to track commits and pull requests
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Github className="w-8 h-8 text-gray-400" />
              </div>

              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Connect GitHub Repository
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Connect a GitHub repository to this project to automatically
                track commits and pull requests linked to your tasks.
              </p>

              <div className="space-y-4">
                <Button
                  onClick={() => setIsConnectModalOpen(true)}
                  icon={<Plus className="w-5 h-5" />}
                  className="bg-gray-900 hover:bg-gray-800"
                >
                  Connect GitHub Repository
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    console.log("Manual refresh triggered");
                    refetchConnections();
                    setLastConnectionCheck(Date.now());
                  }}
                  icon={<Settings className="w-4 h-4" />}
                  size="sm"
                >
                  Refresh
                </Button>

                <div className="bg-blue-50 rounded-lg p-4 max-w-md mx-auto">
                  <h4 className="font-medium text-blue-900 mb-2">
                    What you'll get:
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1 text-left">
                    <li>• Automatic commit tracking</li>
                    <li>• Pull request integration</li>
                    <li>• Task status updates from commits</li>
                    <li>• Development progress visibility</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <GitHubConnectModal
          isOpen={isConnectModalOpen}
          onClose={() => {
            setIsConnectModalOpen(false);
            setTimeout(() => {
              console.log("Modal closed - refreshing connections");
              refetchConnections();
              setLastConnectionCheck(Date.now());
            }, 500);
          }}
          projectId={projectId}
          projectName={projectName}
        />
      </>
    );
  }

  const CommitCard: React.FC<{ commit: GitHubCommit }> = ({ commit }) => (
    <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <GitCommit className="w-4 h-4 text-gray-600" />
            <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
              {commit.shortSha}
            </code>
            <a
              href={commit.commitUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-600"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          <p className="text-sm text-gray-900 mb-2 line-clamp-2">
            {commit.commitMessage}
          </p>

          <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
            <div className="flex items-center space-x-1">
              <User className="w-3 h-3" />
              <span>{commit.authorName}</span>
            </div>
            <div className="flex items-center space-x-1">
              <GitBranch className="w-3 h-3" />
              <span>{commit.branchName}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(commit.commitDate)}</span>
            </div>
            {commit.isFromMainBranch && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                Main Branch
              </span>
            )}
          </div>

          {commit.taskLinks.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {commit.taskLinks.map((link) => (
                <span
                  key={link.id}
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getLinkTypeColor(
                    link.linkType
                  )}`}
                >
                  {link.linkType}
                </span>
              ))}
            </div>
          )}

          {commit.additions !== null && commit.deletions !== null && (
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <span className="text-green-600">+{commit.additions}</span>
              <span className="text-red-600">-{commit.deletions}</span>
              {commit.changedFiles && (
                <span>
                  {commit.changedFiles} file
                  {commit.changedFiles !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="ml-4">
          {isLinkingCommit === commit.id ? (
            <div className="flex flex-col space-y-1">
              <Button
                size="sm"
                onClick={() => handleCreateCommitLink(commit.id, "REFERENCE")}
                loading={createCommitLinkMutation.isPending}
              >
                Reference
              </Button>
              <Button
                size="sm"
                onClick={() => handleCreateCommitLink(commit.id, "FIXES")}
                loading={createCommitLinkMutation.isPending}
              >
                Fixes
              </Button>
              <Button
                size="sm"
                onClick={() => setIsLinkingCommit(null)}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLinkingCommit(commit.id)}
              icon={<LinkIcon className="w-4 h-4" />}
            >
              Link
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  const PullRequestCard: React.FC<{ pr: GitHubPullRequest }> = ({ pr }) => (
    <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <GitPullRequest className="w-4 h-4 text-gray-600" />
            <span className="font-medium text-gray-900">#{pr.prNumber}</span>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${getPRStatusColor(
                pr.status,
                pr.isMerged
              )}`}
            >
              {pr.isMerged ? "Merged" : pr.status}
            </span>
            <a
              href={pr.prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-600"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">
            {pr.title}
          </h4>

          {pr.description && (
            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
              {pr.description}
            </p>
          )}

          <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
            <div className="flex items-center space-x-1">
              <User className="w-3 h-3" />
              <span>{pr.authorUsername}</span>
            </div>
            <div className="flex items-center space-x-1">
              <GitBranch className="w-3 h-3" />
              <span>
                {pr.headBranch} → {pr.baseBranch}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(pr.createdDate)}</span>
            </div>
          </div>

          {pr.taskLinks.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {pr.taskLinks.map((link) => (
                <span
                  key={link.id}
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getLinkTypeColor(
                    link.linkType
                  )}`}
                >
                  {link.linkType}
                </span>
              ))}
            </div>
          )}

          {pr.additions !== null && pr.deletions !== null && (
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <div className="flex items-center space-x-2">
                <span className="text-green-600">+{pr.additions}</span>
                <span className="text-red-600">-{pr.deletions}</span>
                {pr.changedFiles && (
                  <span>
                    {pr.changedFiles} file{pr.changedFiles !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {pr.commitsCount && (
                <span>
                  {pr.commitsCount} commit{pr.commitsCount !== 1 ? "s" : ""}
                </span>
              )}
              {pr.reviewCommentsCount !== null &&
                pr.reviewCommentsCount > 0 && (
                  <span>
                    {pr.reviewCommentsCount} review comment
                    {pr.reviewCommentsCount !== 1 ? "s" : ""}
                  </span>
                )}
            </div>
          )}

          {pr.mergedDate && (
            <div className="mt-2 text-xs text-gray-500">
              Merged {formatDate(pr.mergedDate)}
            </div>
          )}
        </div>

        <div className="ml-4">
          {isLinkingPR === pr.id ? (
            <div className="flex flex-col space-y-1">
              <Button
                size="sm"
                onClick={() => handleCreatePRLink(pr.id, "REFERENCE")}
                loading={createPRLinkMutation.isPending}
              >
                Reference
              </Button>
              <Button
                size="sm"
                onClick={() => handleCreatePRLink(pr.id, "CLOSES")}
                loading={createPRLinkMutation.isPending}
              >
                Closes
              </Button>
              <Button
                size="sm"
                onClick={() => setIsLinkingPR(null)}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLinkingPR(pr.id)}
              icon={<LinkIcon className="w-4 h-4" />}
            >
              Link
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <Github className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                GitHub Integration
              </h3>
              <p className="text-sm text-gray-600">
                Commits and pull requests linked to this task
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsConnectModalOpen(true)}
            icon={<Settings className="w-4 h-4" />}
          >
            Manage
          </Button>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-4">
          {[
            {
              id: "commits",
              label: "Commits",
              icon: GitCommit,
              count: commits?.length || 0,
            },
            {
              id: "pullRequests",
              label: "Pull Requests",
              icon: GitPullRequest,
              count: pullRequests?.length || 0,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-3 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-4">
        {hasActiveConnections ? (
          <>
            {activeTab === "commits" && (
              <div>
                {isLoadingCommits ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600">
                      Loading commits...
                    </span>
                  </div>
                ) : commitsError ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Failed to load commits
                    </h3>
                    <p className="text-gray-600">
                      There was an error loading the linked commits.
                    </p>
                  </div>
                ) : commits && commits.length > 0 ? (
                  <div className="space-y-4">
                    {commits.map((commit) => (
                      <CommitCard key={commit.id} commit={commit} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <GitCommit className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No linked commits
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Commits will appear here when they reference this task in
                      their message.
                    </p>
                    <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4">
                      <p className="font-medium mb-2">How to link commits:</p>
                      <ul className="space-y-1 text-left">
                        <li>• Include "#{taskId}" in your commit message</li>
                        <li>
                          • Use "fixes #{taskId}" to automatically close the
                          task
                        </li>
                        <li>
                          • Use "closes #{taskId}" or "resolves #{taskId}"
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "pullRequests" && (
              <div>
                {isLoadingPRs ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600">
                      Loading pull requests...
                    </span>
                  </div>
                ) : prsError ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Failed to load pull requests
                    </h3>
                    <p className="text-gray-600">
                      There was an error loading the linked pull requests.
                    </p>
                  </div>
                ) : pullRequests && pullRequests.length > 0 ? (
                  <div className="space-y-4">
                    {pullRequests.map((pr) => (
                      <PullRequestCard key={pr.id} pr={pr} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <GitPullRequest className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No linked pull requests
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Pull requests will appear here when they reference this
                      task.
                    </p>
                    <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4">
                      <p className="font-medium mb-2">
                        How to link pull requests:
                      </p>
                      <ul className="space-y-1 text-left">
                        <li>
                          • Include "#{taskId}" in your PR title or description
                        </li>
                        <li>
                          • Use "fixes #{taskId}" to automatically update task
                          status
                        </li>
                        <li>
                          • Task status will update when PR is merged or closed
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Active Connections
            </h3>
            <p className="text-gray-600 mb-4">
              GitHub repositories are connected but none are currently active.
            </p>
            <Button
              variant="outline"
              onClick={() => setIsConnectModalOpen(true)}
              icon={<Settings className="w-4 h-4" />}
            >
              Check Connection Status
            </Button>
          </div>
        )}
      </div>

      <GitHubConnectModal
        isOpen={isConnectModalOpen}
        onClose={() => {
          setIsConnectModalOpen(false);
          setTimeout(() => {
            console.log("Modal closed - refreshing connections");
            refetchConnections();
            setLastConnectionCheck(Date.now());
          }, 500);
        }}
        projectId={projectId}
        projectName={projectName}
      />
    </div>
  );
};
