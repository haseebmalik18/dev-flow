import api from "../config/api";
import type { ApiResponse } from "../types/auth";

export interface InvitationRequest {
  invitations: Array<{
    email: string;
    name?: string;
    role?: "DEVELOPER" | "DESIGNER" | "TESTER" | "MANAGER" | "ADMIN";
  }>;
  message?: string;
}

export interface InvitationResponse {
  id: number;
  email: string;
  invitedName: string | null;
  role: "DEVELOPER" | "DESIGNER" | "TESTER" | "MANAGER" | "ADMIN";
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "CANCELLED";
  message: string | null;
  token: string;
  expiresAt: string;
  createdAt: string;
  respondedAt: string | null;
  responseMessage: string | null;
  project: {
    id: number;
    name: string;
    description: string;
    color: string;
    teamSize: number;
  };
  invitedBy: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    jobTitle: string | null;
  };
  user: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    jobTitle: string | null;
  } | null;
}

export interface SendInvitationResponse {
  totalInvitations: number;
  successfulInvitations: number;
  failedInvitations: number;
  errors: string[];
  invitations: InvitationResponse[];
}

export interface InvitationStatsResponse {
  totalSent: number;
  pending: number;
  accepted: number;
  declined: number;
  expired: number;
}

export interface RespondToInvitationRequest {
  action: "accept" | "decline";
  message?: string;
}

export const invitationService = {
  sendInvitations: async (
    projectId: number,
    data: InvitationRequest
  ): Promise<ApiResponse<SendInvitationResponse>> => {
    const response = await api.post(`/projects/${projectId}/invitations`, data);
    return response.data;
  },

  getPendingInvitations: async (): Promise<
    ApiResponse<InvitationResponse[]>
  > => {
    const response = await api.get("/invitations/pending");
    return response.data;
  },

  getProjectInvitations: async (
    projectId: number,
    page = 0,
    size = 20
  ): Promise<
    ApiResponse<{
      content: InvitationResponse[];
      totalElements: number;
      totalPages: number;
    }>
  > => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    const response = await api.get(
      `/projects/${projectId}/invitations?${params}`
    );
    return response.data;
  },

  getInvitationByToken: async (
    token: string
  ): Promise<ApiResponse<InvitationResponse>> => {
    const response = await api.get(`/invitations/${token}`);
    return response.data;
  },

  respondToInvitation: async (
    token: string,
    data: RespondToInvitationRequest
  ): Promise<ApiResponse<InvitationResponse>> => {
    const response = await api.post(`/invitations/${token}/respond`, data);
    return response.data;
  },

  cancelInvitation: async (
    invitationId: number
  ): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/invitations/${invitationId}`);
    return response.data;
  },

  getInvitationStats: async (): Promise<
    ApiResponse<InvitationStatsResponse>
  > => {
    const response = await api.get("/invitations/stats");
    return response.data;
  },

  checkEmailExists: async (
    email: string
  ): Promise<
    ApiResponse<{
      email: string;
      exists: boolean;
      message: string;
    }>
  > => {
    const response = await api.get(
      `/users/check-email?email=${encodeURIComponent(email)}`
    );
    return response.data;
  },

  searchUsers: async (
    query: string,
    excludeProjectId?: number,
    limit = 10
  ): Promise<
    ApiResponse<
      Array<{
        id: number;
        username: string;
        email: string;
        firstName: string;
        lastName: string;
        fullName: string;
        initials: string;
        avatar: string | null;
        jobTitle: string | null;
        isVerified: boolean;
      }>
    >
  > => {
    const params = new URLSearchParams({
      query,
      limit: limit.toString(),
    });

    if (excludeProjectId) {
      params.append("excludeProjectId", excludeProjectId.toString());
    }

    const response = await api.get(`/users/search?${params}`);
    return response.data;
  },

  getUserProfile: async (
    identifier: string
  ): Promise<
    ApiResponse<{
      exists: boolean;
      id?: number;
      username?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      fullName?: string;
      avatar?: string | null;
      jobTitle?: string | null;
      isVerified?: boolean;
      identifier?: string;
      message?: string;
    }>
  > => {
    const response = await api.get(
      `/users/profile?identifier=${encodeURIComponent(identifier)}`
    );
    return response.data;
  },
};
