import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  MoreHorizontal,
  Users,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  AlertTriangle,
  Eye,
  Edit,
  Archive,
  Star,
  Share2,
} from "lucide-react";
import { useProjectsOverview } from "../../hooks/useDashboard";
import type { ProjectSummary } from "../../services/dashboardService";

const ProjectCard: React.FC<{ project: ProjectSummary }> = ({ project }) => {
  const [showMenu, setShowMenu] = useState(false);

  const getStatusIcon = () => {
    switch (project.healthStatus) {
      case "COMPLETED":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "AT_RISK":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case "DELAYED":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStatusColor = () => {
    switch (project.healthStatus) {
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "AT_RISK":
        return "bg-yellow-100 text-yellow-800";
      case "DELAYED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const getStatusText = () => {
    switch (project.healthStatus) {
      case "COMPLETED":
        return "Completed";
      case "AT_RISK":
        return "At Risk";
      case "DELAYED":
        return "Delayed";
      default:
        return "On Track";
    }
  };

  const getPriorityColor = () => {
    switch (project.priority) {
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No due date";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMenu) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showMenu]);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleMenuItemClick = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(false);
    action();
  };

  const handleStar = () => {
    console.log("Star project:", project.name);
    // TODO: Implement star functionality
  };

  const handleShare = () => {
    console.log("Share project:", project.name);
    // TODO: Implement share functionality
  };

  const handleArchive = () => {
    if (window.confirm(`Are you sure you want to archive "${project.name}"?`)) {
      console.log("Archive project:", project.name);
      // TODO: Implement archive functionality
    }
  };

  return (
    <div
      className={`bg-white rounded-xl border-l-4 ${getPriorityColor()} border-r border-t border-b border-gray-200 p-6 hover:shadow-md transition-shadow group relative`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3 flex-1">
          <div
            className={`w-3 h-3 rounded-full`}
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
            onClick={handleMenuClick}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="w-5 h-5 text-gray-400" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 min-w-[160px]">
              <Link
                to={`/projects/${project.id}`}
                className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setShowMenu(false)}
              >
                <Eye className="w-4 h-4" />
                <span>View Details</span>
              </Link>

              <Link
                to={`/projects/${project.id}/edit`}
                className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setShowMenu(false)}
              >
                <Edit className="w-4 h-4" />
                <span>Edit Project</span>
              </Link>

              <div className="border-t border-gray-100 my-1" />

              <button
                onClick={(e) => handleMenuItemClick(e, handleStar)}
                className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Star className="w-4 h-4" />
                <span>Add to Favorites</span>
              </button>

              <button
                onClick={(e) => handleMenuItemClick(e, handleShare)}
                className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Share2 className="w-4 h-4" />
                <span>Share Project</span>
              </button>

              <div className="border-t border-gray-100 my-1" />

              <button
                onClick={(e) => handleMenuItemClick(e, handleArchive)}
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
            {getStatusText()}
          </span>
        </div>
        <span className="text-sm text-gray-600">
          {project.completedTasks}/{project.totalTasks} tasks
        </span>
      </div>
    </div>
  );
};

const ProjectCardSkeleton: React.FC = () => (
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

export const ProjectOverview: React.FC = () => {
  const { data: projects, isLoading, error } = useProjectsOverview();

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Project Overview
            </h2>
          </div>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            <span>Failed to load projects</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Project Overview
          </h2>
        </div>
        <Link
          to="/projects"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer transition-colors"
        >
          View All
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <ProjectCardSkeleton key={index} />
          ))}
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-gray-500">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No projects yet</p>
            <p className="text-sm">Create your first project to get started</p>
          </div>
        </div>
      )}
    </div>
  );
};
