import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Eye,
  EyeOff,
  FileText,
  ImageIcon,
  Code,
  AlertCircle,
  Loader2,
  Maximize2,
  Minimize2,
  Trash2,
} from "lucide-react";
import { Button } from "../ui/Button";
import { attachmentService } from "../../services/attachmentService";
import type { AttachmentSummary } from "../../services/attachmentService";
import { useQuery } from "@tanstack/react-query";

interface AttachmentPreviewProps {
  attachment: AttachmentSummary;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (attachmentId: number) => void;
  onDelete?: (attachmentId: number) => void;
  attachments?: AttachmentSummary[];
  className?: string;
}

const PDFViewer: React.FC<{ attachmentId: number; fileName: string }> = ({
  attachmentId,
}) => {
  const [pdf, setPdf] = useState<any>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPdfJs = async () => {
      try {
        if (typeof window !== "undefined" && !window.pdfjsLib) {
          const script = document.createElement("script");
          script.src =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
          script.onload = () => {
            if (window.pdfjsLib) {
              window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
              loadPdf();
            }
          };
          document.head.appendChild(script);
        } else if (window.pdfjsLib) {
          loadPdf();
        }
      } catch {
        setError("Failed to load PDF viewer");
        setIsLoading(false);
      }
    };

    const loadPdf = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const streamData = await attachmentService.getStreamData(attachmentId);
        const arrayBuffer = await streamData.arrayBuffer();

        const pdfDoc = await window.pdfjsLib.getDocument({ data: arrayBuffer })
          .promise;
        setPdf(pdfDoc);
        setNumPages(pdfDoc.numPages);
        setIsLoading(false);
      } catch (err) {
        console.error("Error loading PDF:", err);
        setError("Failed to load PDF");
        setIsLoading(false);
      }
    };

    loadPdfJs();
  }, [attachmentId]);

  useEffect(() => {
    if (pdf && !isLoading) {
      renderPage(pdf, pageNumber, scale);
    }
  }, [pdf, pageNumber, scale, isLoading]);

  const renderPage = async (
    pdfDoc: any,
    pageNum: number,
    currentScale: number
  ) => {
    try {
      const page = await pdfDoc.getPage(pageNum);
      const canvas = document.getElementById("pdf-canvas") as HTMLCanvasElement;
      if (!canvas) return;

      const context = canvas.getContext("2d");
      const viewport = page.getViewport({ scale: currentScale });

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
    } catch (err) {
      console.error("Error rendering PDF page:", err);
      setError("Failed to render PDF page");
    }
  };

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(numPages, prev + 1));
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(3, prev + 0.25));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(0.5, prev - 0.25));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2">Loading PDF...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-red-600">
        <AlertCircle className="w-12 h-12 mb-2" />
        <p>{error}</p>
        <p className="text-sm text-gray-500 mt-2">
          Try downloading the file instead
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-gray-100 p-3 rounded-lg">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium">
            Page {pageNumber} of {numPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={zoomOut}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="outline" size="sm" onClick={zoomIn}>
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-auto max-h-96">
        <canvas
          id="pdf-canvas"
          className="max-w-full h-auto mx-auto"
          style={{ display: "block" }}
        />
      </div>
    </div>
  );
};

