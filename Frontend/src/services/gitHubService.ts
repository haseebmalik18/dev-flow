import api from "../config/api";
import type { ApiResponse } from "../types/auth";

export interface GitHubRepository {
  id: number;
  fullName: string;
  name: string;
  owner: string;
  description: string | null;
  url: string;
  cloneUrl: string;
  defaultBranch: string;
  isPrivate: boolean;
  isFork: boolean;
  stargazersCount: number;
  forksCount: number;
  language: string | null;
  createdAt: string;
  updatedAt: string;
  pushedAt: string | null;
}

export interface GitHubConnection {
  id: number;
  repositoryFullName: string;
  repositoryUrl: string;
  repositoryId: number;
  status: "ACTIVE" | "DISCONNECTED" | "ERROR";
  webhookStatus: "ACTIVE" | "INACTIVE" | "PENDING" | "ERROR";
  webhookId: string;
  lastSyncAt: string | null;
  lastWebhookAt: string | null;
  errorMessage: string | null;
  errorCount: number;
  createdAt: string;
  updatedAt: string;
  project: {
    id: number;
    name: string;
    color: string;
  };
  connectedBy: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    jobTitle: string | null;
  };
  health: {
    isHealthy: boolean;
    status: string;
    issues: string[];
    lastCheck: string;
  };
}

export interface GitHubCommit {
  id: number;
  commitSha: string;
  shortSha: string;
  commitMessage: string;
  authorName: string;
  authorEmail: string;
  authorUsername: string | null;
  committerName: string;
  committerEmail: string;
  commitDate: string;
  commitUrl: string;
  branchName: string;
  additions: number | null;
  deletions: number | null;
  changedFiles: number | null;
  createdAt: string;
  connection: {
    id: number;
    repositoryFullName: string;
    status: string;
    webhookStatus: string;
    lastWebhookAt: string | null;
    errorCount: number;
    createdAt: string;
  };
  taskLinks: GitHubTaskLink[];
  isFromMainBranch: boolean;
}

export interface GitHubPullRequest {
  id: number;
  prNumber: number;
  title: string;
  description: string | null;
  status: "OPEN" | "CLOSED" | "DRAFT";
  mergeState: "CLEAN" | "DIRTY" | "UNSTABLE" | "DRAFT" | "BLOCKED";
  authorUsername: string;
  authorName: string | null;
  headBranch: string;
  baseBranch: string;
  headSha: string;
  mergeCommitSha: string | null;
  prUrl: string;
  createdDate: string;
  updatedDate: string;
  mergedDate: string | null;
  closedDate: string | null;
  additions: number | null;
  deletions: number | null;
  changedFiles: number | null;
  commitsCount: number | null;
  reviewCommentsCount: number | null;
  commentsCount: number | null;
  createdAt: string;
  updatedAt: string;
  connection: {
    id: number;
    repositoryFullName: string;
    status: string;
    webhookStatus: string;
    lastWebhookAt: string | null;
    errorCount: number;
    createdAt: string;
  };
  taskLinks: GitHubTaskLink[];
  isOpen: boolean;
  isMerged: boolean;
  isDraft: boolean;
  suggestedTaskStatus: string;
}

export interface GitHubTaskLink {
  id: number;
  linkType: "REFERENCE" | "CLOSES" | "FIXES" | "RESOLVES";
  referenceText: string;
  createdAt: string;
  task: {
    id: number;
    title: string;
    status: string;
    priority: string;
    dueDate: string | null;
    isOverdue: boolean;
  };
}

export interface CreateConnectionRequest {
  projectId: number;
  repositoryFullName: string;
  repositoryUrl: string;
  repositoryId: number;
  accessToken?: string;
  installationId?: number;
}

export interface GitHubAuthResponse {
  accessToken: string;
  tokenType: string;
  scope: string;
  userInfo: {
    id: number;
    login: string;
    name: string | null;
    email: string | null;
    avatarUrl: string;
    htmlUrl: string;
    type: string;
  };
  accessibleRepositories: GitHubRepository[];
}

export interface GitHubStatistics {
  connections: {
    totalConnections: number;
    activeConnections: number;
    webhooksActive: number;
    connectionsWithErrors: number;
    recentActivity: number;
  };
  commits: {
    totalCommits: number;
    uniqueAuthors: number;
    uniqueBranches: number;
    totalAdditions: number;
    totalDeletions: number;
    totalChangedFiles: number;
  };
  pullRequests: {
    totalPRs: number;
    openPRs: number;
    mergedPRs: number;
    closedPRs: number;
    uniqueAuthors: number;
    avgAdditions: number;
    avgDeletions: number;
  };
  taskLinks: {
    totalLinks: number;
    commitLinks: number;
    prLinks: number;
    references: number;
    closes: number;
    fixes: number;
    resolves: number;
  };
}

