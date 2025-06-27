import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gitHubService } from "../services/gitHubService";
import type {
  CreateConnectionRequest,
  CreateTaskLinkRequest,
} from "../services/gitHubService";
import toast from "react-hot-toast";

export const useGitHubOAuth = () => {
  return useMutation({
    mutationFn: (projectId: number) => gitHubService.initiateOAuth(projectId),
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
  query: string,
  page = 1,
  perPage = 30
) => {
  return useQuery({
    queryKey: ["github", "repositories", "search", query, page, perPage],
    queryFn: () => gitHubService.searchRepositories(query, page, perPage),
    select: (data) => data.data,
    enabled: !!query.trim() && query.length >= 2,
    staleTime: 5 * 60 * 1000,
  });
};

export const useGitHubRepositoryInfo = (owner: string, repo: string) => {
  return useQuery({
    queryKey: ["github", "repository", owner, repo],
    queryFn: () => gitHubService.getRepositoryInfo(owner, repo),
    select: (data) => data.data,
    enabled: !!owner && !!repo,
    staleTime: 10 * 60 * 1000,
  });
};

export const useProjectGitHubConnections = (projectId: number) => {
  return useQuery({
    queryKey: ["github", "connections", "project", projectId],
    queryFn: () => gitHubService.getProjectConnections(projectId),
    select: (data) => data.data,
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useGitHubConnection = (connectionId: number) => {
  return useQuery({
    queryKey: ["github", "connection", connectionId],
    queryFn: () => gitHubService.getConnection(connectionId),
    select: (data) => data.data,
    enabled: !!connectionId,
    staleTime: 1 * 60 * 1000,
  });
};

export const useCreateGitHubConnection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateConnectionRequest) =>
      gitHubService.createConnection(data),
    onSuccess: (response, variables) => {
      // Invalidate all GitHub-related queries
      queryClient.invalidateQueries({
        queryKey: ["github"],
      });

      // Specifically invalidate project connections
      queryClient.invalidateQueries({
        queryKey: ["github", "connections", "project", variables.projectId],
      });

      // Invalidate project queries
      queryClient.invalidateQueries({
        queryKey: ["project", variables.projectId],
      });

      // Force refetch connections
      queryClient.refetchQueries({
        queryKey: ["github", "connections", "project", variables.projectId],
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
      // Invalidate all GitHub-related queries
      queryClient.invalidateQueries({
        queryKey: ["github"],
      });

      // Specifically invalidate connection queries
      queryClient.invalidateQueries({
        queryKey: ["github", "connections"],
      });

      // Invalidate project queries too
      queryClient.invalidateQueries({
        queryKey: ["project"],
      });

      // Force refetch of all GitHub data
      queryClient.refetchQueries({
        queryKey: ["github"],
      });

      // Remove all cached data and force fresh fetch
      queryClient.removeQueries({
        queryKey: ["github", "connections"],
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
      // Invalidate connection-specific queries
      queryClient.invalidateQueries({
        queryKey: ["github", "connection", connectionId],
      });

      // Invalidate all connections
      queryClient.invalidateQueries({
        queryKey: ["github", "connections"],
      });

      // Invalidate commits and PRs
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
    staleTime: 2 * 60 * 1000,
  });
};

export const useTaskGitHubCommits = (taskId: number) => {
  return useQuery({
    queryKey: ["github", "commits", "task", taskId],
    queryFn: () => gitHubService.getTaskCommits(taskId),
    select: (data) => data.data,
    enabled: !!taskId,
    staleTime: 1 * 60 * 1000,
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
      // Invalidate task-specific commits
      queryClient.invalidateQueries({
        queryKey: ["github", "commits", "task", variables.data.taskId],
      });

      // Invalidate task data
      queryClient.invalidateQueries({
        queryKey: ["task", variables.data.taskId],
      });

      // Force refetch task commits
      queryClient.refetchQueries({
        queryKey: ["github", "commits", "task", variables.data.taskId],
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
    staleTime: 2 * 60 * 1000,
  });
};

export const useTaskGitHubPullRequests = (taskId: number) => {
  return useQuery({
    queryKey: ["github", "pull-requests", "task", taskId],
    queryFn: () => gitHubService.getTaskPullRequests(taskId),
    select: (data) => data.data,
    enabled: !!taskId,
    staleTime: 1 * 60 * 1000,
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
      // Invalidate task-specific PRs
      queryClient.invalidateQueries({
        queryKey: ["github", "pull-requests", "task", variables.data.taskId],
      });

      // Invalidate task data
      queryClient.invalidateQueries({
        queryKey: ["task", variables.data.taskId],
      });

      // Force refetch task PRs
      queryClient.refetchQueries({
        queryKey: ["github", "pull-requests", "task", variables.data.taskId],
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

export const useProjectGitHubStatistics = (projectId: number) => {
  return useQuery({
    queryKey: ["github", "statistics", "project", projectId],
    queryFn: () => gitHubService.getProjectStatistics(projectId),
    select: (data) => data.data,
    enabled: !!projectId,
    staleTime: 10 * 60 * 1000,
  });
};

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

export const useGitHubHealth = () => {
  return useQuery({
    queryKey: ["github", "health"],
    queryFn: () => gitHubService.getHealth(),
    select: (data) => data.data,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
};