const ImageViewer: React.FC<{ attachmentId: number; fileName: string }> = ({
  attachmentId,
  fileName,
}) => {
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");

  useEffect(() => {
    const loadImage = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const streamData = await attachmentService.getStreamData(attachmentId);
        const url = URL.createObjectURL(streamData);
        setImageUrl(url);
        setIsLoading(false);
      } catch {
        setError("Failed to load image");
        setIsLoading(false);
      }
    };

    loadImage();
  }, [attachmentId]);

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setError("Failed to load image");
    setIsLoading(false);
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(5, prev + 0.25));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(0.25, prev - 0.25));
  };

  const rotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const resetView = () => {
    setScale(1.0);
    setRotation(0);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-red-600">
        <AlertCircle className="w-12 h-12 mb-2" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-gray-100 p-3 rounded-lg">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={zoomOut}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="outline" size="sm" onClick={zoomIn}>
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={rotate}>
            <RotateCw className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={resetView}>
            Reset
          </Button>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-auto max-h-96 bg-gray-50 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}
        {imageUrl && (
          <img
            src={imageUrl}
            alt={fileName}
            className="max-w-full h-auto mx-auto transition-transform duration-200"
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg)`,
              transformOrigin: "center",
            }}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}
      </div>
    </div>
  );
};

const TextViewer: React.FC<{
  attachmentId: number;
  fileName: string;
  contentType: string;
}> = ({ attachmentId, fileName, contentType }) => {
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [wordWrap, setWordWrap] = useState<boolean>(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setIsLoading(true);

        const streamData = await attachmentService.getStreamData(attachmentId);
        const text = await streamData.text();
        setContent(text);
        setIsLoading(false);
      } catch {
        setError("Failed to load file content");
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [attachmentId]);

  const getLanguage = () => {
    const lowerType = contentType.toLowerCase();
    const extension = fileName.split(".").pop()?.toLowerCase();

    if (lowerType.includes("javascript") || extension === "js")
      return "javascript";
    if (lowerType.includes("css") || extension === "css") return "css";
    if (lowerType.includes("html") || extension === "html") return "html";
    if (lowerType.includes("json") || extension === "json") return "json";
    if (lowerType.includes("xml") || extension === "xml") return "xml";
    if (extension === "py") return "python";
    if (extension === "java") return "java";
    if (extension === "cpp" || extension === "c") return "cpp";

    return "text";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2">Loading content...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-red-600">
        <AlertCircle className="w-12 h-12 mb-2" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-gray-100 p-3 rounded-lg">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">
            {getLanguage().toUpperCase()} • {content.split("\n").length} lines
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWordWrap(!wordWrap)}
          >
            {wordWrap ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
            <span className="ml-1">{wordWrap ? "No Wrap" : "Wrap"}</span>
          </Button>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-auto max-h-96 bg-gray-900">
        <pre
          className={`p-4 text-sm text-gray-100 font-mono ${
            wordWrap ? "whitespace-pre-wrap" : "whitespace-pre"
          }`}
          style={{ tabSize: 2 }}
        >
          <code>{content}</code>
        </pre>
      </div>
    </div>
  );
};

export const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({
  attachment,
  isOpen,
  onClose,
  onDownload,
  onDelete,
  attachments = [],
  className = "",
}) => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const {
    data: previewData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["attachment-preview", attachment.id],
    queryFn: () => attachmentService.getPreviewData(attachment.id),
    select: (data) => data.data,
    enabled: isOpen && !!attachment.id,
    staleTime: 5 * 60 * 1000,
  });

  const currentIndex = useMemo(() => {
    return attachments.findIndex((att) => att.id === attachment.id);
  }, [attachments, attachment.id]);

  const canNavigate = attachments.length > 1;

  const handlePrevious = () => {
    if (canNavigate && currentIndex > 0) {
      // This would need to be handled by parent component
      // onNavigate?.(attachments[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (canNavigate && currentIndex < attachments.length - 1) {
      // This would need to be handled by parent component
      // onNavigate?.(attachments[currentIndex + 1]);
    }
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload(attachment.id);
    } else if (previewData?.downloadUrl) {
      window.open(previewData.downloadUrl, "_blank");
    }
  };

  const handleDelete = () => {
    if (
      onDelete &&
      window.confirm("Are you sure you want to delete this attachment?")
    ) {
      onDelete(attachment.id);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const renderPreviewContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2">Loading preview...</span>
        </div>
      );
    }

    if (error || !previewData) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-red-600">
          <AlertCircle className="w-12 h-12 mb-2" />
          <p>Failed to load preview</p>
          <p className="text-sm text-gray-500 mt-2">
            Try downloading the file instead
          </p>
        </div>
      );
    }

    if (!previewData.isPreviewable) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-gray-600">
          <FileText className="w-12 h-12 mb-2" />
          <p>Preview not available for this file type</p>
          <p className="text-sm text-gray-500 mt-2">
            File type: {previewData.contentType}
          </p>
          <Button onClick={handleDownload} className="mt-4">
            <Download className="w-4 h-4 mr-2" />
            Download to view
          </Button>
        </div>
      );
    }

    switch (previewData.previewType) {
      case "image":
        return (
          <ImageViewer
            attachmentId={attachment.id}
            fileName={attachment.originalFileName}
          />
        );
      case "pdf":
        return (
          <PDFViewer
            attachmentId={attachment.id}
            fileName={attachment.originalFileName}
          />
        );
      case "text":
      case "code":
        return (
          <TextViewer
            attachmentId={attachment.id}
            fileName={attachment.originalFileName}
            contentType={previewData.contentType}
          />
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center h-96 text-gray-600">
            <FileText className="w-12 h-12 mb-2" />
            <p>Unsupported preview type</p>
          </div>
        );
    }
  };

  const getPreviewIcon = () => {
    if (!previewData) return <FileText className="w-5 h-5" />;

    switch (previewData.previewType) {
      case "image":
        return <ImageIcon className="w-5 h-5" />;
      case "pdf":
        return <FileText className="w-5 h-5" />;
      case "code":
        return <Code className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 ${className}`}
    >
      <div
        className={`bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col ${
          isFullscreen ? "max-w-full max-h-full" : ""
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {getPreviewIcon()}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 truncate">
                {attachment.originalFileName}
              </h2>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>{attachment.fileSizeFormatted}</span>
                <span>•</span>
                <span>{attachment.contentType}</span>
                {canNavigate && (
                  <>
                    <span>•</span>
                    <span>
                      {currentIndex + 1} of {attachments.length}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {canNavigate && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={currentIndex <= 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  disabled={currentIndex >= attachments.length - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </>
            )}

            <Button variant="outline" size="sm" onClick={toggleFullscreen}>
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>

            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4" />
            </Button>

            {onDelete && (
              <Button variant="outline" size="sm" onClick={handleDelete}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">{renderPreviewContent()}</div>

        <div className="border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-4">
              <span>
                Uploaded by {attachment.uploadedBy.firstName}{" "}
                {attachment.uploadedBy.lastName}
              </span>
              <span>•</span>
              <span>
                {new Date(attachment.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            {previewData?.isPreviewable && (
              <span>Preview • {previewData.previewType.toUpperCase()}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

declare global {
  interface Window {
    pdfjsLib: any;
  }
}
