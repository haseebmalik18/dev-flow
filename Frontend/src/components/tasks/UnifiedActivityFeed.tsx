import React, { useState, useMemo } from "react";
import {
  MessageCircle,
  Paperclip,
  User,
  Clock,
  CheckCircle,
  Edit,
  Trash2,
  Reply,
  Send,
  Download,
  Image,
  FileText,
  Archive,
  File,
  AtSign,
  Plus,
  Eye,
  ZoomIn,
} from "lucide-react";
import { Button } from "../ui/Button";
import { FileUpload } from "./FileUpload";
import { AttachmentPreview } from "./AttachmentPreview";
import {
  useComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
} from "../../hooks/useComments";
import {
  useTaskAttachments,
  useDeleteAttachment,
  useDownloadAttachment,
  useAttachmentPreviewUtils,
} from "../../hooks/useAttachments";
import type { Comment } from "../../services/commentService";
import type { AttachmentSummary } from "../../services/attachmentService";

interface UnifiedActivityFeedProps {
  taskId: number;
  className?: string;
}

type ActivityItem = {
  id: string;
  type: "comment" | "attachment" | "system";
  timestamp: string;
  author?: {
    id: number;
    firstName: string;
    lastName: string;
    avatar: string | null;
    jobTitle: string | null;
  };
  content?: string;
  attachment?: AttachmentSummary;
  comment?: Comment;
  systemMessage?: string;
  isEdited?: boolean;
  replies?: Comment[];
};

