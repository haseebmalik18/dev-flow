import React, { useState } from "react";
import {
  Download,
  Trash2,
  Eye,
  Image,
  FileText,
  Archive,
  File,
  MoreHorizontal,
  ExternalLink,
} from "lucide-react";
import { Button } from "../ui/Button";
import {
  useTaskAttachments,
  useDeleteAttachment,
  useDownloadAttachment,
} from "../../hooks/useAttachments";
import type { AttachmentSummary } from "../../services/attachmentService";

interface AttachmentListProps {
  taskId: number;
  className?: string;
  showStats?: boolean;
}

interface AttachmentItemProps {
  attachment: AttachmentSummary;
  onDelete: (id: number) => void;
  onDownload: (id: number) => void;
}

const AttachmentItem: React.FC<AttachmentItemProps> = ({
  attachment,
  onDelete,
  onDownload,
}) => {
  const [showActions, setShowActions] = useState(false);

  const getFileIcon = () => {
    if (attachment.isImage) {
      return <Image className="w-5 h-5 text-blue-500" />;
    } else if (attachment.isDocument) {
      return <FileText className="w-5 h-5 text-red-500" />;
    } else if (attachment.isArchive) {
      return <Archive className="w-5 h-5 text-yellow-500" />;
    }
    return <File className="w-5 h-5 text-gray-500" />;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  return (
    <div className="group flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
      <div className="flex-shrink-0">{getFileIcon()}</div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium text-gray-900 truncate">
            {attachment.originalFileName}
          </p>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {attachment.fileExtension.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500">
          <span>{attachment.fileSizeFormatted}</span>
          <span>•</span>
          <span>Uploaded by {attachment.uploadedBy.firstName}</span>
          <span>•</span>
          <span>{formatTimeAgo(attachment.createdAt)}</span>
        </div>
      </div>

      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onDownload(attachment.id)}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Download"
        >
          <Download className="w-4 h-4 text-gray-600" />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
          >
            <MoreHorizontal className="w-4 h-4 text-gray-600" />
          </button>

          {showActions && (
            <div className="absolute right-0 top-10 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[140px]">
              <button
                onClick={() => {
                  onDownload(attachment.id);
                  setShowActions(false);
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>

              {attachment.isImage && (
                <button
                  onClick={() => {
                    // Could implement preview modal here
                    setShowActions(false);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Eye className="w-4 h-4" />
                  <span>Preview</span>
                </button>
              )}

              <button
                onClick={() => {
                  onDownload(attachment.id);
                  setShowActions(false);
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open</span>
              </button>

              <div className="border-t border-gray-100 my-1" />

              <button
                onClick={() => {
                  if (
                    window.confirm(
                      "Are you sure you want to delete this attachment?"
                    )
                  ) {
                    onDelete(attachment.id);
                  }
                  setShowActions(false);
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const AttachmentList: React.FC<AttachmentListProps> = ({
  taskId,
  className = "",
  showStats = false,
}) => {
  const { data: attachments, isLoading, error } = useTaskAttachments(taskId);

  const deleteAttachmentMutation = useDeleteAttachment();
  const downloadAttachmentMutation = useDownloadAttachment();

  const handleDelete = async (attachmentId: number) => {
    try {
      await deleteAttachmentMutation.mutateAsync(attachmentId);
    } catch (error) {
      // Error handled by mutation hook
    }
  };

  const handleDownload = async (attachmentId: number) => {
    try {
      await downloadAttachmentMutation.mutateAsync(attachmentId);
    } catch (error) {
      // Error handled by mutation hook
    }
  };

  if (error) {
    return (
      <div className={`text-center py-4 ${className}`}>
        <p className="text-sm text-red-600">Failed to load attachments</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="flex items-center space-x-3 p-3">
              <div className="w-5 h-5 bg-gray-200 rounded"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!attachments || attachments.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <File className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No attachments yet</p>
      </div>
    );
  }

  const stats = attachments.reduce(
    (acc, attachment) => {
      if (attachment.isImage) acc.images++;
      else if (attachment.isDocument) acc.documents++;
      else if (attachment.isArchive) acc.archives++;
      else acc.others++;
      return acc;
    },
    { images: 0, documents: 0, archives: 0, others: 0 }
  );

  return (
    <div className={className}>
      {showStats && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {stats.images}
              </div>
              <div className="text-xs text-gray-500">Images</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {stats.documents}
              </div>
              <div className="text-xs text-gray-500">Documents</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {stats.archives}
              </div>
              <div className="text-xs text-gray-500">Archives</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {stats.others}
              </div>
              <div className="text-xs text-gray-500">Others</div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-1">
        {attachments.map((attachment) => (
          <AttachmentItem
            key={attachment.id}
            attachment={attachment}
            onDelete={handleDelete}
            onDownload={handleDownload}
          />
        ))}
      </div>
    </div>
  );
};
