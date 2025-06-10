import React, { useState, useMemo } from "react";
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
  Timer,
  Archive,
  GitMerge,
  Loader2,
  X,
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
  useRestoreTask,
  useBulkUpdateTasks,
  useTrackTime,
} from "../../hooks/useTasks";
import type {
  TaskSummary,
  TaskFilterRequest,
  UpdateTaskRequest,
} from "../../services/taskService";

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
  const [viewMode, setViewMode] = useState<"list" | "board">("list");
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

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
        // Handle unassigned tasks - this might need special handling in the backend
      } else {
        baseFilters.assigneeId = parseInt(assigneeFilter);
      }
    }

    if (!showCompleted) {
      // Exclude completed tasks if not showing them
      if (!baseFilters.status) {
        // Only apply this filter if no specific status is selected
        baseFilters.status = undefined; // Let backend handle this
      }
    }

    return baseFilters;
  }, [
    projectId,
    searchTerm,
    statusFilter,
    priorityFilter,
    assigneeFilter,
    showCompleted,
  ]);

  const {
    data: tasksData,
    isLoading: isLoadingTasks,
    error: tasksError,
  } = useProjectTasks(projectId, currentPage, 20, filters);

  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  const completeTaskMutation = useCompleteTask();
  const reopenTaskMutation = useReopenTask();
  const assignTaskMutation = useAssignTask();
  const unassignTaskMutation = useUnassignTask();
  const archiveTaskMutation = useArchiveTask();
  const restoreTaskMutation = useRestoreTask();
  const bulkUpdateMutation = useBulkUpdateTasks();
  const trackTimeMutation = useTrackTime();

  const tasks = tasksData?.content || [];
  const totalTasks = tasksData?.totalElements || 0;

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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "done":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "review":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
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

  const handleTaskSelect = (taskId: number, selected: boolean) => {
    if (selected) {
      setSelectedTasks((prev) => [...prev, taskId]);
    } else {
      setSelectedTasks((prev) => prev.filter((id) => id !== taskId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedTasks(tasks.map((task) => task.id));
    } else {
      setSelectedTasks([]);
    }
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedTasks.length === 0) return;

    try {
      await bulkUpdateMutation.mutateAsync({
        taskIds: selectedTasks,
        status: newStatus as any,
      });
      setSelectedTasks([]);
      setShowBulkActions(false);
    } catch (error) {
      // Error handled by mutation hook
    }
  };

  const handleBulkAssign = async (assigneeId: number) => {
    if (selectedTasks.length === 0) return;

    try {
      await bulkUpdateMutation.mutateAsync({
        taskIds: selectedTasks,
        assigneeId,
      });
      setSelectedTasks([]);
      setShowBulkActions(false);
    } catch (error) {
      // Error handled by mutation hook
    }
  };

  const TaskCard: React.FC<{ task: TaskSummary }> = ({ task }) => {
    const [showMenu, setShowMenu] = useState(false);
    const [showTimeTracker, setShowTimeTracker] = useState(false);
    const [timeHours, setTimeHours] = useState("");

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
        setShowMenu(false);
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
        setShowMenu(false);
      } catch (error) {
        // Error handled by mutation hooks
      }
    };

    const handleTrackTime = async () => {
      const hours = parseInt(timeHours);
      if (isNaN(hours) || hours <= 0) return;

      try {
        await trackTimeMutation.mutateAsync({
          id: task.id,
          data: { hours, date: new Date().toISOString() },
        });
        setTimeHours("");
        setShowTimeTracker(false);
      } catch (error) {
        // Error handled by mutation hook
      }
    };

    const handleDelete = async () => {
      if (window.confirm("Are you sure you want to delete this task?")) {
        try {
          await deleteTaskMutation.mutateAsync(task.id);
          setShowMenu(false);
        } catch (error) {
          // Error handled by mutation hook
        }
      }
    };

    return (
      <div
        className={`bg-white rounded-lg border-l-4 ${getPriorityColor(
          task.priority
        )} border-r border-t border-b border-gray-200 p-4 hover:shadow-md transition-all duration-200`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start space-x-3 flex-1">
            <input
              type="checkbox"
              checked={selectedTasks.includes(task.id)}
              onChange={(e) => handleTaskSelect(task.id, e.target.checked)}
              className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 truncate">
                {task.title}
              </h4>
              <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                {task.description}
              </p>
            </div>
          </div>

          <div className="relative ml-3">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <MoreHorizontal className="w-4 h-4 text-gray-400" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[180px]">
                <button
                  onClick={() => onEditTask?.(task.id)}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit Task</span>
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
                    onClick={() => handleStatusChange(status)}
                    className={`w-full flex items-center space-x-2 px-3 py-2 text-sm hover:bg-gray-50 ${
                      task.status === status
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700"
                    }`}
                  >
                    {getStatusIcon(status)}
                    <span>{status.replace("_", " ")}</span>
                  </button>
                ))}

                <div className="border-t border-gray-100 my-1" />

                <div className="px-3 py-1">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Assignee
                  </span>
                </div>
                <button
                  onClick={() => handleAssigneeChange(null)}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <X className="w-4 h-4" />
                  <span>Unassigned</span>
                </button>
                {projectMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => handleAssigneeChange(member.user.id)}
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
                        className="w-4 h-4 rounded-full"
                      />
                    ) : (
                      <div className="w-4 h-4 bg-gray-300 rounded-full flex items-center justify-center text-xs">
                        {member.user.firstName[0]}
                      </div>
                    )}
                    <span>
                      {member.user.firstName} {member.user.lastName}
                    </span>
                  </button>
                ))}

                <div className="border-t border-gray-100 my-1" />

                <button
                  onClick={() => setShowTimeTracker(!showTimeTracker)}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Timer className="w-4 h-4" />
                  <span>Track Time</span>
                </button>

                <button
                  onClick={() => archiveTaskMutation.mutate(task.id)}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Archive className="w-4 h-4" />
                  <span>Archive</span>
                </button>

                <button
                  onClick={handleDelete}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {showTimeTracker && (
          <div className="mb-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <input
                type="number"
                placeholder="Hours"
                value={timeHours}
                onChange={(e) => setTimeHours(e.target.value)}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                min="1"
              />
              <Button
                size="sm"
                onClick={handleTrackTime}
                disabled={!timeHours || trackTimeMutation.isPending}
              >
                {trackTimeMutation.isPending ? "..." : "Track"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowTimeTracker(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-700">Progress</span>
            <span className="text-xs text-gray-600">{task.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${task.progress}%` }}
            ></div>
          </div>
        </div>

        {task.tagList && task.tagList.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {task.tagList.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              {getStatusIcon(task.status)}
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                  task.status
                )}`}
              >
                {task.status.replace("_", " ").toUpperCase()}
              </span>
            </div>

            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadgeColor(
                task.priority
              )}`}
            >
              {task.priority}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {task.assignee && (
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
            )}

            <div className="flex items-center space-x-1">
              {task.isOverdue && (
                <AlertTriangle className="w-4 h-4 text-red-500" />
              )}
              {task.isBlocked && (
                <GitMerge className="w-4 h-4 text-orange-500" />
              )}
              <Calendar className="w-4 h-4 text-gray-400" />
              <span
                className={`text-xs ${
                  task.isOverdue ? "text-red-600" : "text-gray-500"
                }`}
              >
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
          <h3 className="text-lg font-semibold text-gray-900">Tasks</h3>
          <p className="text-sm text-gray-600">
            {tasks.length} of {totalTasks} tasks
            {selectedTasks.length > 0 && (
              <span className="ml-2 text-blue-600">
                ({selectedTasks.length} selected)
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {selectedTasks.length > 0 && (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkActions(!showBulkActions)}
              >
                Bulk Actions ({selectedTasks.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTasks([])}
              >
                Clear
              </Button>
            </div>
          )}

          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600"
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode("board")}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === "board"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600"
              }`}
            >
              Board
            </button>
          </div>

          <Button onClick={onAddTask} icon={<Plus className="w-4 h-4" />}>
            Add Task
          </Button>
        </div>
      </div>

      {showBulkActions && selectedTasks.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <span className="font-medium text-blue-900">
              {selectedTasks.length} tasks selected
            </span>
            <div className="flex items-center space-x-2">
              <select
                onChange={(e) => handleBulkStatusUpdate(e.target.value)}
                className="px-3 py-1 border border-blue-300 rounded text-sm"
                defaultValue=""
              >
                <option value="" disabled>
                  Change Status
                </option>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="REVIEW">Review</option>
                <option value="DONE">Done</option>
              </select>

              <select
                onChange={(e) => handleBulkAssign(parseInt(e.target.value))}
                className="px-3 py-1 border border-blue-300 rounded text-sm"
                defaultValue=""
              >
                <option value="" disabled>
                  Assign To
                </option>
                {projectMembers.map((member) => (
                  <option key={member.id} value={member.user.id}>
                    {member.user.firstName} {member.user.lastName}
                  </option>
                ))}
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkActions(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
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

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Show Completed</span>
          </label>

          <div className="flex items-center space-x-2">
            {tasks.length > 0 && (
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedTasks.length === tasks.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Select All</span>
              </label>
            )}
          </div>
        </div>
      </div>

      {viewMode === "list" ? (
        <div className="space-y-4">
          {tasks.length > 0 ? (
            tasks.map((task) => <TaskCard key={task.id} task={task} />)
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No tasks found</p>
                <p className="text-sm">
                  {searchTerm ||
                  statusFilter !== "all" ||
                  priorityFilter !== "all" ||
                  assigneeFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Create your first task to get started"}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Kanban Board View */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {["TODO", "IN_PROGRESS", "REVIEW", "DONE"].map((status) => {
            const statusTasks = tasks.filter((t) => t.status === status);
            const statusLabels = {
              TODO: "To Do",
              IN_PROGRESS: "In Progress",
              REVIEW: "Review",
              DONE: "Completed",
            };
            const statusColors = {
              TODO: "bg-gray-50",
              IN_PROGRESS: "bg-blue-50",
              REVIEW: "bg-yellow-50",
              DONE: "bg-green-50",
            };

            return (
              <div
                key={status}
                className={`${
                  statusColors[status as keyof typeof statusColors]
                } rounded-lg p-4 min-h-[500px]`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900">
                    {statusLabels[status as keyof typeof statusLabels]}
                  </h4>
                  <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">
                    {statusTasks.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {statusTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                  {statusTasks.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <div className="w-16 h-16 bg-gray-200 rounded-lg mx-auto mb-2 flex items-center justify-center">
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
              </div>
            );
          })}
        </div>
      )}

      {tasksData && tasksData.totalElements > 20 && (
        <div className="flex items-center justify-between pt-6">
          <div className="text-sm text-gray-700">
            Showing {currentPage * 20 + 1} to{" "}
            {Math.min((currentPage + 1) * 20, tasksData.totalElements)} of{" "}
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
              disabled={(currentPage + 1) * 20 >= tasksData.totalElements}
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
