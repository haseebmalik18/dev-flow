import React, { useState } from "react";
import {
  MessageCircle,
  Send,
  Reply,
  Edit,
  Trash2,
  MoreHorizontal,
  AtSign,
} from "lucide-react";
import { Button } from "../ui/Button";
import {
  useComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
} from "../../hooks/useComments";

interface CommentSectionProps {
  taskId: number;
}

interface Comment {
  id: number;
  content: string;
  author: {
    id: number;
    firstName: string;
    lastName: string;
    avatar: string | null;
    jobTitle: string | null;
  };
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
  replies: Comment[];
  mentionedUsers: Array<{
    id: number;
    firstName: string;
    lastName: string;
  }>;
}

export const CommentSection: React.FC<CommentSectionProps> = ({ taskId }) => {
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showReplies, setShowReplies] = useState<Set<number>>(new Set());

  const { data: comments, isLoading, error } = useComments(taskId);
  const createCommentMutation = useCreateComment();
  const updateCommentMutation = useUpdateComment();
  const deleteCommentMutation = useDeleteComment();

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

  const toggleReplies = (commentId: number) => {
    const newShowReplies = new Set(showReplies);
    if (newShowReplies.has(commentId)) {
      newShowReplies.delete(commentId);
    } else {
      newShowReplies.add(commentId);
    }
    setShowReplies(newShowReplies);
  };

  const CommentItem: React.FC<{ comment: Comment; isReply?: boolean }> = ({
    comment,
    isReply = false,
  }) => {
    const [showActions, setShowActions] = useState(false);

    return (
      <div className={`${isReply ? "ml-12" : ""}`}>
        <div className="flex space-x-3 group">
          <div className="flex-shrink-0">
            {comment.author.avatar ? (
              <img
                src={comment.author.avatar}
                alt={`${comment.author.firstName} ${comment.author.lastName}`}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {comment.author.firstName[0]}
                {comment.author.lastName[0]}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="bg-gray-50 rounded-lg px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">
                    {comment.author.firstName} {comment.author.lastName}
                  </span>
                  {comment.author.jobTitle && (
                    <span className="text-sm text-gray-500">
                      • {comment.author.jobTitle}
                    </span>
                  )}
                  <span className="text-sm text-gray-500">
                    {formatTimeAgo(comment.createdAt)}
                  </span>
                  {comment.isEdited && (
                    <span className="text-xs text-gray-400">(edited)</span>
                  )}
                </div>

                <div className="relative">
                  <button
                    onClick={() => setShowActions(!showActions)}
                    className="p-1 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="w-4 h-4 text-gray-400" />
                  </button>

                  {showActions && (
                    <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[120px]">
                      <button
                        onClick={() => {
                          setEditingComment(comment.id);
                          setEditContent(comment.content);
                          setShowActions(false);
                        }}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => {
                          setReplyingTo(comment.id);
                          setShowActions(false);
                        }}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Reply className="w-4 h-4" />
                        <span>Reply</span>
                      </button>
                      <button
                        onClick={() => {
                          handleDeleteComment(comment.id);
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

              {editingComment === comment.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleEditComment(comment.id);
                  }}
                  className="space-y-3"
                >
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={3}
                    placeholder="Edit your comment..."
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
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              )}

              {comment.mentionedUsers.length > 0 && (
                <div className="mt-2 flex items-center space-x-1">
                  <AtSign className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    Mentioned:{" "}
                    {comment.mentionedUsers
                      .map((user) => `${user.firstName} ${user.lastName}`)
                      .join(", ")}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4 mt-2 ml-4">
              <button
                onClick={() => setReplyingTo(comment.id)}
                className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700"
              >
                <Reply className="w-4 h-4" />
                <span>Reply</span>
              </button>

              {comment.replies.length > 0 && (
                <button
                  onClick={() => toggleReplies(comment.id)}
                  className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>
                    {showReplies.has(comment.id) ? "Hide" : "Show"}{" "}
                    {comment.replies.length} replies
                  </span>
                </button>
              )}
            </div>

            {replyingTo === comment.id && (
              <div className="mt-3 ml-4">
                <form onSubmit={handleSubmitComment} className="space-y-3">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={3}
                    placeholder={`Reply to ${comment.author.firstName}...`}
                    autoFocus
                  />
                  <div className="flex items-center space-x-2">
                    <Button
                      type="submit"
                      size="sm"
                      loading={createCommentMutation.isPending}
                      disabled={!newComment.trim()}
                      icon={<Send className="w-4 h-4" />}
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

            {showReplies.has(comment.id) && comment.replies.length > 0 && (
              <div className="mt-3 space-y-3">
                {comment.replies.map((reply) => (
                  <CommentItem key={reply.id} comment={reply} isReply />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center py-8">
          <MessageCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Failed to load comments
          </h3>
          <p className="text-gray-600">Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <MessageCircle className="w-5 h-5 mr-2" />
          Comments
          {comments && comments.length > 0 && (
            <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm">
              {comments.length}
            </span>
          )}
        </h3>
      </div>

      {!replyingTo && (
        <form onSubmit={handleSubmitComment} className="mb-6">
          <div className="space-y-3">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={4}
              placeholder="Add a comment..."
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <AtSign className="w-4 h-4" />
                <span>Use @ to mention team members</span>
              </div>
              <Button
                type="submit"
                loading={createCommentMutation.isPending}
                disabled={!newComment.trim()}
                icon={<Send className="w-4 h-4" />}
              >
                Comment
              </Button>
            </div>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="flex space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="bg-gray-100 rounded-lg p-4">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : comments && comments.length > 0 ? (
        <div className="space-y-6">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No comments yet
          </h3>
          <p className="text-gray-600">Be the first to comment on this task.</p>
        </div>
      )}
    </div>
  );
};
