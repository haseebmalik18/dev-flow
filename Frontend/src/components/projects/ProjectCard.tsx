import React from "react";
import { Link } from "react-router-dom";
import {
  MoreHorizontal,
  Users,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Archive,
  Edit,
  Eye,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string;
  progress: number;
  status: "planning" | "active" | "on_hold" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "critical";
  dueDate: string | null;
  teamSize: number;
  tasksCompleted: number;
  totalTasks: number;
  color: string;
  healthStatus: "on_track" | "at_risk" | "delayed" | "completed";
  updatedAt: string;
}

interface ProjectCardProps {
  project: Project;
  onArchive?: (id: string) => void;
  onEdit?: (id: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onArchive,
  onEdit,
}) => {
  const [showMenu, setShowMenu] = React.useState(false);

  const getStatusIcon = () => {
    switch (project.healthStatus) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "at_risk":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case "delayed":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-blue-500" />;
    }
  };

  const getStatusColor = () => {
    switch (project.healthStatus) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "at_risk":
        return "bg-yellow-100 text-yellow-800";
      case "delayed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const getPriorityColor = () => {
    switch (project.priority) {
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No due date";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div
      className={`bg-white rounded-xl border-l-4 ${getPriorityColor()} border-r border-t border-b border-gray-200 p-6 hover:shadow-lg transition-all duration-300 group`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3 flex-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: project.color }}
          ></div>
          <div className="flex-1 min-w-0">
            <Link
              to={`/projects/${project.id}`}
              className="block hover:text-blue-600 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 truncate">
                {project.name}
              </h3>
            </Link>
            <p className="text-sm text-gray-600 line-clamp-2 mt-1">
              {project.description}
            </p>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="w-5 h-5 text-gray-400" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[160px]">
              <Link
                to={`/projects/${project.id}`}
                className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setShowMenu(false)}
              >
                <Eye className="w-4 h-4" />
                <span>View Details</span>
              </Link>
              <button
                onClick={() => {
                  onEdit?.(project.id);
                  setShowMenu(false);
                }}
                className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Edit className="w-4 h-4" />
                <span>Edit Project</span>
              </button>
              <button
                onClick={() => {
                  onArchive?.(project.id);
                  setShowMenu(false);
                }}
                className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Archive className="w-4 h-4" />
                <span>Archive</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm text-gray-600">{project.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-300"
            style={{
              width: `${project.progress}%`,
              backgroundColor: project.color,
            }}
          ></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">
            {project.teamSize} members
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">
            {formatDate(project.dueDate)}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}
          >
            {project.healthStatus.replace("_", " ").toUpperCase()}
          </span>
        </div>
        <span className="text-sm text-gray-600">
          {project.tasksCompleted}/{project.totalTasks} tasks
        </span>
      </div>
    </div>
  );
};
