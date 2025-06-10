import api from "../config/api";
import type { ApiResponse } from "../types/auth";

export interface Comment {
  id: number;
  content: string;
  task?: {
    id: number;
    title: string;
  };
  project?: {
    id: number;
    name: string;
  };
  author: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    jobTitle: string | null;
  };
  parentComment?: {
    id: number;
    content: string;
    author: {
      firstName: string;
      lastName: string;
    };
  };
  replies: Comment[];
  mentionedUsers: Array<{
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  }>;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentRequest {
  content: string;
  taskId?: number;
  projectId?: number;
  parentCommentId?: number;
  mentionedUserIds?: number[];
}

export interface UpdateCommentRequest {
  content: string;
  mentionedUserIds?: number[];
}

export interface MentionableUser {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  jobTitle: string | null;
}

export const commentService = {
  getTaskComments: async (taskId: number): Promise<ApiResponse<Comment[]>> => {
    const response = await api.get(`/comments/task/${taskId}`);
    return response.data;
  },

  getProjectComments: async (
    projectId: number
  ): Promise<ApiResponse<Comment[]>> => {
    const response = await api.get(`/comments/project/${projectId}`);
    return response.data;
  },

  getComment: async (id: number): Promise<ApiResponse<Comment>> => {
    const response = await api.get(`/comments/${id}`);
    return response.data;
  },

  createComment: async (
    data: CreateCommentRequest
  ): Promise<ApiResponse<Comment>> => {
    const response = await api.post("/comments", data);
    return response.data;
  },

  updateComment: async (
    id: number,
    data: UpdateCommentRequest
  ): Promise<ApiResponse<Comment>> => {
    const response = await api.put(`/comments/${id}`, data);
    return response.data;
  },

  deleteComment: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/comments/${id}`);
    return response.data;
  },

  replyToComment: async (
    parentId: number,
    data: CreateCommentRequest
  ): Promise<ApiResponse<Comment>> => {
    const requestData = {
      ...data,
      parentCommentId: parentId,
    };
    const response = await api.post("/comments", requestData);
    return response.data;
  },

  searchMentionableUsers: async (
    searchTerm: string,
    projectId?: number
  ): Promise<ApiResponse<MentionableUser[]>> => {
    const params = new URLSearchParams({
      search: searchTerm,
    });

    if (projectId) {
      params.append("projectId", projectId.toString());
    }

    const response = await api.get(`/users/mentionable?${params}`);
    return response.data;
  },

  getRecentComments: async (
    page = 0,
    size = 20
  ): Promise<
    ApiResponse<{
      content: Comment[];
      totalElements: number;
      totalPages: number;
    }>
  > => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });

    const response = await api.get(`/comments/recent?${params}`);
    return response.data;
  },

  searchComments: async (
    query: string,
    projectId?: number,
    page = 0,
    size = 20
  ): Promise<
    ApiResponse<{
      content: Comment[];
      totalElements: number;
      totalPages: number;
    }>
  > => {
    const params = new URLSearchParams({
      query,
      page: page.toString(),
      size: size.toString(),
    });

    if (projectId) {
      params.append("projectId", projectId.toString());
    }

    const response = await api.get(`/comments/search?${params}`);
    return response.data;
  },

  getMentions: async (
    page = 0,
    size = 20
  ): Promise<
    ApiResponse<{
      content: Comment[];
      totalElements: number;
      totalPages: number;
    }>
  > => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });

    const response = await api.get(`/comments/mentions?${params}`);
    return response.data;
  },
};
