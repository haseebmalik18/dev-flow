import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
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
  Flag,
  Users,
  Send,
  GitMerge,
  Hash,
  CheckSquare,
  Plus,
  MoreHorizontal,
  Eye,
  Activity,
  Link as LinkIcon,
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

const StatusIcon = memo(({ status }: { status: string }) => {
  switch (status) {
    case "DONE":
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case "IN_PROGRESS":
      return <Play className="w-4 h-4 text-blue-600" />;
    case "REVIEW":
      return <Clock className="w-4 h-4 text-yellow-600" />;
    default:
      return <Pause className="w-4 h-4 text-gray-600" />;
  }
});

const SubtaskItem = memo(
  ({
    subtask,
    onToggle,
    formatDate,
  }: {
    subtask: any;
    onToggle: (id: number, status: string) => void;
    formatDate: (date: string | null) => string;
  }) => {
    const handleToggle = useCallback(() => {
      onToggle(subtask.id, subtask.status);
    }, [subtask.id, subtask.status, onToggle]);

    return (
      <div className="group flex items-start space-x-2 p-2 hover:bg-gray-50 rounded">
        <div className="mt-0.5 cursor-pointer" onClick={handleToggle}>
          {subtask.status === "DONE" ? (
            <div className="w-4 h-4 bg-green-500 rounded flex items-center justify-center hover:bg-green-600 transition-colors">
              <CheckCircle className="w-3 h-3 text-white" />
            </div>
          ) : (
            <div className="w-4 h-4 border-2 border-gray-300 rounded hover:border-gray-400 hover:bg-gray-50 transition-colors"></div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span
            className={`text-sm cursor-pointer ${
              subtask.status === "DONE"
                ? "line-through text-gray-500"
                : "text-gray-900"
            }`}
            onClick={handleToggle}
          >
            {subtask.title}
          </span>
          {subtask.assignee && (
            <div className="flex items-center space-x-1 mt-1">
              {subtask.assignee.avatar ? (
                <img
                  src={subtask.assignee.avatar}
                  alt={`${subtask.assignee.firstName} ${subtask.assignee.lastName}`}
                  className="w-4 h-4 rounded-full"
                />
              ) : (
                <div className="w-4 h-4 bg-gray-300 rounded-full flex items-center justify-center text-xs">
                  {subtask.assignee.firstName[0]}
                </div>
              )}
              <span className="text-xs text-gray-500">
                {subtask.assignee.firstName}
              </span>
            </div>
          )}
          {subtask.dueDate && (
            <div className="flex items-center space-x-1 mt-1">
              <Calendar className="w-3 h-3 text-gray-400" />
              <span
                className={`text-xs ${
                  subtask.isOverdue ? "text-red-500" : "text-gray-500"
                }`}
              >
                {formatDate(subtask.dueDate)}
              </span>
            </div>
          )}
        </div>
        <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded">
          <MoreHorizontal className="w-3 h-3 text-gray-400" />
        </button>
      </div>
    );
  }
);

const CommentItem = memo(
  ({
    comment,
    formatTimeAgo,
  }: {
    comment: any;
    formatTimeAgo: (date: string) => string;
  }) => (
    <div className="flex space-x-2">
      <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-white text-xs font-medium">
        {comment.author.firstName[0]}
      </div>
      <div className="flex-1">
        <div className="bg-gray-50 rounded p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-900">
              {comment.author.firstName} {comment.author.lastName}
            </span>
            <span className="text-xs text-gray-500">
              {formatTimeAgo(comment.createdAt)}
            </span>
          </div>
          <p className="text-xs text-gray-700">{comment.content}</p>
          {comment.isEdited && (
            <span className="text-xs text-gray-400 italic">(edited)</span>
          )}
        </div>
      </div>
    </div>
  )
);

export const TaskCardModal: React.FC<TaskCardModalProps> = memo(
  ({ task, isOpen, onClose, projectMembers = [], onEdit, onAddSubtask }) => {
    const [newComment, setNewComment] = useState("");
    const [showQuickActions, setShowQuickActions] = useState(false);
    const [showAssigneeSearch, setShowAssigneeSearch] = useState(false);
    const [assigneeSearchTerm, setAssigneeSearchTerm] = useState("");
    const [optimisticSubtasks, setOptimisticSubtasks] = useState<any[]>([]);

    const taskId = useMemo(() => task?.id || 0, [task?.id]);

    const updateTaskMutation = useUpdateTask();
    const deleteTaskMutation = useDeleteTask();
    const completeTaskMutation = useCompleteTask();
    const reopenTaskMutation = useReopenTask();
    const assignTaskMutation = useAssignTask();
    const unassignTaskMutation = useUnassignTask();
    const archiveTaskMutation = useArchiveTask();

    const { data: comments, isLoading: commentsLoading } = useComments(
      isOpen && taskId ? taskId : 0
    );
    const createCommentMutation = useCreateComment();

    const {
      data: subtasks,
      isLoading: subtasksLoading,
      refetch: refetchSubtasks,
    } = useSubtasks(isOpen && taskId ? taskId : 0);

    const getStatusColor = useCallback((status: string) => {
      switch (status) {
        case "DONE":
          return "bg-green-100 text-green-800";
        case "IN_PROGRESS":
          return "bg-blue-100 text-blue-800";
        case "REVIEW":
          return "bg-yellow-100 text-yellow-800";
        default:
          return "bg-gray-100 text-gray-800";
      }
    }, []);

    const getPriorityColor = useCallback((priority: string) => {
      switch (priority) {
        case "CRITICAL":
          return "text-red-600";
        case "HIGH":
          return "text-orange-600";
        case "MEDIUM":
          return "text-yellow-600";
        default:
          return "text-green-600";
      }
    }, []);

    const formatDate = useCallback((dateString: string | null) => {
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
      });
    }, []);

    const formatTimeAgo = useCallback((dateString: string) => {
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
    }, []);

    const handleSubtaskToggle = useCallback(
      async (subtaskId: number, currentStatus: string) => {
        const newStatus = currentStatus === "DONE" ? "TODO" : "DONE";

        setOptimisticSubtasks((prev) =>
          prev.map((subtask) =>
            subtask.id === subtaskId
              ? { ...subtask, status: newStatus }
              : subtask
          )
        );

        try {
          if (newStatus === "DONE") {
            await completeTaskMutation.mutateAsync(subtaskId);
          } else {
            await reopenTaskMutation.mutateAsync(subtaskId);
          }
          refetchSubtasks();
        } catch (error) {
          if (subtasks) {
            setOptimisticSubtasks(subtasks);
          }
          console.error("Failed to update subtask:", error);
        }
      },
      [completeTaskMutation, reopenTaskMutation, refetchSubtasks, subtasks]
    );

    const filteredMembers = useMemo(() => {
      return projectMembers.filter(
        (member) =>
          !assigneeSearchTerm ||
          `${member.user.firstName} ${member.user.lastName}`
            .toLowerCase()
            .includes(assigneeSearchTerm.toLowerCase())
      );
    }, [projectMembers, assigneeSearchTerm]);

    const subtaskStats = useMemo(() => {
      if (!optimisticSubtasks || optimisticSubtasks.length === 0)
        return { completed: 0, total: 0, percentage: 0 };

      const completed = optimisticSubtasks.filter(
        (s) => s.status === "DONE"
      ).length;
      const total = optimisticSubtasks.length;
      const percentage = Math.round((completed / total) * 100);

      return { completed, total, percentage };
    }, [optimisticSubtasks]);

    const handleStatusChange = useCallback(
      async (newStatus: string) => {
        if (!task) return;

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
          setShowQuickActions(false);
        } catch (error) {
          // Error handled by mutation hooks
        }
      },
      [task, completeTaskMutation, reopenTaskMutation, updateTaskMutation]
    );

    const handleAssigneeChange = useCallback(
      async (assigneeId: number | null) => {
        if (!task) return;

        try {
          if (assigneeId) {
            await assignTaskMutation.mutateAsync({ id: task.id, assigneeId });
          } else {
            await unassignTaskMutation.mutateAsync(task.id);
          }
          setShowQuickActions(false);
        } catch (error) {
          // Error handled by mutation hooks
        }
      },
      [task, assignTaskMutation, unassignTaskMutation]
    );

    const handleDelete = useCallback(async () => {
      if (!task) return;

      if (window.confirm("Are you sure you want to delete this task?")) {
        try {
          await deleteTaskMutation.mutateAsync(task.id);
          onClose();
        } catch (error) {
          // Error handled by mutation hook
        }
      }
    }, [task, deleteTaskMutation, onClose]);

    const handleSubmitComment = useCallback(
      async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !task) return;

        try {
          await createCommentMutation.mutateAsync({
            taskId: task.id,
            content: newComment.trim(),
          });
          setNewComment("");
        } catch (error) {
          // Error handled by mutation hook
        }
      },
      [newComment, task, createCommentMutation]
    );

    const handleBackdropClick = useCallback(
      (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      },
      [onClose]
    );

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (showAssigneeSearch) {
          const target = event.target as Element;
          if (!target.closest(".assignee-dropdown")) {
            setShowAssigneeSearch(false);
            setAssigneeSearchTerm("");
          }
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, [showAssigneeSearch]);

    useEffect(() => {
      if (subtasks) {
        setOptimisticSubtasks(subtasks);
      }
    }, [subtasks]);

    useEffect(() => {
      if (!isOpen) {
        setNewComment("");
        setShowQuickActions(false);
        setShowAssigneeSearch(false);
        setAssigneeSearchTerm("");
      }
    }, [isOpen]);

    if (!isOpen || !task) return null;

    return (
      <div
        className="fixed inset-0 bg-gray-900/60 flex items-start justify-center p-4 z-50 pt-8"
        onClick={handleBackdropClick}
      >
        <div
          className="bg-white rounded-xl max-w-3xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col border border-gray-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between p-6 border-b border-gray-200">
            <div className="flex items-start space-x-3 flex-1 min-w-0">
              <div
                className="w-1 h-8 rounded-full flex-shrink-0"
                style={{ backgroundColor: task.project.color }}
              />
              <div className="flex-1 min-w-0 pr-4">
                <h1 className="text-xl font-semibold text-gray-900 leading-tight">
                  {task.title}
                </h1>
                <div className="flex items-center space-x-2 mt-2">
                  <span className="text-sm text-gray-500">in</span>
                  <Link
                    to={`/projects/${task.project.id}`}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {task.project.name}
                  </Link>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3 flex-shrink-0">
              <div className="flex flex-col space-y-1.5">
                <div className="flex items-center space-x-1">
                  <StatusIcon status={task.status} />
                  <span
                    className={`px-1.5 py-0.5 rounded text-xs font-medium ${getStatusColor(
                      task.status
                    )}`}
                  >
                    {task.status.replace("_", " ")}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Flag
                    className={`w-3 h-3 ${getPriorityColor(task.priority)}`}
                  />
                  <span className="text-xs text-gray-600 font-medium">
                    {task.priority}
                  </span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors group"
              >
                <X className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 space-y-6">
                  <div>
                    <h3 className="text-base font-medium text-gray-900 mb-3 flex items-center">
                      <Eye className="w-4 h-4 mr-2" />
                      Description
                    </h3>
                    <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                      {task.description || "No description provided."}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-medium text-gray-900 flex items-center">
                        <CheckSquare className="w-4 h-4 mr-2" />
                        Checklist
                        {optimisticSubtasks &&
                          optimisticSubtasks.length > 0 && (
                            <span className="ml-2 text-xs text-gray-500">
                              {subtaskStats.completed}/{subtaskStats.total}
                            </span>
                          )}
                      </h3>
                      <button
                        onClick={() => onAddSubtask?.(task.id)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                      >
                        Add an item
                      </button>
                    </div>

                    {optimisticSubtasks && optimisticSubtasks.length > 0 && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>
                            {Math.round(subtaskStats.percentage)}% complete
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div
                            className="bg-green-500 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${subtaskStats.percentage}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {optimisticSubtasks && optimisticSubtasks.length > 0 ? (
                      <div className="space-y-1">
                        {optimisticSubtasks.map((subtask) => (
                          <SubtaskItem
                            key={subtask.id}
                            subtask={subtask}
                            onToggle={handleSubtaskToggle}
                            formatDate={formatDate}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No checklist items yet</p>
                        <button
                          onClick={() => onAddSubtask?.(task.id)}
                          className="text-xs text-blue-600 hover:text-blue-700 mt-1 cursor-pointer"
                        >
                          Add your first item
                        </button>
                      </div>
                    )}
                  </div>

                  {task.tagList && task.tagList.length > 0 && (
                    <div>
                      <h3 className="text-base font-medium text-gray-900 mb-3 flex items-center">
                        <Tag className="w-4 h-4 mr-2" />
                        Tags
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {task.tagList.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-base font-medium text-gray-900 mb-3 flex items-center">
                      <Activity className="w-4 h-4 mr-2" />
                      Activity & Comments
                    </h3>

                    <form onSubmit={handleSubmitComment} className="mb-4">
                      <div className="flex space-x-2">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          U
                        </div>
                        <div className="flex-1">
                          <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows={2}
                            placeholder="Write a comment..."
                          />
                          <div className="flex justify-end mt-2">
                            <Button
                              type="submit"
                              size="sm"
                              disabled={!newComment.trim()}
                              loading={createCommentMutation.isPending}
                            >
                              Comment
                            </Button>
                          </div>
                        </div>
                      </div>
                    </form>

                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {commentsLoading ? (
                        <div className="text-sm text-gray-500 text-center py-4">
                          Loading activity...
                        </div>
                      ) : (
                        <>
                          <div className="flex space-x-2">
                            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-3 h-3 text-green-600" />
                            </div>
                            <div className="flex-1">
                              <div className="text-xs text-gray-600">
                                <span className="font-medium">
                                  Task created
                                </span>
                                <span className="ml-2 text-gray-500">
                                  {formatTimeAgo(task.updatedAt)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {comments && comments.length > 0 ? (
                            comments.map((comment) => (
                              <CommentItem
                                key={comment.id}
                                comment={comment}
                                formatTimeAgo={formatTimeAgo}
                              />
                            ))
                          ) : (
                            <div className="text-sm text-gray-500 text-center py-2">
                              No comments yet
                            </div>
                          )}

                          {task.assignee && (
                            <div className="flex space-x-2">
                              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                <User className="w-3 h-3 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <div className="text-xs text-gray-600">
                                  <span className="font-medium">Assigned</span>{" "}
                                  to{" "}
                                  <span className="font-medium">
                                    {task.assignee.firstName}{" "}
                                    {task.assignee.lastName}
                                  </span>
                                  <span className="ml-2 text-gray-500">
                                    {formatTimeAgo(task.updatedAt)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2 uppercase tracking-wide">
                      Actions
                    </h3>
                    <div className="space-y-2">
                      <button
                        onClick={() => onEdit?.(task.id)}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
                      >
                        <Edit className="w-3 h-3" />
                        <span>Edit</span>
                      </button>

                      <div className="relative">
                        <button
                          onClick={() => setShowQuickActions(!showQuickActions)}
                          className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
                        >
                          <MoreHorizontal className="w-3 h-3" />
                          <span>Change Status</span>
                        </button>

                        {showQuickActions && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-10">
                            <div className="p-1">
                              {["TODO", "IN_PROGRESS", "REVIEW", "DONE"].map(
                                (status) => (
                                  <button
                                    key={status}
                                    onClick={() => handleStatusChange(status)}
                                    className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded flex items-center space-x-2"
                                  >
                                    <StatusIcon status={status} />
                                    <span>{status.replace("_", " ")}</span>
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handleDelete}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2 uppercase tracking-wide">
                      Assignee
                    </h3>
                    <div className="relative">
                      {task.assignee ? (
                        <div
                          className="flex items-center space-x-2 p-3 hover:bg-gray-50 rounded cursor-pointer"
                          onClick={() => setShowAssigneeSearch(true)}
                        >
                          {task.assignee.avatar ? (
                            <img
                              src={task.assignee.avatar}
                              alt={`${task.assignee.firstName} ${task.assignee.lastName}`}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                              {task.assignee.firstName[0]}
                              {task.assignee.lastName[0]}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {task.assignee.firstName} {task.assignee.lastName}
                            </div>
                            {task.assignee.jobTitle && (
                              <div className="text-sm text-gray-500 truncate">
                                {task.assignee.jobTitle}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div
                          className="flex items-center space-x-2 text-gray-500 p-3 hover:bg-gray-50 rounded cursor-pointer"
                          onClick={() => setShowAssigneeSearch(true)}
                        >
                          <User className="w-8 h-8 p-2 bg-gray-100 rounded-full" />
                          <span className="text-sm">Click to assign</span>
                        </div>
                      )}

                      {showAssigneeSearch && (
                        <div className="assignee-dropdown absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                          <div className="p-2">
                            <input
                              type="text"
                              placeholder="Search members..."
                              onChange={(e) =>
                                setAssigneeSearchTerm(e.target.value)
                              }
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              autoFocus
                            />
                          </div>
                          <div className="max-h-32 overflow-y-auto">
                            <button
                              onClick={() => {
                                handleAssigneeChange(null);
                                setShowAssigneeSearch(false);
                                setAssigneeSearchTerm("");
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <User className="w-6 h-6 p-1 bg-gray-100 rounded-full" />
                              <span>Unassigned</span>
                            </button>

                            {filteredMembers.map((member) => (
                              <button
                                key={member.id}
                                onClick={() => {
                                  handleAssigneeChange(member.user.id);
                                  setShowAssigneeSearch(false);
                                  setAssigneeSearchTerm("");
                                }}
                                className={`w-full flex items-center space-x-2 px-3 py-2 text-sm hover:bg-gray-50 ${
                                  task.assignee?.id === member.user.id
                                    ? "bg-blue-50 text-blue-700"
                                    : "text-gray-700"
                                }`}
                              >
                                {member.user.avatar ? (
                                  <img
                                    src={member.user.avatar}
                                    alt={`${member.user.firstName} ${member.user.lastName}`}
                                    className="w-6 h-6 rounded-full"
                                  />
                                ) : (
                                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                    {member.user.firstName[0]}
                                    {member.user.lastName[0]}
                                  </div>
                                )}
                                <div className="text-left flex-1 min-w-0">
                                  <div className="font-medium truncate">
                                    {member.user.firstName}{" "}
                                    {member.user.lastName}
                                  </div>
                                  <div className="text-sm text-gray-500 truncate">
                                    {member.user.username}
                                  </div>
                                </div>
                              </button>
                            ))}

                            {filteredMembers.length === 0 && (
                              <div className="px-3 py-2 text-sm text-gray-500">
                                No team members found
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2 uppercase tracking-wide">
                      Due Date
                    </h3>
                    <div className="flex items-center space-x-2 px-3 py-2.5 bg-gray-50 rounded">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span
                        className={`text-sm ${
                          task.isOverdue ? "text-red-600" : "text-gray-700"
                        }`}
                      >
                        {formatDate(task.dueDate)}
                      </span>
                    </div>
                  </div>

                  {task.tagList && task.tagList.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-2 uppercase tracking-wide">
                        Labels
                      </h3>
                      <div className="flex flex-wrap gap-1">
                        {task.tagList.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2 uppercase tracking-wide">
                      Created
                    </h3>
                    <div className="text-sm text-gray-700 px-3 py-2.5 bg-gray-50 rounded">
                      {formatTimeAgo(task.updatedAt)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 px-6 py-3">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Last updated {formatTimeAgo(task.updatedAt)}</span>
              <div className="flex items-center space-x-4">
                {task.assignee && (
                  <span>Assigned to {task.assignee.firstName}</span>
                )}
                {task.dueDate && (
                  <span className={task.isOverdue ? "text-red-500" : ""}>
                    Due {formatDate(task.dueDate)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
