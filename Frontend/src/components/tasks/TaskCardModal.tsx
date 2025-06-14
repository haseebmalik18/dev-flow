import React, { useState } from "react";
import {
  X,
  Edit,
  Trash2,
  Play,
  Pause,
  CheckCircle,
  Clock,
  AlertTriangle,
  Archive,
  User,
  Calendar,
  Tag,
  MessageCircle,
  Link as LinkIcon,
  Flag,
  Users,
  Send,
  GitMerge,
  Hash,
  CheckSquare,
  Plus,
} from "lucide-react";
import { Button } from "../ui/Button";
import {
  useUpdateTask,
  useDeleteTask,
  useCompleteTask,
  useReopenTask,
  useAssignTask,
  useUnassignTask,
  useArchiveTask,
  useSubtasks,
} from "../../hooks/useTasks";
import { useComments, useCreateComment } from "../../hooks/useComments";
import type { TaskSummary } from "../../services/taskService";
import { Link } from "react-router-dom";

interface TaskCardModalProps {
  task: TaskSummary | null;
  isOpen: boolean;
  onClose: () => void;
  projectMembers?: Array<{
    id: number;
    user: {
      id: number;
      username: string;
      firstName: string;
      lastName: string;
      avatar: string | null;
    };
  }>;
  onEdit?: (taskId: number) => void;
  onAddSubtask?: (taskId: number) => void;
}

