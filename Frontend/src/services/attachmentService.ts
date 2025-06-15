import api from "../config/api";
import type { ApiResponse } from "../types/auth";

export interface AttachmentSummary {
  id: number;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  fileSizeFormatted: string;
  contentType: string;
  fileExtension: string;
  isImage: boolean;
  isDocument: boolean;
  isArchive: boolean;
  createdAt: string;
  uploadedBy: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    jobTitle: string | null;
  };
}

export interface AttachmentResponse extends AttachmentSummary {
  downloadUrl: string;
  urlExpiresAt: string;
  task: {
    id: number;
    title: string;
    status: string;
    project: {
      id: number;
      name: string;
      color: string;
    };
  };
}

export interface AttachmentStatsResponse {
  totalAttachments: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  imageCount: number;
  documentCount: number;
  archiveCount: number;
  otherCount: number;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  attachment?: AttachmentResponse;
  error?: string;
}

export const attachmentService = {
  uploadAttachment: async (
    taskId: number,
    file: File
  ): Promise<ApiResponse<AttachmentResponse>> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("taskId", taskId.toString());

    const response = await api.post("/attachments/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  getTaskAttachments: async (
    taskId: number
  ): Promise<ApiResponse<AttachmentSummary[]>> => {
    const response = await api.get(`/attachments/task/${taskId}`);
    return response.data;
  },

  getAttachment: async (
    id: number
  ): Promise<ApiResponse<AttachmentResponse>> => {
    const response = await api.get(`/attachments/${id}`);
    return response.data;
  },

  getDownloadUrl: async (
    id: number
  ): Promise<ApiResponse<{ downloadUrl: string; message: string }>> => {
    const response = await api.get(`/attachments/${id}/download`);
    return response.data;
  },

  deleteAttachment: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/attachments/${id}`);
    return response.data;
  },

  getUserAttachments: async (
    page = 0,
    size = 20
  ): Promise<
    ApiResponse<{
      content: AttachmentSummary[];
      totalElements: number;
      totalPages: number;
    }>
  > => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });

    const response = await api.get(`/attachments/user/my-uploads?${params}`);
    return response.data;
  },

  getTaskAttachmentStats: async (
    taskId: number
  ): Promise<ApiResponse<AttachmentStatsResponse>> => {
    const response = await api.get(`/attachments/task/${taskId}/stats`);
    return response.data;
  },

  getUserAttachmentStats: async (): Promise<
    ApiResponse<AttachmentStatsResponse>
  > => {
    const response = await api.get("/attachments/user/stats");
    return response.data;
  },

  searchTaskAttachments: async (
    taskId: number,
    query: string
  ): Promise<ApiResponse<AttachmentSummary[]>> => {
    const params = new URLSearchParams({ query });
    const response = await api.get(
      `/attachments/task/${taskId}/search?${params}`
    );
    return response.data;
  },

  bulkDeleteAttachments: async (
    attachmentIds: number[]
  ): Promise<
    ApiResponse<{
      total: number;
      successful: number;
      failed: number;
      message: string;
    }>
  > => {
    const response = await api.post("/attachments/bulk-delete", attachmentIds);
    return response.data;
  },
};
