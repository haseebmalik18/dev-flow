import React, { useState } from "react";
import {
  CheckSquare,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  User,
  Calendar,
  Play,
  Pause,
  CheckCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Button } from "../ui/Button";
import { TaskFormModal } from "../projects/TaskFormModal";
import {
  useSubtasks,
  useCreateSubtask,
  useUpdateTask,
  useDeleteTask,
  useCompleteTask,
  useReopenTask,
} from "../../hooks/useTasks";

interface SubtaskSectionProps {
  taskId: number;
  projectId: number;
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
}

interface Subtask {
  id: number;
  title: string;
  description: string;
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  dueDate: string | null;
  progress: number;
  isOverdue: boolean;
  assignee?: {
    id: number;
    firstName: string;
    lastName: string;
    avatar: string | null;
  };
  updatedAt: string;
}

export const SubtaskSection: React.FC<SubtaskSectionProps> = ({
  taskId,
  projectId,
  projectMembers = [],
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSubtask, setEditingSubtask] = useState<number | null>(null);
  const [showActions, setShowActions] = useState<number | null>(null);

  const { data: subtasks, isLoading, error } = useSubtasks(taskId);

  const createSubtaskMutation = useCreateSubtask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  const completeTaskMutation = useCompleteTask();
  const reopenTaskMutation = useReopenTask();

  const getStatusIcon = (status: string) => {
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
        return "border-l-red-500";
      case "HIGH":
        return "border-l-orange-500";
      case "MEDIUM":
        return "border-l-yellow-500";
      default:
        return "border-l-green-500";
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case "CRITICAL":
        return "bg-red-100 text-red-800";
      case "HIGH":
        return "bg-orange-100 text-orange-800";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-green-100 text-green-800";
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
    });
  };

  const handleStatusChange = async (subtaskId: number, newStatus: string) => {
    try {
      if (newStatus === "DONE") {
        await completeTaskMutation.mutateAsync(subtaskId);
      } else {
        await updateTaskMutation.mutateAsync({
          id: subtaskId,
          data: { status: newStatus as any },
        });
      }
      setShowActions(null);
    } catch (error) {
      // Error handled by mutation hooks
    }
  };

  const handleDeleteSubtask = async (subtaskId: number) => {
    if (window.confirm("Are you sure you want to delete this subtask?")) {
      try {
        await deleteTaskMutation.mutateAsync(subtaskId);
        setShowActions(null);
      } catch (error) {
        // Error handled by mutation hook
      }
    }
  };

  const getCompletionStats = () => {
    if (!subtasks || subtasks.length === 0)
      return { completed: 0, total: 0, percentage: 0 };

    const completed = subtasks.filter((s) => s.status === "DONE").length;
    const total = subtasks.length;
    const percentage = Math.round((completed / total) * 100);

    return { completed, total, percentage };
  };

  const { completed, total, percentage } = getCompletionStats();

  const SubtaskItem: React.FC<{ subtask: Subtask }> = ({ subtask }) => (
    <div
      className={`bg-white rounded-lg border-l-4 ${getPriorityColor(
        subtask.priority
      )} border-r border-t border-b border-gray-200 p-4 hover:shadow-md transition-all duration-200`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3 mb-2">
            {getStatusIcon(subtask.status)}
            <h4 className="font-medium text-gray-900 truncate">
              {subtask.title}
            </h4>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                  subtask.status
                )}`}
              >
                {subtask.status.replace("_", " ")}
              </span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadgeColor(
                  subtask.priority
                )}`}
              >
                {subtask.priority}
              </span>
            </div>
          </div>

          {subtask.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {subtask.description}
            </p>
          )}

          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-600">
                Progress
              </span>
              <span className="text-xs text-gray-600">{subtask.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${subtask.progress}%` }}
              ></div>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-3">
              {subtask.assignee ? (
                <div className="flex items-center space-x-1">
                  <User className="w-3 h-3 text-gray-400" />
                  <div className="flex items-center space-x-1">
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
                    <span className="text-gray-600">
                      {subtask.assignee.firstName}
                    </span>
                  </div>
                </div>
              ) : (
                <span className="text-gray-400 text-xs">Unassigned</span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {subtask.isOverdue && (
                <AlertTriangle className="w-4 h-4 text-red-500" />
              )}
              <Calendar className="w-3 h-3 text-gray-400" />
              <span
                className={`text-xs ${
                  subtask.isOverdue ? "text-red-600" : "text-gray-500"
                }`}
              >
                {formatDate(subtask.dueDate)}
              </span>
            </div>
          </div>
        </div>

        <div className="relative ml-3">
          <button
            onClick={() =>
              setShowActions(showActions === subtask.id ? null : subtask.id)
            }
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <MoreHorizontal className="w-4 h-4 text-gray-400" />
          </button>

          {showActions === subtask.id && (
            <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[160px]">
              <button
                onClick={() => {
                  setEditingSubtask(subtask.id);
                  setShowActions(null);
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </button>

              <div className="border-t border-gray-100 my-1" />

              <div className="px-3 py-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Status
                </span>
              </div>
              {["TODO", "IN_PROGRESS", "REVIEW", "DONE"].map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(subtask.id, status)}
                  className={`w-full flex items-center space-x-2 px-3 py-2 text-sm hover:bg-gray-50 ${
                    subtask.status === status
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700"
                  }`}
                >
                  {getStatusIcon(status)}
                  <span>{status.replace("_", " ")}</span>
                </button>
              ))}

              <div className="border-t border-gray-100 my-1" />

              <button
                onClick={() => handleDeleteSubtask(subtask.id)}
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

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center py-8">
          <CheckSquare className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Failed to load subtasks
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
          <CheckSquare className="w-5 h-5 mr-2" />
          Subtasks
          {subtasks && subtasks.length > 0 && (
            <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm">
              {completed}/{total}
            </span>
          )}
        </h3>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCreateModalOpen(true)}
          icon={<Plus className="w-4 h-4" />}
        >
          Add Subtask
        </Button>
      </div>

      {subtasks && subtasks.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Overall Progress
            </span>
            <span className="text-sm text-gray-600">{percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between mt-2 text-sm text-gray-600">
            <span>{completed} completed</span>
            <span>{total - completed} remaining</span>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="bg-gray-100 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-4 h-4 bg-gray-200 rounded"></div>
                  <div className="h-5 bg-gray-200 rounded w-48"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-2 bg-gray-200 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      ) : subtasks && subtasks.length > 0 ? (
        <div className="space-y-4">
          {subtasks.map((subtask) => (
            <SubtaskItem
              key={subtask.id}
              subtask={{
                ...subtask,
                assignee:
                  subtask.assignee === null ? undefined : subtask.assignee,
              }}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No subtasks yet
          </h3>
          <p className="text-gray-600 mb-4">
            Break down this task into smaller, manageable subtasks.
          </p>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Create First Subtask
          </Button>
        </div>
      )}

      <TaskFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        projectId={projectId}
        parentTaskId={taskId}
        projectMembers={projectMembers}
        availableTasks={[]} // Subtasks shouldn't have dependencies
      />

      <TaskFormModal
        isOpen={!!editingSubtask}
        onClose={() => setEditingSubtask(null)}
        projectId={projectId}
        taskId={editingSubtask || undefined}
        projectMembers={projectMembers}
        availableTasks={[]}
      />
    </div>
  );
};
