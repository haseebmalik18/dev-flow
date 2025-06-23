import React, { useState } from "react";
import {
  Github,
  GitCommit,
  GitPullRequest,
  Activity,
  BarChart3,
  Calendar,
  ExternalLink,
  TrendingUp,
  Users,
  Code,
  GitBranch,
} from "lucide-react";
import { GitHubConnectionsView } from "../github/GitHubConnectionsView";
import {
  useProjectGitHubConnections,
  useProjectGitHubCommits,
  useProjectGitHubPullRequests,
  useProjectGitHubStatistics,
} from "../../hooks/useGithub";
import { Button } from "../ui/Button";

interface ProjectGitHubTabProps {
  projectId: number;
  projectName: string;
}

export const ProjectGitHubTab: React.FC<ProjectGitHubTabProps> = ({
  projectId,
  projectName,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    "overview" | "commits" | "pullRequests" | "activity"
  >("overview");

  const { data: connections } = useProjectGitHubConnections(projectId);
  const { data: commitsData } = useProjectGitHubCommits(projectId, 0, 10);
  const { data: pullRequestsData } = useProjectGitHubPullRequests(
    projectId,
    0,
    10
  );
  const { data: statistics } = useProjectGitHubStatistics(projectId);

  const hasConnections = connections && connections.length > 0;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

  if (!hasConnections) {
    return (
      <GitHubConnectionsView projectId={projectId} projectName={projectName} />
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <GitCommit className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-600">
                  Total Commits
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {statistics.commits.totalCommits}
                </div>
                <div className="text-sm text-gray-500">
                  {statistics.commits.uniqueAuthors} authors
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <GitPullRequest className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-600">
                  Pull Requests
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {statistics.pullRequests.totalPRs}
                </div>
                <div className="text-sm text-gray-500">
                  {statistics.pullRequests.mergedPRs} merged
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <Activity className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-600">
                  Task Links
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {statistics.taskLinks.totalLinks}
                </div>
                <div className="text-sm text-gray-500">
                  {statistics.taskLinks.closes +
                    statistics.taskLinks.fixes +
                    statistics.taskLinks.resolves}{" "}
                  automated
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <Code className="w-8 h-8 text-orange-600" />
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-600">
                  Code Changes
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {statistics.commits.totalAdditions +
                    statistics.commits.totalDeletions}
                </div>
                <div className="text-sm text-green-600">
                  +{statistics.commits.totalAdditions}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub Navigation */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: "overview", label: "Overview", icon: BarChart3 },
              { id: "commits", label: "Recent Commits", icon: GitCommit },
              {
                id: "pullRequests",
                label: "Pull Requests",
                icon: GitPullRequest,
              },
              { id: "activity", label: "Connections", icon: Activity },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                  activeSubTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeSubTab === "overview" && statistics && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Commit Activity */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Development Activity
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Active Repositories</span>
                      <span className="font-medium">
                        {statistics.connections.activeConnections}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Unique Authors</span>
                      <span className="font-medium">
                        {statistics.commits.uniqueAuthors}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Branches</span>
                      <span className="font-medium">
                        {statistics.commits.uniqueBranches}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Files Changed</span>
                      <span className="font-medium">
                        {statistics.commits.totalChangedFiles}
                      </span>
                    </div>
                  </div>
                </div>

                {/* PR Statistics */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Pull Request Metrics
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Open PRs</span>
                      <span className="font-medium text-green-600">
                        {statistics.pullRequests.openPRs}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Merged PRs</span>
                      <span className="font-medium text-purple-600">
                        {statistics.pullRequests.mergedPRs}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Closed PRs</span>
                      <span className="font-medium text-red-600">
                        {statistics.pullRequests.closedPRs}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Avg. Additions</span>
                      <span className="font-medium">
                        {Math.round(statistics.pullRequests.avgAdditions)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Task Integration Summary */}
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Task Integration Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {statistics.taskLinks.references}
                    </div>
                    <div className="text-sm text-gray-600">References</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {statistics.taskLinks.closes}
                    </div>
                    <div className="text-sm text-gray-600">Closes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {statistics.taskLinks.fixes}
                    </div>
                    <div className="text-sm text-gray-600">Fixes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {statistics.taskLinks.resolves}
                    </div>
                    <div className="text-sm text-gray-600">Resolves</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Commits Tab */}
          {activeSubTab === "commits" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Recent Commits
                </h3>
                <Button variant="outline" size="sm">
                  View All Commits
                </Button>
              </div>

              {commitsData && commitsData.content.length > 0 ? (
                <div className="space-y-3">
                  {commitsData.content.map((commit) => (
                    <div
                      key={commit.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                              {commit.shortSha}
                            </code>
                            <span className="text-sm text-gray-600">
                              by {commit.authorName}
                            </span>
                            <span className="text-sm text-gray-500">
                              {formatDate(commit.commitDate)}
                            </span>
                          </div>

                          <p className="text-sm text-gray-900 mb-2 line-clamp-2">
                            {commit.commitMessage}
                          </p>

                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span className="flex items-center space-x-1">
                              <GitBranch className="w-3 h-3" />
                              <span>{commit.branchName}</span>
                            </span>
                            {commit.additions !== null &&
                              commit.deletions !== null && (
                                <>
                                  <span className="text-green-600">
                                    +{commit.additions}
                                  </span>
                                  <span className="text-red-600">
                                    -{commit.deletions}
                                  </span>
                                </>
                              )}
                          </div>
                        </div>

                        <a
                          href={commit.commitUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-gray-600 ml-4"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <GitCommit className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No commits yet
                  </h3>
                  <p className="text-gray-600">
                    Commits will appear here once you start pushing to connected
                    repositories.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Pull Requests Tab */}
          {activeSubTab === "pullRequests" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Pull Requests
                </h3>
                <Button variant="outline" size="sm">
                  View All PRs
                </Button>
              </div>

              {pullRequestsData && pullRequestsData.content.length > 0 ? (
                <div className="space-y-3">
                  {pullRequestsData.content.map((pr) => (
                    <div
                      key={pr.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="font-medium text-gray-900">
                              #{pr.prNumber}
                            </span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getPRStatusColor(
                                pr.status,
                                pr.isMerged
                              )}`}
                            >
                              {pr.isMerged ? "Merged" : pr.status}
                            </span>
                            <span className="text-sm text-gray-600">
                              by {pr.authorUsername}
                            </span>
                            <span className="text-sm text-gray-500">
                              {formatDate(pr.createdDate)}
                            </span>
                          </div>

                          <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">
                            {pr.title}
                          </h4>

                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span className="flex items-center space-x-1">
                              <GitBranch className="w-3 h-3" />
                              <span>
                                {pr.headBranch} → {pr.baseBranch}
                              </span>
                            </span>
                            {pr.additions !== null && pr.deletions !== null && (
                              <>
                                <span className="text-green-600">
                                  +{pr.additions}
                                </span>
                                <span className="text-red-600">
                                  -{pr.deletions}
                                </span>
                              </>
                            )}
                            {pr.commitsCount && (
                              <span>
                                {pr.commitsCount} commit
                                {pr.commitsCount !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>

                        <a
                          href={pr.prUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-gray-600 ml-4"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <GitPullRequest className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No pull requests yet
                  </h3>
                  <p className="text-gray-600">
                    Pull requests will appear here once you create them in
                    connected repositories.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Connections Tab */}
          {activeSubTab === "activity" && (
            <GitHubConnectionsView
              projectId={projectId}
              projectName={projectName}
            />
          )}
        </div>
      </div>
    </div>
  );
};
