import React from "react";
import { Link } from "react-router-dom";
import {
  CheckSquare,
  AlertTriangle,
  MoreHorizontal,
  Calendar,
} from "lucide-react";
import { useTasksOverview } from "../../hooks/useDashboard";

interface TaskItemProps {
  task: {
    id: number;
    title: string;
    status: string;
    priority: string;
    dueDate: string | null;
    isOverdue: boolean;
    progress: number;
    project: string;
    assignee: {
      name: string;
      initials: string;
      avatar: string | null;
    } | null;
  };
}

const TaskItem: React.FC<TaskItemProps> = ({ task }) => {
  const getPriorityColor = () => {
    switch (task.priority?.toLowerCase()) {
      case "critical":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      default:
        return "bg-green-500";
    }
  };

  const getStatusColor = () => {
    switch (task.status?.toLowerCase()) {
      case "done":
        return "bg-green-100 text-green-800";
      case "review":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = () => {
    switch (task.status?.toLowerCase()) {
      case "done":
        return "Done";
      case "review":
        return "Review";
      case "in_progress":
        return "In Progress";
      default:
        return "To Do";
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

  return (
    <div className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
      <div className={`w-1 h-12 rounded-full ${getPriorityColor()}`}></div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-medium text-gray-900 truncate">{task.title}</h4>
          <button className="p-1 hover:bg-gray-200 rounded transition-colors">
            <MoreHorizontal className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-2">{task.project}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              {task.assignee ? (
                <>
                  {task.assignee.avatar ? (
                    <img
                      src={task.assignee.avatar}
                      alt={task.assignee.name}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                      {task.assignee.initials}
                    </div>
                  )}
                  <span className="text-sm text-gray-600">
                    {task.assignee.name}
                  </span>
                </>
              ) : (
                <span className="text-sm text-gray-400">Unassigned</span>
              )}
            </div>

            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}
            >
              {getStatusText()}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {task.isOverdue && (
              <AlertTriangle className="w-4 h-4 text-red-500" />
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

const TaskItemSkeleton: React.FC = () => (
  <div className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg animate-pulse">
    <div className="w-1 h-12 bg-gray-200 rounded-full"></div>
    <div className="flex-1">
      <div className="flex justify-between mb-1">
        <div className="h-5 bg-gray-200 rounded w-48"></div>
        <div className="w-4 h-4 bg-gray-200 rounded"></div>
      </div>
      <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
      <div className="flex justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
          <div className="h-6 bg-gray-200 rounded w-16"></div>
        </div>
        <div className="h-4 bg-gray-200 rounded w-12"></div>
      </div>
    </div>
  </div>
);

export const TasksOverview: React.FC = () => {
  const { data: taskData, isLoading, error } = useTasksOverview();

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <CheckSquare className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Tasks
            </h2>
          </div>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            <span>Failed to load tasks</span>
          </div>
        </div>
      </div>
    );
  }

  const taskStats = taskData?.stats || {
    total: 0,
    todo: 0,
    inProgress: 0,
    review: 0,
    completed: 0,
    overdue: 0,
  };

  const recentTasks = taskData?.recentTasks || [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <CheckSquare className="w-5 h-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">Recent Tasks</h2>
        </div>
        <Link
          to="/tasks"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          View All Tasks
        </Link>
      </div>

      {isLoading ? (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="text-center p-3 bg-gray-50 rounded-lg animate-pulse"
              >
                <div className="h-6 bg-gray-200 rounded w-8 mx-auto mb-1"></div>
                <div className="h-4 bg-gray-200 rounded w-12 mx-auto"></div>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <TaskItemSkeleton key={index} />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-gray-900">
                {taskStats.total}
              </div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-600">
                {taskStats.completed}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-600">
                {taskStats.inProgress}
              </div>
              <div className="text-sm text-gray-600">In Progress</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-lg font-bold text-red-600">
                {taskStats.overdue}
              </div>
              <div className="text-sm text-gray-600">Overdue</div>
            </div>
          </div>

          {recentTasks.length > 0 ? (
            <div className="space-y-3">
              {recentTasks.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-500">
                <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No tasks yet</p>
                <p className="text-sm">Create your first task to get started</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
