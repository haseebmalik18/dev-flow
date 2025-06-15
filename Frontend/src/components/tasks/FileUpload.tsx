import React, { useCallback, useState } from "react";
import {
  useDropzone,
  type DropzoneOptions,
  type FileRejection,
  type Accept,
} from "react-dropzone";
import {
  Upload,
  File,
  Image,
  FileText,
  Archive,
  X,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Button } from "../ui/Button";
import { useUploadAttachment } from "../../hooks/useAttachments";

interface FileUploadProps {
  taskId: number;
  onUploadComplete?: () => void;
  maxSize?: number;
  acceptedTypes?: Accept;
  className?: string;
}

interface FileWithPreview extends File {
  preview?: string;
  uploadProgress?: number;
  uploadStatus?: "pending" | "uploading" | "success" | "error";
  errorMessage?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  taskId,
  onUploadComplete,
  maxSize = 10 * 1024 * 1024,
  acceptedTypes = {
    "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"],
    "application/pdf": [".pdf"],
    "application/msword": [".doc"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
      ".docx",
    ],
    "application/vnd.ms-excel": [".xls"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
      ".xlsx",
    ],
    "text/plain": [".txt"],
    "application/zip": [".zip"],
    "application/x-rar-compressed": [".rar"],
    "application/x-7z-compressed": [".7z"],
    "application/json": [".json"],
    "text/xml": [".xml"],
    "application/xml": [".xml"],
  },
  className = "",
}) => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const uploadMutation = useUploadAttachment();

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      if (rejectedFiles.length > 0) {
        rejectedFiles.forEach((rejection) => {
          const errors = rejection.errors.map((e) => e.message).join(", ");
          console.error(`File ${rejection.file.name} rejected: ${errors}`);
        });
      }

      const newFiles = acceptedFiles.map((file) => {
        const fileWithPreview = file as FileWithPreview;
        fileWithPreview.uploadStatus = "pending";

        if (file.type.startsWith("image/")) {
          fileWithPreview.preview = URL.createObjectURL(file);
        }

        return fileWithPreview;
      });

      setFiles((prev) => [...prev, ...newFiles]);
    },
    []
  );

  const dropzoneOptions: DropzoneOptions = {
    onDrop,
    maxSize,
    accept: acceptedTypes,
    multiple: true,
    onDragEnter: () => {},
    onDragOver: () => {},
    onDragLeave: () => {},
  };

  const { getRootProps, getInputProps, isDragActive } =
    useDropzone(dropzoneOptions);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev];
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  }, []);

  const uploadFile = useCallback(
    async (file: FileWithPreview, index: number) => {
      setFiles((prev) => {
        const newFiles = [...prev];
        newFiles[index].uploadStatus = "uploading";
        return newFiles;
      });

      try {
        await uploadMutation.mutateAsync({ taskId, file });

        setFiles((prev) => {
          const newFiles = [...prev];
          newFiles[index].uploadStatus = "success";
          return newFiles;
        });

        setTimeout(() => removeFile(index), 2000);

        onUploadComplete?.();
      } catch (error: any) {
        setFiles((prev) => {
          const newFiles = [...prev];
          newFiles[index].uploadStatus = "error";
          newFiles[index].errorMessage =
            error.response?.data?.message || "Upload failed";
          return newFiles;
        });
      }
    },
    [taskId, uploadMutation, removeFile, onUploadComplete]
  );

  const uploadAllFiles = useCallback(() => {
    files
      .filter((file) => file.uploadStatus === "pending")
      .forEach((file, originalIndex) => {
        const actualIndex = files.findIndex((f) => f === file);
        uploadFile(file, actualIndex);
      });
  }, [files, uploadFile]);

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return <Image className="w-6 h-6 text-blue-500" />;
    } else if (
      file.type === "application/pdf" ||
      file.type.includes("document") ||
      file.type === "text/plain"
    ) {
      return <FileText className="w-6 h-6 text-red-500" />;
    } else if (file.type.includes("zip") || file.type.includes("compressed")) {
      return <Archive className="w-6 h-6 text-yellow-500" />;
    }
    return <File className="w-6 h-6 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "uploading":
        return (
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        );
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <input {...getInputProps()} type="file" />
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        {isDragActive ? (
          <p className="text-blue-600">Drop the files here...</p>
        ) : (
          <div>
            <p className="text-gray-600 mb-1">
              Drag and drop files here, or click to select
            </p>
            <p className="text-sm text-gray-500">
              Max file size: {formatFileSize(maxSize)}
            </p>
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">
              Files to upload ({files.length})
            </h4>
            {files.some((f) => f.uploadStatus === "pending") && (
              <Button
                onClick={uploadAllFiles}
                disabled={uploadMutation.isPending}
                size="sm"
              >
                Upload All
              </Button>
            )}
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-shrink-0">
                  {file.preview ? (
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="w-10 h-10 object-cover rounded"
                      onLoad={() => URL.revokeObjectURL(file.preview!)}
                    />
                  ) : (
                    getFileIcon(file)
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    {getStatusIcon(file.uploadStatus!)}
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>{formatFileSize(file.size)}</span>
                    {file.uploadStatus === "error" && file.errorMessage && (
                      <>
                        <span>•</span>
                        <span className="text-red-500">
                          {file.errorMessage}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  {file.uploadStatus === "pending" && (
                    <Button
                      onClick={() => uploadFile(file, index)}
                      disabled={uploadMutation.isPending}
                      size="sm"
                      variant="outline"
                    >
                      Upload
                    </Button>
                  )}

                  {file.uploadStatus !== "uploading" && (
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
