import React from "react";
import { CheckSquare, AlertTriangle, MoreHorizontal } from "lucide-react";

interface Task {
  id: string;
  title: string;
  project: string;
  assignee: {
    name: string;
    avatar?: string;
    initials: string;
  };
  priority: "low" | "medium" | "high" | "critical";
  status: "todo" | "in-progress" | "review" | "done";
  dueDate: string;
  isOverdue: boolean;
}

const TaskItem: React.FC<{ task: Task }> = ({ task }) => {
  const getPriorityColor = () => {
    switch (task.priority) {
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
    switch (task.status) {
      case "done":
        return "bg-green-100 text-green-800";
      case "review":
        return "bg-blue-100 text-blue-800";
      case "in-progress":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = () => {
    switch (task.status) {
      case "done":
        return "Done";
      case "review":
        return "Review";
      case "in-progress":
        return "In Progress";
      default:
        return "To Do";
    }
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
            <span
              className={`text-xs ${
                task.isOverdue ? "text-red-600" : "text-gray-500"
              }`}
            >
              {task.dueDate}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const TasksOverview: React.FC = () => {
  const tasks: Task[] = [
    {
      id: "1",
      title: "Implement user authentication",
      project: "E-commerce Platform",
      assignee: {
        name: "Alex Johnson",
        initials: "AJ",
      },
      priority: "high",
      status: "in-progress",
      dueDate: "Today",
      isOverdue: false,
    },
    {
      id: "2",
      title: "Design product catalog UI",
      project: "Mobile App Redesign",
      assignee: {
        name: "Sarah Chen",
        initials: "SC",
      },
      priority: "medium",
      status: "review",
      dueDate: "Tomorrow",
      isOverdue: false,
    },
    {
      id: "3",
      title: "Fix payment gateway bug",
      project: "E-commerce Platform",
      assignee: {
        name: "Mike Rodriguez",
        initials: "MR",
      },
      priority: "critical",
      status: "todo",
      dueDate: "2 days ago",
      isOverdue: true,
    },
    {
      id: "4",
      title: "Update API documentation",
      project: "API Gateway",
      assignee: {
        name: "Emma Wilson",
        initials: "EW",
      },
      priority: "low",
      status: "done",
      dueDate: "Dec 8",
      isOverdue: false,
    },
    {
      id: "5",
      title: "Optimize database queries",
      project: "E-commerce Platform",
      assignee: {
        name: "David Park",
        initials: "DP",
      },
      priority: "medium",
      status: "in-progress",
      dueDate: "Dec 12",
      isOverdue: false,
    },
  ];

  const taskStats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === "done").length,
    inProgress: tasks.filter((t) => t.status === "in-progress").length,
    overdue: tasks.filter((t) => t.isOverdue).length,
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <CheckSquare className="w-5 h-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">Recent Tasks</h2>
        </div>
        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          View All Tasks
        </button>
      </div>

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

      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
};
