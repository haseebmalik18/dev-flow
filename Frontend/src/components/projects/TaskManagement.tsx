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
  Send,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
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
import { TaskCardModal } from "../tasks/TaskCardModal";
import type {
  TaskSummary,
  TaskFilterRequest,
} from "../../services/taskService";
import { Link } from "react-router-dom";
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
  onAddSubtask?: (parentTaskId: number) => void;
}

export const EnhancedTaskManagement: React.FC<EnhancedTaskManagementProps> = ({
  projectId,
  projectMembers = [],
  onAddTask,
  onEditTask,
  onAddSubtask,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [localTasks, setLocalTasks] = useState<TaskSummary[]>([]);
  const [selectedTaskForModal, setSelectedTaskForModal] =
    useState<TaskSummary | null>(null);

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

  const tasksByStatus = useMemo(() => {
    const organized = {
      TODO: localTasks.filter((task) => task.status === "TODO"),
      IN_PROGRESS: localTasks.filter((task) => task.status === "IN_PROGRESS"),
      REVIEW: localTasks.filter((task) => task.status === "REVIEW"),
      DONE: localTasks.filter((task) => task.status === "DONE"),
    };
    return organized;
  }, [localTasks]);

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

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const taskId = parseInt(draggableId);
    const newStatus = destination.droppableId as
      | "TODO"
      | "IN_PROGRESS"
      | "REVIEW"
      | "DONE";

    const originalTasks = [...localTasks];

    const updatedTasks = localTasks.map((task) =>
      task.id === taskId ? { ...task, status: newStatus } : task
    );
    setLocalTasks(updatedTasks);

    try {
      await updateTaskMutation.mutateAsync({
        id: taskId,
        data: { status: newStatus },
      });
      toast.success("Task status updated successfully!");
    } catch (error) {
      setLocalTasks(originalTasks);
      toast.error("Failed to update task status. Please try again.");
    }
  };

  const TaskCard: React.FC<{
    task: TaskSummary;
    index: number;
  }> = ({ task, index }) => {
    return (
      <Draggable draggableId={task.id.toString()} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`bg-white rounded-lg border-l-4 ${getPriorityColor(
              task.priority
            )} border-r border-t border-b border-gray-200 p-4 hover:shadow-md transition-all duration-200 cursor-pointer group mb-3 ${
              snapshot.isDragging ? "shadow-lg rotate-2 z-50 opacity-90" : ""
            }`}
            onClick={(e) => {
              if (!snapshot.isDragging) {
                setSelectedTaskForModal(task);
              }
            }}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <h4 className="font-medium text-gray-900 line-clamp-2 text-sm">
                  {task.title}
                </h4>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ml-2 flex-shrink-0 ${getPriorityBadgeColor(
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
                  {task.tagList.slice(0, 3).map((tag, tagIndex) => (
                    <span
                      key={tagIndex}
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
        )}
      </Draggable>
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
    return (
      <div
        className={`border rounded-lg ${
          statusColors[status as keyof typeof statusColors]
        } shadow-sm h-[600px] flex flex-col`}
      >
        <div
          className={`px-4 py-3 border-b ${
            statusHeaderColors[status as keyof typeof statusHeaderColors]
          } rounded-t-lg flex-shrink-0`}
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

        <Droppable droppableId={status}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`p-3 flex-1 overflow-y-auto transition-all duration-200 ${
                snapshot.isDraggingOver
                  ? "bg-blue-50 ring-2 ring-blue-300 ring-opacity-50"
                  : ""
              }`}
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "#cbd5e1 #f1f5f9",
                minHeight: "500px",
              }}
            >
              {tasks.length === 0 && !snapshot.isDraggingOver && (
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

              {tasks.length === 0 && snapshot.isDraggingOver && (
                <div className="text-center py-8 text-blue-600">
                  <div className="w-16 h-16 bg-blue-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                    {getStatusIcon(status)}
                  </div>
                  <p className="text-sm font-medium">
                    Drop task here to move to{" "}
                    {statusLabels[status as keyof typeof statusLabels]}
                  </p>
                </div>
              )}

              {tasks.map((task, index) => (
                <TaskCard key={task.id} task={task} index={index} />
              ))}

              {provided.placeholder}
            </div>
          )}
        </Droppable>
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

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {["TODO", "IN_PROGRESS", "REVIEW", "DONE"].map((status) => {
            const statusTasks =
              tasksByStatus[status as keyof typeof tasksByStatus];
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
      </DragDropContext>

      <TaskCardModal
        task={selectedTaskForModal}
        isOpen={!!selectedTaskForModal}
        onClose={() => setSelectedTaskForModal(null)}
        projectMembers={projectMembers}
        onEdit={onEditTask}
        onAddSubtask={onAddSubtask}
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
