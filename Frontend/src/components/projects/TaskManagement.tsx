import React, { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Search,
  MoreHorizontal,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  Edit,
  Trash2,
  Play,
  Pause,
  Archive,
  GitMerge,
  Loader2,
  X,
  User,
  Hash,
  Tag,
  MessageCircle,
  Link as LinkIcon,
  Flag,
  Users,
} from "lucide-react";
import { Button } from "../ui/Button";
import {
  useProjectTasks,
  useUpdateTask,
  useDeleteTask,
  useCompleteTask,
  useReopenTask,
  useAssignTask,
  useUnassignTask,
  useArchiveTask,
  useBulkUpdateTasks,
} from "../../hooks/useTasks";
import type {
  TaskSummary,
  TaskFilterRequest,
} from "../../services/taskService";
import { Link } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  useDroppable,
} from "@dnd-kit/core";
import type {
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { createPortal } from "react-dom";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "react-hot-toast";

interface EnhancedTaskManagementProps {
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
  onAddTask?: () => void;
  onEditTask?: (taskId: number) => void;
}

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
}

const TaskCardModal: React.FC<TaskCardModalProps> = ({
  task,
  isOpen,
  onClose,
  projectMembers = [],
  onEdit,
}) => {
  const [showActions, setShowActions] = useState(false);

  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  const completeTaskMutation = useCompleteTask();
  const reopenTaskMutation = useReopenTask();
  const assignTaskMutation = useAssignTask();
  const unassignTaskMutation = useUnassignTask();
  const archiveTaskMutation = useArchiveTask();

  if (!isOpen || !task) return null;

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
        return <Flag className="w-4 h-4 text-red-600" />;
      case "HIGH":
        return <Flag className="w-4 h-4 text-orange-600" />;
      case "MEDIUM":
        return <Flag className="w-4 h-4 text-yellow-600" />;
      default:
        return <Flag className="w-4 h-4 text-green-600" />;
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div
        className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div
              className="w-1 h-8 rounded-full"
              style={{ backgroundColor: task.project.color }}
            />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {task.title}
              </h1>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-sm text-gray-500">in</span>
                <span className="text-sm font-medium text-blue-600">
                  {task.project.name}
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-sm text-gray-500">
                  Updated {formatDate(task.updatedAt)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit?.(task.id)}
              icon={<Edit className="w-4 h-4" />}
            >
              Edit
            </Button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div
          className="flex overflow-hidden"
          style={{ height: "calc(90vh - 120px)" }}
        >
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(task.status)}
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                      task.status
                    )}`}
                  >
                    {task.status.replace("_", " ")}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {getPriorityIcon(task.priority)}
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(
                      task.priority
                    )}`}
                  >
                    {task.priority} Priority
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Progress
                  </span>
                  <span className="text-sm text-gray-600">
                    {task.progress}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Description
                </h3>
                <div className="prose prose-sm max-w-none text-gray-700">
                  {task.description || "No description provided."}
                </div>
              </div>

              {task.tagList && task.tagList.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <Tag className="w-5 h-5 mr-2" />
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {task.tagList.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800 border"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  Status Indicators
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {task.isOverdue && (
                    <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-lg border border-red-200">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <span className="text-sm font-medium text-red-800">
                        Overdue
                      </span>
                    </div>
                  )}
                  {task.isBlocked && (
                    <div className="flex items-center space-x-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <GitMerge className="w-5 h-5 text-orange-600" />
                      <span className="text-sm font-medium text-orange-800">
                        Blocked
                      </span>
                    </div>
                  )}
                  {!task.isOverdue && !task.isBlocked && (
                    <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg border border-green-200">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-800">
                        On Track
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Actions
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Link to={`/tasks/${task.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<LinkIcon className="w-4 h-4" />}
                    >
                      View Full Details
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleArchive}
                    icon={<Archive className="w-4 h-4" />}
                  >
                    Archive
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDelete}
                    className="text-red-600 border-red-600 hover:bg-red-50"
                    icon={<Trash2 className="w-4 h-4" />}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="w-80 border-l border-gray-200 bg-gray-50 overflow-y-auto">
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Assignee
                </label>
                {task.assignee ? (
                  <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border">
                    {task.assignee.avatar ? (
                      <img
                        src={task.assignee.avatar}
                        alt={`${task.assignee.firstName} ${task.assignee.lastName}`}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {task.assignee.firstName[0]}
                        {task.assignee.lastName[0]}
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-gray-900">
                        {task.assignee.firstName} {task.assignee.lastName}
                      </div>
                      {task.assignee.jobTitle && (
                        <div className="text-sm text-gray-600">
                          {task.assignee.jobTitle}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-dashed border-gray-300">
                    <User className="w-8 h-8 text-gray-400" />
                    <span className="text-gray-500">Unassigned</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Due Date
                </label>
                <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <span
                    className={`${
                      task.isOverdue ? "text-red-600" : "text-gray-900"
                    }`}
                  >
                    {formatDate(task.dueDate)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Change Status
                </label>
                <div className="space-y-2">
                  {["TODO", "IN_PROGRESS", "REVIEW", "DONE"].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className={`w-full flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                        task.status === status
                          ? "bg-blue-50 border-blue-200 text-blue-700"
                          : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {getStatusIcon(status)}
                      <span className="font-medium">
                        {status.replace("_", " ")}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Assign To
                </label>
                <div className="space-y-2">
                  <button
                    onClick={() => handleAssigneeChange(null)}
                    className="w-full flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <X className="w-5 h-5" />
                    <span>Unassigned</span>
                  </button>
                  {projectMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => handleAssigneeChange(member.user.id)}
                      className={`w-full flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                        task.assignee?.id === member.user.id
                          ? "bg-blue-50 border-blue-200 text-blue-700"
                          : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {member.user.avatar ? (
                        <img
                          src={member.user.avatar}
                          alt={`${member.user.firstName} ${member.user.lastName}`}
                          className="w-5 h-5 rounded-full"
                        />
                      ) : (
                        <div className="w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center text-xs">
                          {member.user.firstName[0]}
                        </div>
                      )}
                      <span>
                        {member.user.firstName} {member.user.lastName}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const EnhancedTaskManagement: React.FC<EnhancedTaskManagementProps> = ({
  projectId,
  projectMembers = [],
  onAddTask,
  onEditTask,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [activeTask, setActiveTask] = useState<TaskSummary | null>(null);
  const [localTasks, setLocalTasks] = useState<TaskSummary[]>([]);
  const [selectedTaskForModal, setSelectedTaskForModal] =
    useState<TaskSummary | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const filters: TaskFilterRequest = useMemo(() => {
    const baseFilters: TaskFilterRequest = {
      projectId,
    };

    if (searchTerm.trim()) {
      baseFilters.search = searchTerm.trim();
    }

    if (statusFilter !== "all") {
      baseFilters.status = statusFilter as any;
    }

    if (priorityFilter !== "all") {
      baseFilters.priority = priorityFilter as any;
    }

    if (assigneeFilter !== "all") {
      if (assigneeFilter === "unassigned") {
        // Handle unassigned tasks
      } else {
        baseFilters.assigneeId = parseInt(assigneeFilter);
      }
    }

    return baseFilters;
  }, [projectId, searchTerm, statusFilter, priorityFilter, assigneeFilter]);

  const {
    data: tasksData,
    isLoading: isLoadingTasks,
    error: tasksError,
  } = useProjectTasks(projectId, currentPage, 100, filters);

  const updateTaskMutation = useUpdateTask();
  const bulkUpdateMutation = useBulkUpdateTasks();

  const tasks = tasksData?.content || [];
  const totalTasks = tasksData?.totalElements || 0;

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "done":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "in_progress":
        return <Play className="w-4 h-4 text-blue-600" />;
      case "review":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <Pause className="w-4 h-4 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "critical":
        return "border-l-red-500";
      case "high":
        return "border-l-orange-500";
      case "medium":
        return "border-l-yellow-500";
      default:
        return "border-l-green-500";
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "critical":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
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

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id;
    const newStatus = over.id as "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";

    const prevTasks = [...localTasks];
    const taskIdx = localTasks.findIndex((t) => t.id === taskId);
    if (taskIdx === -1) return;

    const updatedTasks = localTasks.map((t) =>
      t.id === taskId ? { ...t, status: newStatus } : t
    );
    setLocalTasks(updatedTasks);

    try {
      await updateTaskMutation.mutateAsync({
        id: taskId as number,
        data: { status: newStatus },
      });
    } catch (error) {
      setLocalTasks(prevTasks);
      toast.error("Failed to update task status. Please try again.");
    }
  };

  const TaskCard: React.FC<{ task: TaskSummary }> = ({ task }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: task.id,
      data: {
        type: "Task",
        task,
      },
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`bg-white rounded-lg border-l-4 ${getPriorityColor(
          task.priority
        )} border-r border-t border-b border-gray-200 p-4 hover:shadow-md transition-all duration-200 cursor-pointer group`}
        onClick={() => setSelectedTaskForModal(task)}
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <h4 className="font-medium text-gray-900 line-clamp-2 text-sm">
              {task.title}
            </h4>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadgeColor(
                task.priority
              )}`}
            >
              {task.priority}
            </span>
          </div>

          {task.description && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {task.description}
            </p>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Progress</span>
              <span className="text-gray-900 font-medium">
                {task.progress}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${task.progress}%` }}
              />
            </div>
          </div>

          {task.tagList && task.tagList.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {task.tagList.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                >
                  {tag}
                </span>
              ))}
              {task.tagList.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded">
                  +{task.tagList.length - 3}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center space-x-2">
              {task.assignee ? (
                <div className="flex items-center space-x-1">
                  {task.assignee.avatar ? (
                    <img
                      src={task.assignee.avatar}
                      alt={`${task.assignee.firstName} ${task.assignee.lastName}`}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                      {task.assignee.firstName[0]}
                      {task.assignee.lastName[0]}
                    </div>
                  )}
                </div>
              ) : (
                <User className="w-6 h-6 text-gray-400" />
              )}

              <div className="flex items-center space-x-1">
                {task.isOverdue && (
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                )}
                {task.isBlocked && (
                  <GitMerge className="w-4 h-4 text-orange-500" />
                )}
              </div>
            </div>

            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Calendar className="w-3 h-3" />
              <span className={task.isOverdue ? "text-red-600" : ""}>
                {formatDate(task.dueDate)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const uniqueAssignees = Array.from(
    new Set(
      projectMembers.map((member) => ({
        id: member.user.id,
        name: `${member.user.firstName} ${member.user.lastName}`,
      }))
    )
  );

  const StatusColumn: React.FC<{
    status: string;
    tasks: TaskSummary[];
    statusLabels: Record<string, string>;
    statusColors: Record<string, string>;
    statusHeaderColors: Record<string, string>;
  }> = ({ status, tasks, statusLabels, statusColors, statusHeaderColors }) => {
    const { setNodeRef } = useDroppable({
      id: status,
    });

    return (
      <div
        className={`border rounded-lg ${
          statusColors[status as keyof typeof statusColors]
        } shadow-sm min-h-[600px] flex flex-col`}
      >
        <div
          className={`px-4 py-3 border-b ${
            statusHeaderColors[status as keyof typeof statusHeaderColors]
          } rounded-t-lg`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getStatusIcon(status)}
              <h4 className="font-medium text-gray-900">
                {statusLabels[status as keyof typeof statusLabels]}
              </h4>
            </div>
            <span className="bg-white text-gray-700 text-xs px-2 py-1 rounded-full shadow-sm">
              {tasks.length}
            </span>
          </div>
        </div>

        <SortableContext
          items={tasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          <div
            ref={setNodeRef}
            className="p-3 space-y-3 flex-1"
            data-status={status}
          >
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
            {tasks.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <div className="w-12 h-12 bg-gray-50 rounded-lg mx-auto mb-2 flex items-center justify-center">
                  {getStatusIcon(status)}
                </div>
                <p className="text-sm">
                  No{" "}
                  {statusLabels[
                    status as keyof typeof statusLabels
                  ].toLowerCase()}{" "}
                  tasks
                </p>
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    );
  };

  if (isLoadingTasks) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading tasks...</span>
        </div>
      </div>
    );
  }

  if (tasksError) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Failed to load tasks
          </h2>
          <p className="text-gray-600">Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Kanban Board</h3>
          <p className="text-sm text-gray-600">
            {tasks.length} tasks • Drag and drop to update status
          </p>
        </div>

        <Button
          onClick={onAddTask}
          icon={<Plus className="w-4 h-4" />}
          className="cursor-pointer"
        >
          Add Task
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="REVIEW">Review</option>
            <option value="DONE">Completed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>

          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Assignees</option>
            <option value="unassigned">Unassigned</option>
            {uniqueAssignees.map((assignee) => (
              <option key={assignee.id} value={assignee.id}>
                {assignee.name}
              </option>
            ))}
          </select>

          <div className="flex items-center justify-end">
            <span className="text-sm text-gray-600">{tasks.length} tasks</span>
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {["TODO", "IN_PROGRESS", "REVIEW", "DONE"].map((status) => {
            const statusTasks = localTasks.filter((t) => t.status === status);
            const statusLabels = {
              TODO: "To Do",
              IN_PROGRESS: "In Progress",
              REVIEW: "Review",
              DONE: "Completed",
            };
            const statusColors = {
              TODO: "border-gray-200 bg-white",
              IN_PROGRESS: "border-blue-200 bg-white",
              REVIEW: "border-yellow-200 bg-white",
              DONE: "border-green-200 bg-white",
            };
            const statusHeaderColors = {
              TODO: "bg-gray-50 border-gray-200",
              IN_PROGRESS: "bg-blue-50 border-blue-200",
              REVIEW: "bg-yellow-50 border-yellow-200",
              DONE: "bg-green-50 border-green-200",
            };

            return (
              <StatusColumn
                key={status}
                status={status}
                tasks={statusTasks}
                statusLabels={statusLabels}
                statusColors={statusColors}
                statusHeaderColors={statusHeaderColors}
              />
            );
          })}
        </div>

        {typeof window !== "undefined" &&
          createPortal(
            <DragOverlay>
              {activeTask ? <TaskCard task={activeTask} /> : null}
            </DragOverlay>,
            document.body
          )}
      </DndContext>

      <TaskCardModal
        task={selectedTaskForModal}
        isOpen={!!selectedTaskForModal}
        onClose={() => setSelectedTaskForModal(null)}
        projectMembers={projectMembers}
        onEdit={onEditTask}
      />

      {tasksData && tasksData.totalElements > 100 && (
        <div className="flex items-center justify-between pt-6">
          <div className="text-sm text-gray-700">
            Showing {currentPage * 100 + 1} to{" "}
            {Math.min((currentPage + 1) * 100, tasksData.totalElements)} of{" "}
            {tasksData.totalElements} tasks
          </div>

          <div className="flex space-x-2">
            <Button
              variant="outline"
              disabled={currentPage === 0}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Previous
            </Button>

            <Button
              variant="outline"
              disabled={(currentPage + 1) * 100 >= tasksData.totalElements}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
