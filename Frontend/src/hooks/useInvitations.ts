import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invitationService } from "../services/invitationService";
import type {
  InvitationRequest,
  RespondToInvitationRequest,
} from "../services/invitationService";
import toast from "react-hot-toast";

export const usePendingInvitations = () => {
  return useQuery({
    queryKey: ["invitations", "pending"],
    queryFn: () => invitationService.getPendingInvitations(),
    select: (data) => data.data,
    staleTime: 2 * 60 * 1000,
  });
};

export const useProjectInvitations = (
  projectId: number,
  page = 0,
  size = 20
) => {
  return useQuery({
    queryKey: ["invitations", "project", projectId, page, size],
    queryFn: () =>
      invitationService.getProjectInvitations(projectId, page, size),
    select: (data) => data.data,
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useInvitationByToken = (token: string) => {
  return useQuery({
    queryKey: ["invitation", "token", token],
    queryFn: () => invitationService.getInvitationByToken(token),
    select: (data) => data.data,
    enabled: !!token,
    retry: false,
    staleTime: 1 * 60 * 1000,
  });
};

export const useInvitationStats = () => {
  return useQuery({
    queryKey: ["invitations", "stats"],
    queryFn: () => invitationService.getInvitationStats(),
    select: (data) => data.data,
    staleTime: 10 * 60 * 1000,
  });
};

export const useSearchUsers = (
  query: string,
  excludeProjectId?: number,
  limit = 10
) => {
  return useQuery({
    queryKey: ["users", "search", query, excludeProjectId, limit],
    queryFn: () =>
      invitationService.searchUsers(query, excludeProjectId, limit),
    select: (data) => data.data,
    enabled: !!query.trim() && query.length >= 2,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCheckEmail = (email: string) => {
  return useQuery({
    queryKey: ["users", "email-check", email],
    queryFn: () => invitationService.checkEmailExists(email),
    select: (data) => data.data,
    enabled: !!email.trim() && email.includes("@"),
    staleTime: 10 * 60 * 1000,
  });
};

export const useUserProfile = (identifier: string) => {
  return useQuery({
    queryKey: ["users", "profile", identifier],
    queryFn: () => invitationService.getUserProfile(identifier),
    select: (data) => data.data,
    enabled: !!identifier.trim(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useSendInvitations = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: number;
      data: InvitationRequest;
    }) => invitationService.sendInvitations(projectId, data),
    onSuccess: (response, variables) => {
      const result = response.data;

      queryClient.invalidateQueries({
        queryKey: ["invitations", "project", variables.projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["invitations", "stats"],
      });
      queryClient.invalidateQueries({
        queryKey: ["project", variables.projectId, "members"],
      });

      if (result) {
        if (result.successfulInvitations > 0) {
          toast.success(
            `Successfully sent ${result.successfulInvitations} invitation${
              result.successfulInvitations > 1 ? "s" : ""
            }!`
          );
        }

        if (result.failedInvitations > 0) {
          result.errors.forEach((error) => {
            toast.error(error);
          });
        }
      }
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || "Failed to send invitations";
      toast.error(message);
    },
  });
};

export const useRespondToInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      token,
      data,
    }: {
      token: string;
      data: RespondToInvitationRequest;
    }) => invitationService.respondToInvitation(token, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["invitations", "pending"],
      });
      queryClient.invalidateQueries({
        queryKey: ["invitation", "token", variables.token],
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard"],
      });

      const action = variables.data.action;
      const message =
        action === "accept"
          ? "Invitation accepted successfully! Welcome to the team!"
          : "Invitation declined successfully.";

      toast.success(response.message || message);
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || "Failed to respond to invitation";
      toast.error(message);
    },
  });
};

export const useCancelInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: number) =>
      invitationService.cancelInvitation(invitationId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: ["invitations"],
      });
      queryClient.invalidateQueries({
        queryKey: ["project"],
      });

      toast.success(response.message || "Invitation cancelled successfully!");
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || "Failed to cancel invitation";
      toast.error(message);
    },
  });
};
