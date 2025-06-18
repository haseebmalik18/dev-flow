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

export interface PreviewData {
  id: number;
  fileName: string;
  contentType: string;
  fileSize: number;
  fileSizeFormatted: string;
  isPreviewable: boolean;
  previewType: "image" | "pdf" | "text" | "code" | "unsupported";
  streamUrl: string;
  downloadUrl: string;
  urlExpiresAt: string;
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

  getPreviewData: async (id: number): Promise<ApiResponse<PreviewData>> => {
    const response = await api.get(`/attachments/${id}/preview`);
    return response.data;
  },

  getStreamUrl: (id: number): string => {
    return `${api.defaults.baseURL}/attachments/${id}/stream`;
  },

  getThumbnailUrl: (id: number): string => {
    return `${api.defaults.baseURL}/attachments/${id}/stream?thumbnail=true`;
  },

  getStreamData: async (
    id: number,
    thumbnail: boolean = false
  ): Promise<Blob> => {
    const response = await api.get(
      `/attachments/${id}/stream${thumbnail ? "?thumbnail=true" : ""}`,
      {
        responseType: "blob",
      }
    );
    return response.data;
  },

  getAuthenticatedStreamUrl: async (
    id: number,
    thumbnail: boolean = false
  ): Promise<string> => {
    const blob = await attachmentService.getStreamData(id, thumbnail);
    return URL.createObjectURL(blob);
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

  isPreviewableType: (contentType: string): boolean => {
    const previewableTypes = [
      // Images
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
      // Documents
      "application/pdf",
      "text/plain",
      "text/csv",
      "application/json",
      "text/xml",
      "application/xml",
      // Code
      "text/javascript",
      "text/css",
      "text/html",
      "application/javascript",
    ];

    return previewableTypes.includes(contentType.toLowerCase());
  },

  getPreviewType: (contentType: string): PreviewData["previewType"] => {
    const lowerType = contentType.toLowerCase();

    if (lowerType.startsWith("image/")) {
      return "image";
    } else if (lowerType === "application/pdf") {
      return "pdf";
    } else if (
      lowerType.startsWith("text/") ||
      lowerType.includes("json") ||
      lowerType.includes("xml")
    ) {
      return "text";
    } else if (
      lowerType.includes("javascript") ||
      lowerType.includes("css") ||
      lowerType.includes("html")
    ) {
      return "code";
    }

    return "unsupported";
  },

  supportsThumbnail: (contentType: string): boolean => {
    return contentType.toLowerCase().startsWith("image/");
  },
};
