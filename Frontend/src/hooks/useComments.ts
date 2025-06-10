import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { commentService } from "../services/commentService";
import type {
  CreateCommentRequest,
  UpdateCommentRequest,
} from "../services/commentService";
import toast from "react-hot-toast";

export const useComments = (taskId: number) => {
  return useQuery({
    queryKey: ["comments", "task", taskId],
    queryFn: () => commentService.getTaskComments(taskId),
    select: (data) => data.data,
    enabled: !!taskId,
    staleTime: 1 * 60 * 1000,
  });
};

export const useProjectComments = (projectId: number) => {
  return useQuery({
    queryKey: ["comments", "project", projectId],
    queryFn: () => commentService.getProjectComments(projectId),
    select: (data) => data.data,
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useComment = (id: number) => {
  return useQuery({
    queryKey: ["comment", id],
    queryFn: () => commentService.getComment(id),
    select: (data) => data.data,
    enabled: !!id,
    staleTime: 1 * 60 * 1000,
  });
};

export const useCreateComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCommentRequest) =>
      commentService.createComment(data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["comments", "task", variables.taskId],
      });

      queryClient.invalidateQueries({
        queryKey: ["task", variables.taskId],
      });

      if (variables.projectId) {
        queryClient.invalidateQueries({
          queryKey: ["comments", "project", variables.projectId],
        });
      }

      toast.success(response.message || "Comment added successfully!");
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || "Failed to add comment";
      toast.error(message);
    },
  });
};

export const useUpdateComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & UpdateCommentRequest) =>
      commentService.updateComment(id, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["comments"] });
      queryClient.invalidateQueries({ queryKey: ["comment", variables.id] });

      toast.success(response.message || "Comment updated successfully!");
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || "Failed to update comment";
      toast.error(message);
    },
  });
};

export const useDeleteComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => commentService.deleteComment(id),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["comments"] });
      queryClient.invalidateQueries({ queryKey: ["task"] });

      toast.success(response.message || "Comment deleted successfully!");
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || "Failed to delete comment";
      toast.error(message);
    },
  });
};

export const useReplyToComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      parentId,
      ...data
    }: { parentId: number } & CreateCommentRequest) =>
      commentService.replyToComment(parentId, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["comments", "task", variables.taskId],
      });

      queryClient.invalidateQueries({
        queryKey: ["task", variables.taskId],
      });

      toast.success(response.message || "Reply added successfully!");
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || "Failed to add reply";
      toast.error(message);
    },
  });
};

export const useMentionUsers = (searchTerm: string, projectId?: number) => {
  return useQuery({
    queryKey: ["users", "mention", searchTerm, projectId],
    queryFn: () => commentService.searchMentionableUsers(searchTerm, projectId),
    select: (data) => data.data,
    enabled: !!searchTerm.trim() && searchTerm.length >= 2,
    staleTime: 5 * 60 * 1000,
  });
};
