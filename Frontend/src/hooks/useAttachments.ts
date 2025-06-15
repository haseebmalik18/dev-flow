import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { attachmentService } from "../services/attachmentService";

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
        window.open(data.data.downloadUrl, "_blank");
      }
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || "Failed to get download URL";
      toast.error(message);
    },
  });
};