export const UnifiedActivityFeed: React.FC<UnifiedActivityFeedProps> = ({
  taskId,
  className = "",
}) => {
  const [newComment, setNewComment] = useState("");
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [previewAttachment, setPreviewAttachment] =
    useState<AttachmentSummary | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const { data: comments, isLoading: commentsLoading } = useComments(taskId);
  const { data: attachments, isLoading: attachmentsLoading } =
    useTaskAttachments(taskId);

  const createCommentMutation = useCreateComment();
  const updateCommentMutation = useUpdateComment();
  const deleteCommentMutation = useDeleteComment();
  const deleteAttachmentMutation = useDeleteAttachment();
  const downloadAttachmentMutation = useDownloadAttachment();

  const { isPreviewable, getPreviewType } = useAttachmentPreviewUtils();

  const activityItems = useMemo((): ActivityItem[] => {
    const items: ActivityItem[] = [];

    if (comments) {
      comments.forEach((comment) => {
        items.push({
          id: `comment-${comment.id}`,
          type: "comment",
          timestamp: comment.createdAt,
          author: comment.author,
          content: comment.content,
          comment,
          isEdited: comment.isEdited,
          replies: comment.replies,
        });

        comment.replies?.forEach((reply) => {
          items.push({
            id: `comment-${reply.id}`,
            type: "comment",
            timestamp: reply.createdAt,
            author: reply.author,
            content: reply.content,
            comment: reply,
            isEdited: reply.isEdited,
          });
        });
      });
    }

    if (attachments) {
      attachments.forEach((attachment) => {
        items.push({
          id: `attachment-${attachment.id}`,
          type: "attachment",
          timestamp: attachment.createdAt,
          author: attachment.uploadedBy,
          attachment,
        });
      });
    }

    return items.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [comments, attachments]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getFileIcon = (attachment: AttachmentSummary) => {
    if (attachment.isImage) {
      return <Image className="w-4 h-4 text-blue-500" />;
    } else if (attachment.isDocument) {
      return <FileText className="w-4 h-4 text-red-500" />;
    } else if (attachment.isArchive) {
      return <Archive className="w-4 h-4 text-yellow-500" />;
    }
    return <File className="w-4 h-4 text-gray-500" />;
  };

  const getPreviewIcon = (attachment: AttachmentSummary) => {
    if (attachment.isImage) {
      return <ZoomIn className="w-4 h-4" />;
    }
    return <Eye className="w-4 h-4" />;
  };

  const getUserAvatar = (author: ActivityItem["author"]) => {
    if (!author) return null;

    if (author.avatar) {
      return (
        <img
          src={author.avatar}
          alt={`${author.firstName} ${author.lastName}`}
          className="w-8 h-8 rounded-full"
        />
      );
    }

    return (
      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
        {author.firstName[0]}
        {author.lastName[0]}
      </div>
    );
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await createCommentMutation.mutateAsync({
        taskId,
        content: newComment.trim(),
        parentCommentId: replyingTo,
      });
      setNewComment("");
      setReplyingTo(null);
    } catch (error) {
      // Error handled by mutation hook
    }
  };

  const handleEditComment = async (commentId: number) => {
    if (!editContent.trim()) return;

    try {
      await updateCommentMutation.mutateAsync({
        id: commentId,
        content: editContent.trim(),
      });
      setEditingComment(null);
      setEditContent("");
    } catch (error) {
      // Error handled by mutation hook
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (window.confirm("Are you sure you want to delete this comment?")) {
      try {
        await deleteCommentMutation.mutateAsync(commentId);
      } catch (error) {
        // Error handled by mutation hook
      }
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (window.confirm("Are you sure you want to delete this attachment?")) {
      try {
        await deleteAttachmentMutation.mutateAsync(attachmentId);
      } catch (error) {
        // Error handled by mutation hook
      }
    }
  };

  const handleDownloadAttachment = async (attachmentId: number) => {
    try {
      await downloadAttachmentMutation.mutateAsync(attachmentId);
    } catch (error) {
      // Error handled by mutation hook
    }
  };

  const handlePreviewAttachment = (attachment: AttachmentSummary) => {
    setPreviewAttachment(attachment);
    setIsPreviewOpen(true);
  };

  const isLoading = commentsLoading || attachmentsLoading;

  return (
    <>
      <div
        className={`bg-white rounded-lg border border-gray-200 ${className}`}
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Activity</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowFileUpload(!showFileUpload)}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
              >
                <Paperclip className="w-4 h-4" />
                <span>Attach</span>
              </button>
            </div>
          </div>

          {showFileUpload && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900">
                  Upload Files
                </h4>
                <button
                  onClick={() => setShowFileUpload(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              <FileUpload
                taskId={taskId}
                onUploadComplete={() => {
                  // Optionally close upload section after successful upload
                  // setShowFileUpload(false);
                }}
              />
            </div>
          )}

          {!replyingTo && (
            <form onSubmit={handleSubmitComment} className="space-y-3">
              <div className="flex space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  U
                </div>
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={3}
                    placeholder="Write a comment..."
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pl-11">
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <AtSign className="w-4 h-4" />
                  <span>Use @ to mention team members</span>
                </div>
                <Button
                  type="submit"
                  loading={createCommentMutation.isPending}
                  disabled={!newComment.trim()}
                  icon={<Send className="w-4 h-4" />}
                  size="sm"
                >
                  Comment
                </Button>
              </div>
            </form>
          )}
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="flex space-x-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : activityItems.length > 0 ? (
            <div className="space-y-6">
              {activityItems.map((item) => (
                <div key={item.id} className="flex space-x-3 group">
                  <div className="flex-shrink-0">
                    {item.type === "attachment" ? (
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <Paperclip className="w-4 h-4 text-gray-600" />
                      </div>
                    ) : (
                      getUserAvatar(item.author)
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {item.type === "comment" && item.comment && (
                      <div>
                        {editingComment === item.comment.id ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleEditComment(item.comment!.id);
                            }}
                            className="space-y-3"
                          >
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                              rows={3}
                              autoFocus
                            />
                            <div className="flex items-center space-x-2">
                              <Button
                                type="submit"
                                size="sm"
                                loading={updateCommentMutation.isPending}
                                disabled={!editContent.trim()}
                              >
                                Save
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingComment(null);
                                  setEditContent("");
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </form>
                        ) : (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-900">
                                  {item.author?.firstName}{" "}
                                  {item.author?.lastName}
                                </span>
                                {item.author?.jobTitle && (
                                  <span className="text-sm text-gray-500">
                                    • {item.author.jobTitle}
                                  </span>
                                )}
                                <span className="text-sm text-gray-500">
                                  {formatTimeAgo(item.timestamp)}
                                </span>
                                {item.isEdited && (
                                  <span className="text-xs text-gray-400">
                                    (edited)
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => {
                                    setEditingComment(item.comment!.id);
                                    setEditContent(item.comment!.content);
                                  }}
                                  className="p-1 hover:bg-gray-200 rounded"
                                >
                                  <Edit className="w-3 h-3 text-gray-400" />
                                </button>
                                <button
                                  onClick={() =>
                                    setReplyingTo(item.comment!.id)
                                  }
                                  className="p-1 hover:bg-gray-200 rounded"
                                >
                                  <Reply className="w-3 h-3 text-gray-400" />
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeleteComment(item.comment!.id)
                                  }
                                  className="p-1 hover:bg-gray-200 rounded"
                                >
                                  <Trash2 className="w-3 h-3 text-gray-400" />
                                </button>
                              </div>
                            </div>

                            <div className="prose prose-sm max-w-none">
                              <p className="text-gray-700 whitespace-pre-wrap">
                                {item.content}
                              </p>
                            </div>

                            {item.comment.mentionedUsers &&
                              item.comment.mentionedUsers.length > 0 && (
                                <div className="mt-2 flex items-center space-x-1">
                                  <AtSign className="w-3 h-3 text-gray-400" />
                                  <span className="text-xs text-gray-500">
                                    Mentioned:{" "}
                                    {item.comment.mentionedUsers
                                      .map(
                                        (user) =>
                                          `${user.firstName} ${user.lastName}`
                                      )
                                      .join(", ")}
                                  </span>
                                </div>
                              )}
                          </div>
                        )}

                        {replyingTo === item.comment.id && (
                          <div className="mt-3">
                            <form
                              onSubmit={handleSubmitComment}
                              className="space-y-3"
                            >
                              <div className="flex space-x-3">
                                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                  U
                                </div>
                                <textarea
                                  value={newComment}
                                  onChange={(e) =>
                                    setNewComment(e.target.value)
                                  }
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                  rows={2}
                                  placeholder={`Reply to ${item.author?.firstName}...`}
                                  autoFocus
                                />
                              </div>
                              <div className="flex items-center space-x-2 pl-9">
                                <Button
                                  type="submit"
                                  size="sm"
                                  loading={createCommentMutation.isPending}
                                  disabled={!newComment.trim()}
                                >
                                  Reply
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setReplyingTo(null);
                                    setNewComment("");
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </form>
                          </div>
                        )}
                      </div>
                    )}

                    {item.type === "attachment" && item.attachment && (
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">
                              {item.author?.firstName} {item.author?.lastName}
                            </span>
                            <span className="text-sm text-gray-500">
                              uploaded a file • {formatTimeAgo(item.timestamp)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 p-2 bg-white rounded border">
                          {getFileIcon(item.attachment)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {item.attachment.originalFileName}
                            </p>
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              <span>{item.attachment.fileSizeFormatted}</span>
                              <span>•</span>
                              <span>
                                {item.attachment.fileExtension.toUpperCase()}
                              </span>
                              {isPreviewable(item.attachment.contentType) && (
                                <>
                                  <span>•</span>
                                  <span className="text-green-600">
                                    Previewable
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            {isPreviewable(item.attachment.contentType) && (
                              <button
                                onClick={() =>
                                  handlePreviewAttachment(item.attachment!)
                                }
                                className="p-1 hover:bg-gray-100 rounded"
                                title="Preview"
                              >
                                {getPreviewIcon(item.attachment)}
                              </button>
                            )}

                            <button
                              onClick={() =>
                                handleDownloadAttachment(item.attachment!.id)
                              }
                              className="p-1 hover:bg-gray-100 rounded"
                              title="Download"
                            >
                              <Download className="w-4 h-4 text-gray-600" />
                            </button>

                            <button
                              onClick={() =>
                                handleDeleteAttachment(item.attachment!.id)
                              }
                              className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No activity yet
              </h3>
              <p className="text-gray-600">
                Start the conversation or upload files to track progress.
              </p>
            </div>
          )}
        </div>
      </div>

      {previewAttachment && (
        <AttachmentPreview
          attachment={previewAttachment}
          attachments={attachments || []}
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false);
            setPreviewAttachment(null);
          }}
          onDownload={handleDownloadAttachment}
          onDelete={handleDeleteAttachment}
        />
      )}
    </>
  );
};