export interface CreateTaskLinkRequest {
  taskId: number;
  linkType: "REFERENCE" | "CLOSES" | "FIXES" | "RESOLVES";
  referenceText?: string;
  autoStatusUpdate?: boolean;
}

export const gitHubService = {
  initiateOAuth: async (
    projectId: number
  ): Promise<ApiResponse<{ authorizationUrl: string; message: string }>> => {
    const response = await api.post(
      `/github/oauth/authorize?projectId=${projectId}`
    );
    return response.data;
  },

  handleOAuthCallback: async (
    code: string,
    state: string
  ): Promise<ApiResponse<GitHubAuthResponse>> => {
    const response = await api.post("/github/oauth/callback", { code, state });
    return response.data;
  },

  searchRepositories: async (
    query: string,
    page = 1,
    perPage = 30
  ): Promise<
    ApiResponse<{
      repositories: GitHubRepository[];
      totalCount: number;
      hasMore: boolean;
    }>
  > => {
    const response = await api.get(
      `/github/repositories/search?query=${encodeURIComponent(
        query
      )}&page=${page}&perPage=${perPage}`
    );
    return response.data;
  },

  getRepositoryInfo: async (
    owner: string,
    repo: string
  ): Promise<ApiResponse<GitHubRepository>> => {
    const response = await api.get(`/github/repositories/${owner}/${repo}`);
    return response.data;
  },

  createConnection: async (
    data: CreateConnectionRequest
  ): Promise<ApiResponse<GitHubConnection>> => {
    const response = await api.post("/github/connections", data);
    return response.data;
  },

  getProjectConnections: async (
    projectId: number
  ): Promise<ApiResponse<GitHubConnection[]>> => {
    const response = await api.get(`/github/projects/${projectId}/connections`);
    return response.data;
  },

  getConnection: async (
    connectionId: number
  ): Promise<ApiResponse<GitHubConnection>> => {
    const response = await api.get(`/github/connections/${connectionId}`);
    return response.data;
  },

  deleteConnection: async (
    connectionId: number
  ): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/github/connections/${connectionId}`);
    return response.data;
  },

  syncConnection: async (
    connectionId: number
  ): Promise<
    ApiResponse<{
      success: boolean;
      message: string;
      results?: any;
      syncedAt: string;
    }>
  > => {
    const response = await api.post(`/github/connections/${connectionId}/sync`);
    return response.data;
  },

  getProjectCommits: async (
    projectId: number,
    page = 0,
    size = 20
  ): Promise<
    ApiResponse<{
      content: GitHubCommit[];
      totalElements: number;
      totalPages: number;
      hasNext: boolean;
    }>
  > => {
    const response = await api.get(
      `/github/projects/${projectId}/commits?page=${page}&size=${size}`
    );
    return response.data;
  },

  getTaskCommits: async (
    taskId: number
  ): Promise<ApiResponse<GitHubCommit[]>> => {
    const response = await api.get(`/github/tasks/${taskId}/commits`);
    return response.data;
  },

  createCommitTaskLink: async (
    commitId: number,
    data: CreateTaskLinkRequest
  ): Promise<ApiResponse<GitHubTaskLink>> => {
    const response = await api.post(`/github/commits/${commitId}/links`, data);
    return response.data;
  },

  getProjectPullRequests: async (
    projectId: number,
    page = 0,
    size = 20
  ): Promise<
    ApiResponse<{
      content: GitHubPullRequest[];
      totalElements: number;
      totalPages: number;
      hasNext: boolean;
    }>
  > => {
    const response = await api.get(
      `/github/projects/${projectId}/pull-requests?page=${page}&size=${size}`
    );
    return response.data;
  },

  getTaskPullRequests: async (
    taskId: number
  ): Promise<ApiResponse<GitHubPullRequest[]>> => {
    const response = await api.get(`/github/tasks/${taskId}/pull-requests`);
    return response.data;
  },

  createPRTaskLink: async (
    prId: number,
    data: CreateTaskLinkRequest
  ): Promise<ApiResponse<GitHubTaskLink>> => {
    const response = await api.post(
      `/github/pull-requests/${prId}/links`,
      data
    );
    return response.data;
  },

  getProjectStatistics: async (
    projectId: number
  ): Promise<ApiResponse<GitHubStatistics>> => {
    const response = await api.get(`/github/projects/${projectId}/statistics`);
    return response.data;
  },

  search: async (request: {
    type: "commits" | "pullRequests";
    query?: string;
    projectId?: number;
    page?: number;
    size?: number;
  }): Promise<
    ApiResponse<{
      type: string;
      results: any[];
      totalCount: number;
      currentPage: number;
      totalPages: number;
      hasMore: boolean;
    }>
  > => {
    const response = await api.post("/github/search", request);
    return response.data;
  },

  getHealth: async (): Promise<
    ApiResponse<{
      status: string;
      timestamp: string;
      version: string;
    }>
  > => {
    const response = await api.get("/github/health");
    return response.data;
  },
};
