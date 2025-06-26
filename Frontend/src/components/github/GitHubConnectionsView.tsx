import React, { useState } from "react";
import {
  Github,
  Plus,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Trash2,
  Settings,
  Activity,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Zap,
  AlertCircle,
  Calendar,
} from "lucide-react";
import { Button } from "../ui/Button";
import { GitHubConnectModal } from "./GitHubConnectModal";
import {
  useProjectGitHubConnections,
  useDeleteGitHubConnection,
  useSyncGitHubConnection,
  useProjectGitHubStatistics,
} from "../../hooks/useGithub";
import type { GitHubConnection } from "../../services/gitHubService";

interface GitHubConnectionsViewProps {
  projectId: number;
  projectName: string;
}

export const GitHubConnectionsView: React.FC<GitHubConnectionsViewProps> = ({
  projectId,
  projectName,
}) => {
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] =
    useState<GitHubConnection | null>(null);

  const {
    data: connections,
    isLoading: isLoadingConnections,
    error: connectionsError,
  } = useProjectGitHubConnections(projectId);

  const { data: statistics, isLoading: isLoadingStats } =
    useProjectGitHubStatistics(projectId);

  const deleteConnectionMutation = useDeleteGitHubConnection();
  const syncConnectionMutation = useSyncGitHubConnection();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "text-green-600 bg-green-100";
      case "DISCONNECTED":
        return "text-gray-600 bg-gray-100";
      case "ERROR":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getWebhookStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "text-green-600 bg-green-100";
      case "PENDING":
        return "text-yellow-600 bg-yellow-100";
      case "INACTIVE":
      case "ERROR":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <CheckCircle className="w-4 h-4" />;
      case "PENDING":
        return <Clock className="w-4 h-4" />;
      case "ERROR":
      case "DISCONNECTED":
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDeleteConnection = async (connection: GitHubConnection) => {
    if (
      window.confirm(
        `Are you sure you want to disconnect ${connection.repositoryFullName}?`
      )
    ) {
      deleteConnectionMutation.mutate(connection.id);
    }
  };

  const handleSyncConnection = (connection: GitHubConnection) => {
    syncConnectionMutation.mutate(connection.id);
  };

  if (isLoadingConnections) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (connectionsError) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Failed to load GitHub connections
          </h3>
          <p className="text-gray-600">
            There was an error loading your GitHub integrations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                <Github className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  GitHub Integration
                </h3>
                <p className="text-sm text-gray-600">
                  Connect repositories to track commits and pull requests
                </p>
              </div>
            </div>
            <Button
              onClick={() => setIsConnectModalOpen(true)}
              icon={<Plus className="w-5 h-5" />}
              className="bg-gray-900 hover:bg-gray-800"
            >
              Connect Repository
            </Button>
          </div>
        </div>

        {statistics && !isLoadingStats && (
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {statistics.commits.totalCommits}
                </div>
                <div className="text-sm text-gray-600 flex items-center justify-center">
                  <GitCommit className="w-4 h-4 mr-1" />
                  Commits
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {statistics.pullRequests.totalPRs}
                </div>
                <div className="text-sm text-gray-600 flex items-center justify-center">
                  <GitPullRequest className="w-4 h-4 mr-1" />
                  Pull Requests
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {statistics.taskLinks.totalLinks}
                </div>
                <div className="text-sm text-gray-600 flex items-center justify-center">
                  <Zap className="w-4 h-4 mr-1" />
                  Task Links
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {statistics.connections.activeConnections}
                </div>
                <div className="text-sm text-gray-600 flex items-center justify-center">
                  <Activity className="w-4 h-4 mr-1" />
                  Active Repos
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="p-6">
          {connections && connections.length > 0 ? (
            <div className="space-y-4">
              {connections.map((connection) => (
                <div
                  key={connection.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-medium text-gray-900 truncate">
                          {connection.repositoryFullName}
                        </h4>
                        <a
                          href={connection.repositoryUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>

                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <span className="text-gray-600">Status:</span>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              connection.status
                            )}`}
                          >
                            {getStatusIcon(connection.status)}
                            <span className="ml-1">{connection.status}</span>
                          </span>
                        </div>

                        <div className="flex items-center space-x-1">
                          <span className="text-gray-600">Webhook:</span>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getWebhookStatusColor(
                              connection.webhookStatus
                            )}`}
                          >
                            {getStatusIcon(connection.webhookStatus)}
                            <span className="ml-1">
                              {connection.webhookStatus}
                            </span>
                          </span>
                        </div>

                        <div className="flex items-center space-x-1 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Connected {formatDate(connection.createdAt)}
                          </span>
                        </div>
                      </div>

                      {connection.errorMessage && (
                        <div className="mt-2 flex items-start space-x-2 text-sm text-red-600 bg-red-50 rounded p-2">
                          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{connection.errorMessage}</span>
                        </div>
                      )}

                      {!connection.health.isHealthy &&
                        connection.health.issues.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {connection.health.issues.map((issue, index) => (
                              <div
                                key={index}
                                className="flex items-start space-x-2 text-sm text-yellow-600 bg-yellow-50 rounded p-2"
                              >
                                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span>{issue}</span>
                              </div>
                            ))}
                          </div>
                        )}

                      <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                        <span>
                          Last sync: {formatDate(connection.lastSyncAt)}
                        </span>
                        <span>
                          Last webhook: {formatDate(connection.lastWebhookAt)}
                        </span>
                        {connection.errorCount > 0 && (
                          <span className="text-red-600">
                            {connection.errorCount} error
                            {connection.errorCount !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSyncConnection(connection)}
                        loading={syncConnectionMutation.isPending}
                        icon={<RefreshCw className="w-4 h-4" />}
                      >
                        Sync
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedConnection(connection)}
                        icon={<Settings className="w-4 h-4" />}
                      >
                        Settings
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteConnection(connection)}
                        loading={deleteConnectionMutation.isPending}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        icon={<Trash2 className="w-4 h-4" />}
                      >
                        Disconnect
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Github className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No GitHub repositories connected
              </h3>
              <p className="text-gray-600 mb-6">
                Connect a GitHub repository to start tracking commits and pull
                requests automatically.
              </p>
              <Button
                onClick={() => setIsConnectModalOpen(true)}
                icon={<Plus className="w-5 h-5" />}
                className="bg-gray-900 hover:bg-gray-800"
              >
                Connect Your First Repository
              </Button>
            </div>
          )}
        </div>
      </div>

      <GitHubConnectModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        projectId={projectId}
        projectName={projectName}
      />
    </>
  );
};
