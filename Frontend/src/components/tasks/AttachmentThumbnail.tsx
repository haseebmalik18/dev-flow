import React, { useState, useEffect } from "react";
import {
  Eye,
  Download,
  FileText,
  Image as ImageIcon,
  File,
  PlayCircle,
  Code,
  Archive,
  AlertCircle,
  Plus,
} from "lucide-react";
import { Button } from "../ui/Button";
import { AttachmentPreview } from "./AttachmentPreview";
import {
  useAttachmentPreviewUtils,
  useAttachmentThumbnail,
  useCleanupObjectUrls,
} from "../../hooks/useAttachments";
import {
  attachmentService,
  type AttachmentSummary,
} from "../../services/attachmentService";

interface AttachmentThumbnailProps {
  attachment: AttachmentSummary;
  size?: "sm" | "md" | "lg";
  showPreviewButton?: boolean;
  showDownloadButton?: boolean;
  onClick?: (attachment: AttachmentSummary) => void;
  className?: string;
}

export const AttachmentThumbnail: React.FC<AttachmentThumbnailProps> = ({
  attachment,
  size = "md",
  showPreviewButton = true,
  showDownloadButton = true,
  onClick,
  className = "",
}) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { isPreviewable, getPreviewType, supportsThumbnail } =
    useAttachmentPreviewUtils();
  const { cleanupAttachmentUrls } = useCleanupObjectUrls();

  const shouldLoadThumbnail =
    attachment.isImage && supportsThumbnail(attachment.contentType);
  const {
    data: thumbnailUrl,
    isLoading: isLoadingThumbnail,
    error: thumbnailError,
  } = useAttachmentThumbnail(attachment.id, shouldLoadThumbnail);

  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  };

  const iconSizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  useEffect(() => {
    return () => {
      if (shouldLoadThumbnail) {
        cleanupAttachmentUrls(attachment.id);
      }
    };
  }, [attachment.id, shouldLoadThumbnail, cleanupAttachmentUrls]);

  const getFileIcon = () => {
    const iconSize = iconSizeClasses[size];

    if (attachment.isImage && (thumbnailUrl || isLoadingThumbnail)) {
      return null;
    }

    if (attachment.isImage) {
      return <ImageIcon className={`${iconSize} text-blue-500`} />;
    } else if (attachment.isDocument) {
      return <FileText className={`${iconSize} text-red-500`} />;
    } else if (attachment.isArchive) {
      return <Archive className={`${iconSize} text-yellow-500`} />;
    } else if (attachment.contentType?.includes("video")) {
      return <PlayCircle className={`${iconSize} text-purple-500`} />;
    } else if (getPreviewType(attachment.contentType) === "code") {
      return <Code className={`${iconSize} text-green-500`} />;
    }

    return <File className={`${iconSize} text-gray-500`} />;
  };

  const getPreviewIndicator = () => {
    if (!isPreviewable(attachment.contentType)) return null;

    const previewType = getPreviewType(attachment.contentType);
    const indicatorClasses =
      "absolute top-1 right-1 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs";

    switch (previewType) {
      case "image":
        return (
          <div className={indicatorClasses} title="Image preview available">
            <ImageIcon className="w-3 h-3" />
          </div>
        );
      case "pdf":
        return (
          <div className={indicatorClasses} title="PDF preview available">
            <FileText className="w-3 h-3" />
          </div>
        );
      case "text":
      case "code":
        return (
          <div className={indicatorClasses} title="Text preview available">
            <Eye className="w-3 h-3" />
          </div>
        );
      default:
        return null;
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick(attachment);
    } else if (isPreviewable(attachment.contentType)) {
      setIsPreviewOpen(true);
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();

    attachmentService.getDownloadUrl(attachment.id).then((response) => {
      if (response.data?.downloadUrl) {
        window.open(response.data.downloadUrl, "_blank");
      }
    });
  };

  const handlePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPreviewOpen(true);
  };

  const renderThumbnailContent = () => {
    if (shouldLoadThumbnail) {
      if (isLoadingThumbnail) {
        return (
          <div className="flex items-center justify-center w-full h-full bg-gray-100">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        );
      }

      if (thumbnailUrl && !thumbnailError) {
        return (
          <img
            src={thumbnailUrl as string}
            alt={attachment.originalFileName}
            className="w-full h-full object-cover"
            onError={() => {
              console.error(
                "Failed to load thumbnail image for:",
                attachment.originalFileName
              );
            }}
          />
        );
      }

      if (thumbnailError) {
        return (
          <div className="flex items-center justify-center w-full h-full bg-gray-100">
            <AlertCircle className={`${iconSizeClasses[size]} text-gray-400`} />
          </div>
        );
      }
    }

    return (
      <div className="flex items-center justify-center w-full h-full">
        {getFileIcon()}
      </div>
    );
  };

  return (
    <>
      <div
        className={`relative border border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow group ${
          onClick || isPreviewable(attachment.contentType)
            ? "cursor-pointer"
            : ""
        } ${className}`}
      >
        <div
          className={`${sizeClasses[size]} flex items-center justify-center bg-gray-50 relative`}
          onClick={handleClick}
        >
          {renderThumbnailContent()}

          {getPreviewIndicator()}

          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-1">
            {showPreviewButton && isPreviewable(attachment.contentType) && (
              <Button
                size="sm"
                variant="outline"
                className="bg-white bg-opacity-90 hover:bg-white"
                onClick={handlePreview}
              >
                <Eye className="w-3 h-3" />
              </Button>
            )}
            {showDownloadButton && (
              <Button
                size="sm"
                variant="outline"
                className="bg-white bg-opacity-90 hover:bg-white"
                onClick={handleDownload}
              >
                <Download className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        <div className="p-2">
          <p
            className="text-xs font-medium text-gray-900 truncate"
            title={attachment.originalFileName}
          >
            {attachment.originalFileName}
          </p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-gray-500">
              {attachment.fileSizeFormatted}
            </span>
            <span className="text-xs text-gray-400 bg-gray-100 px-1 py-0.5 rounded">
              {attachment.fileExtension.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {isPreviewOpen && (
        <AttachmentPreview
          attachment={attachment}
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </>
  );
};

interface AttachmentThumbnailGridProps {
  attachments: AttachmentSummary[];
  maxItems?: number;
  size?: "sm" | "md" | "lg";
  onAttachmentClick?: (attachment: AttachmentSummary) => void;
  className?: string;
}

export const AttachmentThumbnailGrid: React.FC<
  AttachmentThumbnailGridProps
> = ({
  attachments,
  maxItems = 6,
  size = "md",
  onAttachmentClick,
  className = "",
}) => {
  const [selectedAttachment, setSelectedAttachment] =
    useState<AttachmentSummary | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const displayAttachments = attachments.slice(0, maxItems);
  const remainingCount = Math.max(0, attachments.length - maxItems);

  const handleAttachmentClick = (attachment: AttachmentSummary) => {
    if (onAttachmentClick) {
      onAttachmentClick(attachment);
    } else {
      setSelectedAttachment(attachment);
      setIsPreviewOpen(true);
    }
  };

  const gridClasses = {
    sm: "grid-cols-6 gap-2",
    md: "grid-cols-4 gap-3",
    lg: "grid-cols-3 gap-4",
  };

  if (attachments.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <File className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No attachments</p>
      </div>
    );
  }

  return (
    <>
      <div className={`grid ${gridClasses[size]} ${className}`}>
        {displayAttachments.map((attachment) => (
          <AttachmentThumbnail
            key={attachment.id}
            attachment={attachment}
            size={size}
            onClick={handleAttachmentClick}
          />
        ))}

        {remainingCount > 0 && (
          <div
            className={`${
              size === "sm"
                ? "w-16 h-16"
                : size === "md"
                ? "w-24 h-24"
                : "w-32 h-32"
            } border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors`}
            onClick={() => onAttachmentClick?.(attachments[0])}
          >
            <div className="text-center">
              <Plus
                className={`${
                  size === "sm"
                    ? "w-4 h-4"
                    : size === "md"
                    ? "w-6 h-6"
                    : "w-8 h-8"
                } text-gray-400 mx-auto mb-1`}
              />
              <span className="text-xs text-gray-500">+{remainingCount}</span>
            </div>
          </div>
        )}
      </div>

      {selectedAttachment && (
        <AttachmentPreview
          attachment={selectedAttachment}
          attachments={attachments}
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false);
            setSelectedAttachment(null);
          }}
        />
      )}
    </>
  );
};