export const TaskCardModal: React.FC<TaskCardModalProps> = ({
  task,
  isOpen,
  onClose,
  projectMembers = [],
  onEdit,
  onAddSubtask,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [newComment, setNewComment] = useState("");

  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  const completeTaskMutation = useCompleteTask();
  const reopenTaskMutation = useReopenTask();
  const assignTaskMutation = useAssignTask();
  const unassignTaskMutation = useUnassignTask();
  const archiveTaskMutation = useArchiveTask();

  const { data: comments, isLoading: commentsLoading } = useComments(
    task?.id || 0
  );
  const createCommentMutation = useCreateComment();

  const { data: subtasks, isLoading: subtasksLoading } = useSubtasks(
    task?.id || 0
  );

  if (!isOpen || !task) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "DONE":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "IN_PROGRESS":
        return <Play className="w-5 h-5 text-blue-600" />;
      case "REVIEW":
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <Pause className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DONE":
        return "bg-green-100 text-green-800 border-green-200";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "REVIEW":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "CRITICAL":
        return "bg-red-100 text-red-800 border-red-200";
      case "HIGH":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-green-100 text-green-800 border-green-200";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "CRITICAL":
        return <Flag className="w-5 h-5 text-red-600" />;
      case "HIGH":
        return <Flag className="w-5 h-5 text-orange-600" />;
      case "MEDIUM":
        return <Flag className="w-5 h-5 text-yellow-600" />;
      default:
        return <Flag className="w-5 h-5 text-green-600" />;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No due date";
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays === -1) return "Yesterday";
    if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;
    if (diffDays < 7) return `${diffDays} days`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
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

  const handleStatusChange = async (newStatus: string) => {
    try {
      if (newStatus === "DONE") {
        await completeTaskMutation.mutateAsync(task.id);
      } else if (task.status === "DONE" && newStatus !== "DONE") {
        await reopenTaskMutation.mutateAsync(task.id);
        if (newStatus !== "TODO") {
          await updateTaskMutation.mutateAsync({
            id: task.id,
            data: { status: newStatus as any },
          });
        }
      } else {
        await updateTaskMutation.mutateAsync({
          id: task.id,
          data: { status: newStatus as any },
        });
      }
      setShowActions(false);
    } catch (error) {
      // Error handled by mutation hooks
    }
  };

  const handleAssigneeChange = async (assigneeId: number | null) => {
    try {
      if (assigneeId) {
        await assignTaskMutation.mutateAsync({ id: task.id, assigneeId });
      } else {
        await unassignTaskMutation.mutateAsync(task.id);
      }
      setShowActions(false);
    } catch (error) {
      // Error handled by mutation hooks
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      try {
        await deleteTaskMutation.mutateAsync(task.id);
        onClose();
      } catch (error) {
        // Error handled by mutation hook
      }
    }
  };

  const handleArchive = async () => {
    try {
      await archiveTaskMutation.mutateAsync(task.id);
      setShowActions(false);
    } catch (error) {
      // Error handled by mutation hook
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await createCommentMutation.mutateAsync({
        taskId: task.id,
        content: newComment.trim(),
      });
      setNewComment("");
    } catch (error) {
      // Error handled by mutation hook
    }
  };

  const getSubtaskCompletionStats = () => {
    if (!subtasks || subtasks.length === 0)
      return { completed: 0, total: 0, percentage: 0 };

    const completed = subtasks.filter((s) => s.status === "DONE").length;
    const total = subtasks.length;
    const percentage = Math.round((completed / total) * 100);

    return { completed, total, percentage };
  };

  const subtaskStats = getSubtaskCompletionStats();

  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-start justify-center p-6 z-50 pt-12">
      <div
        className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="flex-1">
            <div className="flex items-start space-x-4">
              <div
                className="w-1 h-10 rounded-full"
                style={{ backgroundColor: task.project.color }}
              />
              <div className="flex-1">
                <h1 className="text-xl font-semibold text-gray-900">
                  {task.title}
                </h1>
                <div className="flex items-center space-x-2 mt-1.5">
                  <span className="text-sm text-gray-500">in</span>
                  <span className="text-sm font-medium text-blue-600">
                    {task.project.name}
                  </span>
                  <span className="text-sm text-gray-500">•</span>
                  <div className="flex items-center space-x-1.5">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {formatDate(task.dueDate)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex flex-col items-end space-y-1">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit?.(task.id)}
                  icon={<Edit className="w-4 h-4" />}
                >
                  Edit
                </Button>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="flex items-center space-x-1">
                <div className="flex items-center space-x-1">
                  {getStatusIcon(task.status)}
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusColor(
                      task.status
                    )}`}
                  >
                    {task.status.replace("_", " ")}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  {getPriorityIcon(task.priority)}
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getPriorityColor(
                      task.priority
                    )}`}
                  >
                    {task.priority}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-base font-medium text-gray-900 mb-2 flex items-center">
                <MessageCircle className="w-4 h-4 mr-1.5" />
                Description
              </h3>
              <div className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
                {task.description || "No description provided."}
              </div>
            </div>

            {task.tagList && task.tagList.length > 0 && (
              <div>
                <h3 className="text-base font-medium text-gray-900 mb-2 flex items-center">
                  <Tag className="w-4 h-4 mr-1.5" />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {task.tagList.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs bg-gray-100 text-gray-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-medium text-gray-900 flex items-center">
                  <CheckSquare className="w-4 h-4 mr-1.5" />
                  Subtasks
                  {subtasks && subtasks.length > 0 && (
                    <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
                      {subtaskStats.completed}/{subtaskStats.total}
                    </span>
                  )}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAddSubtask?.(task.id)}
                  icon={<Plus className="w-4 h-4" />}
                >
                  Add
                </Button>
              </div>

              {subtasks && subtasks.length > 0 && (
                <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-700">
                      Overall Progress
                    </span>
                    <span className="text-xs text-gray-600">
                      {subtaskStats.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-green-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${subtaskStats.percentage}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {subtasksLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="animate-pulse">
                      <div className="bg-gray-100 rounded-lg p-3">
                        <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : subtasks && subtasks.length > 0 ? (
                <div className="space-y-2">
                  {subtasks.map((subtask) => (
                    <div
                      key={subtask.id}
                      className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(subtask.status)}
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">
                              {subtask.title}
                            </h4>
                            <div className="flex items-center space-x-1.5 mt-1">
                              <span
                                className={`px-1.5 py-0.5 rounded text-xs font-medium ${getStatusColor(
                                  subtask.status
                                )}`}
                              >
                                {subtask.status.replace("_", " ")}
                              </span>
                              {subtask.assignee && (
                                <div className="flex items-center space-x-1">
                                  {subtask.assignee.avatar ? (
                                    <img
                                      src={subtask.assignee.avatar}
                                      alt={`${subtask.assignee.firstName} ${subtask.assignee.lastName}`}
                                      className="w-4 h-4 rounded-full"
                                    />
                                  ) : (
                                    <div className="w-4 h-4 bg-gray-300 rounded-full flex items-center justify-center text-[10px]">
                                      {subtask.assignee.firstName[0]}
                                    </div>
                                  )}
                                  <span className="text-xs text-gray-600">
                                    {subtask.assignee.firstName}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-medium text-gray-900">
                            {subtask.progress}%
                          </div>
                          <div className="text-[10px] text-gray-500">
                            {formatDate(subtask.dueDate)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No subtasks yet</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {task.isOverdue && (
                  <div className="flex items-center space-x-2 p-2 bg-red-50 rounded-lg border border-red-200">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span className="text-xs font-medium text-red-800">
                      Overdue
                    </span>
                  </div>
                )}
                {task.isBlocked && (
                  <div className="flex items-center space-x-2 p-2 bg-orange-50 rounded-lg border border-orange-200">
                    <GitMerge className="w-4 h-4 text-orange-600" />
                    <span className="text-xs font-medium text-orange-800">
                      Blocked
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-medium text-gray-900 flex items-center">
                  <MessageCircle className="w-4 h-4 mr-1.5" />
                  Activity
                  {comments && comments.length > 0 && (
                    <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
                      {comments.length}
                    </span>
                  )}
                </h3>
              </div>

              <form onSubmit={handleSubmitComment} className="mb-4">
                <div className="flex space-x-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                    U
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
                      rows={2}
                      placeholder="Write a comment..."
                    />
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span>Tip: Use @ to mention team members</span>
                      </div>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={!newComment.trim()}
                        loading={createCommentMutation.isPending}
                        icon={<Send className="w-3 h-3" />}
                      >
                        Comment
                      </Button>
                    </div>
                  </div>
                </div>
              </form>

              <div className="space-y-3">
                {commentsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="animate-pulse">
                        <div className="flex space-x-2">
                          <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                          <div className="flex-1">
                            <div className="bg-gray-100 rounded-lg p-2">
                              <div className="h-3 bg-gray-200 rounded w-1/4 mb-1.5"></div>
                              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : comments && comments.length > 0 ? (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex space-x-2">
                      <div className="flex-shrink-0">
                        {comment.author.avatar ? (
                          <img
                            src={comment.author.avatar}
                            alt={`${comment.author.firstName} ${comment.author.lastName}`}
                            className="w-6 h-6 rounded-full"
                          />
                        ) : (
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                            {comment.author.firstName[0]}
                            {comment.author.lastName[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900 text-xs">
                                {comment.author.firstName}{" "}
                                {comment.author.lastName}
                              </span>
                              <div className="flex items-center space-x-1">
                                <span className="text-[10px] text-gray-500">
                                  {formatTimeAgo(comment.createdAt)}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  •
                                </span>
                                <span className="text-[10px] text-gray-500">
                                  {new Date(
                                    comment.createdAt
                                  ).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "numeric",
                                    minute: "numeric",
                                  })}
                                </span>
                              </div>
                              {comment.isEdited && (
                                <span className="text-[10px] text-gray-400">
                                  (edited)
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-gray-700 whitespace-pre-wrap">
                            {comment.content}
                          </div>
                          {comment.mentionedUsers.length > 0 && (
                            <div className="mt-1.5 flex items-center space-x-1">
                              <User className="w-2.5 h-2.5 text-gray-400" />
                              <span className="text-[10px] text-gray-500">
                                Mentioned:{" "}
                                {comment.mentionedUsers
                                  .map(
                                    (user) =>
                                      `${user.firstName} ${user.lastName}`
                                  )
                                  .join(", ")}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No comments yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
