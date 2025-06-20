import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  attachmentService,
  type PreviewData,
} from "../services/attachmentService";

export const useTaskAttachments = (taskId: number) => {
  return useQuery({
    queryKey: ["attachments", "task", taskId],
    queryFn: () => attachmentService.getTaskAttachments(taskId),
    select: (data) => data.data,
    enabled: !!taskId,
  });
};

export const useAttachment = (id: number) => {
  return useQuery({
    queryKey: ["attachment", id],
    queryFn: () => attachmentService.getAttachment(id),
    select: (data) => data.data,
    enabled: !!id,
  });
};

export const useAttachmentPreview = (id: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: ["attachment", "preview", id],
    queryFn: () => attachmentService.getPreviewData(id),
    select: (data) => data.data,
    enabled: !!id && enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useAttachmentStreamUrl = (id: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: ["attachment", "stream", id],
    queryFn: () => attachmentService.getAuthenticatedStreamUrl(id),
    enabled: !!id && enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error && (error as any).response?.status === 401) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

export const useTaskAttachmentStats = (taskId: number) => {
  return useQuery({
    queryKey: ["attachments", "stats", "task", taskId],
    queryFn: () => attachmentService.getTaskAttachmentStats(taskId),
    select: (data) => data.data,
    enabled: !!taskId,
  });
};

export const useUploadAttachment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, file }: { taskId: number; file: File }) =>
      attachmentService.uploadAttachment(taskId, file),
    onSuccess: (data, variables) => {
      if (data.success) {
        toast.success(data.message || "File uploaded successfully");

        queryClient.invalidateQueries({
          queryKey: ["attachments", "task", variables.taskId],
        });
        queryClient.invalidateQueries({
          queryKey: ["attachments", "stats", "task", variables.taskId],
        });
        queryClient.invalidateQueries({
          queryKey: ["task", variables.taskId],
        });
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || "Failed to upload file";
      toast.error(message);
    },
  });
};

export const useDeleteAttachment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => attachmentService.deleteAttachment(id),
    onSuccess: (_, attachmentId) => {
      toast.success("Attachment deleted successfully");

      queryClient.invalidateQueries({
        queryKey: ["attachments"],
      });
      queryClient.invalidateQueries({
        queryKey: ["attachment", attachmentId],
      });
      queryClient.invalidateQueries({
        queryKey: ["attachment", "preview", attachmentId],
      });
      queryClient.invalidateQueries({
        queryKey: ["attachment", "stream", attachmentId],
      });

      queryClient.removeQueries({
        queryKey: ["attachment", "stream", attachmentId],
      });
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || "Failed to delete attachment";
      toast.error(message);
    },
  });
};

export const useDownloadAttachment = () => {
  return useMutation({
    mutationFn: (id: number) => attachmentService.getDownloadUrl(id),
    onSuccess: (data) => {
      if (data.data?.downloadUrl) {
        const link = document.createElement("a");
        link.href = data.data.downloadUrl;
        link.download = "";
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success("Download started");
      }
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || "Failed to get download URL";
      toast.error(message);
    },
  });
};

export const useBulkAttachmentPreview = (attachmentIds: number[]) => {
  return useQuery({
    queryKey: ["attachments", "bulk-preview", attachmentIds.sort()],
    queryFn: async () => {
      const previews = await Promise.allSettled(
        attachmentIds.map((id) => attachmentService.getPreviewData(id))
      );

      return previews.map((result, index) => ({
        id: attachmentIds[index],
        data: result.status === "fulfilled" ? result.value.data : null,
        error: result.status === "rejected" ? result.reason : null,
      }));
    },
    enabled: attachmentIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
};

export const useAttachmentPreviewUtils = () => {
  return {
    isPreviewable: (contentType: string) =>
      attachmentService.isPreviewableType(contentType),
    getPreviewType: (contentType: string) =>
      attachmentService.getPreviewType(contentType),
  };
};

export const useCleanupObjectUrls = () => {
  const queryClient = useQueryClient();

  const cleanupAttachmentUrls = (attachmentId: number) => {
    const streamData = queryClient.getQueryData([
      "attachment",
      "stream",
      attachmentId,
    ]);

    if (streamData && typeof streamData === "string") {
      attachmentService.revokeObjectUrl(streamData);
    }

    queryClient.removeQueries({
      queryKey: ["attachment", "stream", attachmentId],
    });
  };

  const cleanupAllUrls = () => {
    const queryCache = queryClient.getQueryCache();
    const queries = queryCache.getAll();

    queries.forEach((query) => {
      const [type, subtype] = query.queryKey;
      if (type === "attachment" && subtype === "stream") {
        const data = query.state.data;
        if (data && typeof data === "string") {
          attachmentService.revokeObjectUrl(data);
        }
      }
    });

    queryClient.removeQueries({
      predicate: (query) => {
        const [type, subtype] = query.queryKey;
        return type === "attachment" && subtype === "stream";
      },
    });
  };

  return {
    cleanupAttachmentUrls,
    cleanupAllUrls,
  };
};
