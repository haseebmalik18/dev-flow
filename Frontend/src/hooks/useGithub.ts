import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gitHubService } from "../services/githubService";
import type {
  CreateConnectionRequest,
  CreateTaskLinkRequest,
} from "../services/githubService";
import toast from "react-hot-toast";

// OAuth Hooks
export const useGitHubOAuth = () => {
  return useMutation({
    mutationFn: (projectId: number) => gitHubService.initiateOAuth(projectId),
    onSuccess: (data) => {
      if (data.data?.authorizationUrl) {
        window.open(
          data.data.authorizationUrl,
          "_blank",
          "width=600,height=700"
        );
      }
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || "Failed to initiate GitHub OAuth";
      toast.error(message);
    },
  });
};

export const useGitHubOAuthCallback = () => {
  return useMutation({
    mutationFn: ({ code, state }: { code: string; state: string }) =>
      gitHubService.handleOAuthCallback(code, state),
    onError: (error: any) => {
      const message =
        error.response?.data?.message || "Failed to complete GitHub OAuth";
      toast.error(message);
    },
  });
};

export const useSearchGitHubRepositories = (
  accessToken: string,
  query: string,
  page = 1,
  perPage = 30
) => {
  return useQuery({
    queryKey: [
      "github",
      "repositories",
      "search",
      accessToken,
      query,
      page,
      perPage,
    ],
    queryFn: () =>
      gitHubService.searchRepositories(accessToken, query, page, perPage),
    select: (data) => data.data,
    enabled: !!accessToken && !!query.trim() && query.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useGitHubRepositoryInfo = (
  accessToken: string,
  owner: string,
  repo: string
) => {
  return useQuery({
    queryKey: ["github", "repository", accessToken, owner, repo],
    queryFn: () => gitHubService.getRepositoryInfo(accessToken, owner, repo),
    select: (data) => data.data,
    enabled: !!accessToken && !!owner && !!repo,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Connection Hooks
export const useProjectGitHubConnections = (projectId: number) => {
  return useQuery({
    queryKey: ["github", "connections", "project", projectId],
    queryFn: () => gitHubService.getProjectConnections(projectId),
    select: (data) => data.data,
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useGitHubConnection = (connectionId: number) => {
  return useQuery({
    queryKey: ["github", "connection", connectionId],
    queryFn: () => gitHubService.getConnection(connectionId),
    select: (data) => data.data,
    enabled: !!connectionId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

export const useCreateGitHubConnection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateConnectionRequest) =>
      gitHubService.createConnection(data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["github", "connections", "project", variables.projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["project", variables.projectId],
      });

      toast.success(
        response.message || "GitHub repository connected successfully!"
      );
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || "Failed to connect GitHub repository";
      toast.error(message);
    },
  });
};

export const useDeleteGitHubConnection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectionId: number) =>
      gitHubService.deleteConnection(connectionId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: ["github", "connections"],
      });
      queryClient.invalidateQueries({
        queryKey: ["project"],
      });

      toast.success(
        response.message || "GitHub connection removed successfully!"
      );
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || "Failed to remove GitHub connection";
      toast.error(message);
    },
  });
};

export const useSyncGitHubConnection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectionId: number) =>
      gitHubService.syncConnection(connectionId),
    onSuccess: (response, connectionId) => {
      queryClient.invalidateQueries({
        queryKey: ["github", "connection", connectionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["github", "commits"],
      });
      queryClient.invalidateQueries({
        queryKey: ["github", "pull-requests"],
      });

      toast.success(
        response.data?.message || "GitHub connection synced successfully!"
      );
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || "Failed to sync GitHub connection";
      toast.error(message);
    },
  });
};

// Commits Hooks
export const useProjectGitHubCommits = (
  projectId: number,
  page = 0,
  size = 20
) => {
  return useQuery({
    queryKey: ["github", "commits", "project", projectId, page, size],
    queryFn: () => gitHubService.getProjectCommits(projectId, page, size),
    select: (data) => data.data,
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useTaskGitHubCommits = (taskId: number) => {
  return useQuery({
    queryKey: ["github", "commits", "task", taskId],
    queryFn: () => gitHubService.getTaskCommits(taskId),
    select: (data) => data.data,
    enabled: !!taskId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

export const useCreateCommitTaskLink = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      commitId,
      data,
    }: {
      commitId: number;
      data: CreateTaskLinkRequest;
    }) => gitHubService.createCommitTaskLink(commitId, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["github", "commits", "task", variables.data.taskId],
      });
      queryClient.invalidateQueries({
        queryKey: ["task", variables.data.taskId],
      });

      toast.success(response.message || "Commit linked to task successfully!");
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || "Failed to link commit to task";
      toast.error(message);
    },
  });
};

// Pull Requests Hooks
export const useProjectGitHubPullRequests = (
  projectId: number,
  page = 0,
  size = 20
) => {
  return useQuery({
    queryKey: ["github", "pull-requests", "project", projectId, page, size],
    queryFn: () => gitHubService.getProjectPullRequests(projectId, page, size),
    select: (data) => data.data,
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useTaskGitHubPullRequests = (taskId: number) => {
  return useQuery({
    queryKey: ["github", "pull-requests", "task", taskId],
    queryFn: () => gitHubService.getTaskPullRequests(taskId),
    select: (data) => data.data,
    enabled: !!taskId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

export const useCreatePRTaskLink = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      prId,
      data,
    }: {
      prId: number;
      data: CreateTaskLinkRequest;
    }) => gitHubService.createPRTaskLink(prId, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["github", "pull-requests", "task", variables.data.taskId],
      });
      queryClient.invalidateQueries({
        queryKey: ["task", variables.data.taskId],
      });

      toast.success(
        response.message || "Pull request linked to task successfully!"
      );
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || "Failed to link pull request to task";
      toast.error(message);
    },
  });
};

// Statistics Hooks
export const useProjectGitHubStatistics = (projectId: number) => {
  return useQuery({
    queryKey: ["github", "statistics", "project", projectId],
    queryFn: () => gitHubService.getProjectStatistics(projectId),
    select: (data) => data.data,
    enabled: !!projectId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Search Hooks
export const useGitHubSearch = () => {
  return useMutation({
    mutationFn: (request: {
      type: "commits" | "pullRequests";
      query?: string;
      projectId?: number;
      page?: number;
      size?: number;
    }) => gitHubService.search(request),
    onError: (error: any) => {
      const message = error.response?.data?.message || "GitHub search failed";
      toast.error(message);
    },
  });
};

// Health Hook
export const useGitHubHealth = () => {
  return useQuery({
    queryKey: ["github", "health"],
    queryFn: () => gitHubService.getHealth(),
    select: (data) => data.data,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};
