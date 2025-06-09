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
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
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
  budget?: number;
  spent?: number;
  owner?: {
    name: string;
    avatar?: string;
    initials: string;
  };
}

interface ProjectListProps {
  projects: Project[];
  viewMode: "grid" | "list";
  onArchive?: (id: string) => void;
  onEdit?: (id: string) => void;
  onStar?: (id: string) => void;
  starredProjects?: string[];
  loading?: boolean;
}

export const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  viewMode,
  onArchive,
  onEdit,
  onStar,
  starredProjects = [],
  loading = false,
}) => {
  const getStatusIcon = (status: Project["healthStatus"]) => {
    switch (status) {
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

  const getStatusColor = (status: Project["healthStatus"]) => {
    switch (status) {
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

  const getPriorityColor = (priority: Project["priority"]) => {
    switch (priority) {
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

  const getProgressTrend = () => {
    // Mock trend calculation - TODO: compare with previous period
    const random = Math.random();
    if (random > 0.6)
      return { trend: "up", value: Math.floor(random * 15) + 1 };
    if (random < 0.3)
      return { trend: "down", value: Math.floor(random * 10) + 1 };
    return { trend: "stable", value: 0 };
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No due date";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const ProjectCard: React.FC<{ project: Project }> = ({ project }) => {
    const [showMenu, setShowMenu] = React.useState(false);
    const isStarred = starredProjects.includes(project.id);
    const trend = getProgressTrend();

    const getTrendIcon = () => {
      switch (trend.trend) {
        case "up":
          return <TrendingUp className="w-3 h-3 text-green-500" />;
        case "down":
          return <TrendingDown className="w-3 h-3 text-red-500" />;
        default:
          return <Minus className="w-3 h-3 text-gray-400" />;
      }
    };

    return (
      <div
        className={`bg-white rounded-xl border-l-4 ${getPriorityColor(
          project.priority
        )} border-r border-t border-b border-gray-200 p-6 hover:shadow-lg transition-all duration-300 group relative`}
      >
        <button
          onClick={() => onStar?.(project.id)}
          className={`absolute top-4 right-4 p-1 rounded transition-colors ${
            isStarred
              ? "text-yellow-500"
              : "text-gray-300 hover:text-yellow-500"
          }`}
        >
          <Star className={`w-4 h-4 ${isStarred ? "fill-current" : ""}`} />
        </button>

        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
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

          <div className="relative ml-3">
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
            <div className="flex items-center space-x-1">
              <span className="text-sm text-gray-600">{project.progress}%</span>
              {getTrendIcon()}
              {trend.value > 0 && (
                <span
                  className={`text-xs ${
                    trend.trend === "up" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {trend.value}%
                </span>
              )}
            </div>
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

        {project.budget && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Budget</span>
              <span className="text-sm text-gray-900">
                {formatCurrency(project.spent || 0)} /{" "}
                {formatCurrency(project.budget)}
              </span>
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full"
                style={{
                  width: `${Math.min(
                    ((project.spent || 0) / project.budget) * 100,
                    100
                  )}%`,
                }}
              ></div>
            </div>
          </div>
        )}

        {project.owner && (
          <div className="mb-4 flex items-center space-x-2">
            <span className="text-sm text-gray-600">Owner:</span>
            <div className="flex items-center space-x-2">
              {project.owner.avatar ? (
                <img
                  src={project.owner.avatar}
                  alt={project.owner.name}
                  className="w-5 h-5 rounded-full"
                />
              ) : (
                <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                  {project.owner.initials}
                </div>
              )}
              <span className="text-sm text-gray-700">
                {project.owner.name}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon(project.healthStatus)}
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                project.healthStatus
              )}`}
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

  const ProjectListItem: React.FC<{ project: Project }> = ({ project }) => {
    const [showMenu, setShowMenu] = React.useState(false);
    const isStarred = starredProjects.includes(project.id);

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: project.color }}
            ></div>
            <button
              onClick={() => onStar?.(project.id)}
              className={`p-1 rounded transition-colors ${
                isStarred
                  ? "text-yellow-500"
                  : "text-gray-300 hover:text-yellow-500"
              }`}
            >
              <Star className={`w-4 h-4 ${isStarred ? "fill-current" : ""}`} />
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3">
              <Link
                to={`/projects/${project.id}`}
                className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
              >
                {project.name}
              </Link>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                  project.healthStatus
                )}`}
              >
                {project.healthStatus.replace("_", " ").toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-gray-600 truncate mt-1">
              {project.description}
            </p>
          </div>

          <div className="hidden md:flex items-center space-x-3">
            <div className="w-24">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600">
                  {project.progress}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full"
                  style={{
                    width: `${project.progress}%`,
                    backgroundColor: project.color,
                  }}
                ></div>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center space-x-6 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>{project.teamSize}</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="w-4 h-4" />
              <span>
                {project.tasksCompleted}/{project.totalTasks}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(project.dueDate)}</span>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
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
      </div>
    );
  };

  const ProjectSkeleton: React.FC = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3 flex-1">
          <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
          <div className="flex-1">
            <div className="h-5 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-48"></div>
          </div>
        </div>
        <div className="w-5 h-5 bg-gray-200 rounded"></div>
      </div>
      <div className="mb-4">
        <div className="flex justify-between mb-2">
          <div className="h-4 bg-gray-200 rounded w-16"></div>
          <div className="h-4 bg-gray-200 rounded w-8"></div>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full"></div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="h-4 bg-gray-200 rounded w-20"></div>
        <div className="h-4 bg-gray-200 rounded w-16"></div>
      </div>
      <div className="flex justify-between">
        <div className="h-6 bg-gray-200 rounded w-20"></div>
        <div className="h-4 bg-gray-200 rounded w-16"></div>
      </div>
    </div>
  );

  const ProjectListItemSkeleton: React.FC = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
        </div>
        <div className="flex-1">
          <div className="h-5 bg-gray-200 rounded w-40 mb-1"></div>
          <div className="h-4 bg-gray-200 rounded w-64"></div>
        </div>
        <div className="w-24 h-4 bg-gray-200 rounded"></div>
        <div className="hidden lg:flex space-x-6">
          <div className="w-8 h-4 bg-gray-200 rounded"></div>
          <div className="w-12 h-4 bg-gray-200 rounded"></div>
          <div className="w-16 h-4 bg-gray-200 rounded"></div>
        </div>
        <div className="w-5 h-5 bg-gray-200 rounded"></div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div
        className={
          viewMode === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            : "space-y-4"
        }
      >
        {Array.from({ length: 6 }).map((_, index) =>
          viewMode === "grid" ? (
            <ProjectSkeleton key={index} />
          ) : (
            <ProjectListItemSkeleton key={index} />
          )
        )}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">No projects found</p>
          <p className="text-sm">
            Try adjusting your filters or create a new project to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        viewMode === "grid"
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          : "space-y-4"
      }
    >
      {projects.map((project) =>
        viewMode === "grid" ? (
          <ProjectCard key={project.id} project={project} />
        ) : (
          <ProjectListItem key={project.id} project={project} />
        )
      )}
    </div>
  );
};
