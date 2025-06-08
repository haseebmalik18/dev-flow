import React from "react";
import {
  MoreHorizontal,
  Users,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string;
  progress: number;
  status: "on-track" | "at-risk" | "delayed" | "completed";
  dueDate: string;
  teamSize: number;
  tasksCompleted: number;
  totalTasks: number;
  color: string;
}

const ProjectCard: React.FC<{ project: Project }> = ({ project }) => {
  const getStatusIcon = () => {
    switch (project.status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "at-risk":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case "delayed":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStatusColor = () => {
    switch (project.status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "at-risk":
        return "bg-yellow-100 text-yellow-800";
      case "delayed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const getStatusText = () => {
    switch (project.status) {
      case "completed":
        return "Completed";
      case "at-risk":
        return "At Risk";
      case "delayed":
        return "Delayed";
      default:
        return "On Track";
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${project.color}`}></div>
          <div>
            <h3 className="font-semibold text-gray-900">{project.name}</h3>
            <p className="text-sm text-gray-600">{project.description}</p>
          </div>
        </div>
        <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
          <MoreHorizontal className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm text-gray-600">{project.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${project.color.replace(
              "bg-",
              "bg-"
            )} transition-all duration-300`}
            style={{ width: `${project.progress}%` }}
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
          <span className="text-sm text-gray-600">{project.dueDate}</span>
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
          {project.tasksCompleted}/{project.totalTasks} tasks
        </span>
      </div>
    </div>
  );
};

export const ProjectOverview: React.FC = () => {
  const projects: Project[] = [
    {
      id: "1",
      name: "E-commerce Platform",
      description: "Modern React-based shopping platform",
      progress: 78,
      status: "on-track",
      dueDate: "Dec 15",
      teamSize: 8,
      tasksCompleted: 23,
      totalTasks: 30,
      color: "bg-blue-500",
    },
    {
      id: "2",
      name: "Mobile App Redesign",
      description: "UI/UX overhaul for mobile application",
      progress: 45,
      status: "at-risk",
      dueDate: "Jan 8",
      teamSize: 5,
      tasksCompleted: 12,
      totalTasks: 28,
      color: "bg-purple-500",
    },
    {
      id: "3",
      name: "API Gateway",
      description: "Microservices architecture implementation",
      progress: 92,
      status: "completed",
      dueDate: "Nov 30",
      teamSize: 6,
      tasksCompleted: 18,
      totalTasks: 18,
      color: "bg-green-500",
    },
    {
      id: "4",
      name: "Marketing Website",
      description: "New company website with CMS",
      progress: 25,
      status: "delayed",
      dueDate: "Dec 1",
      teamSize: 4,
      tasksCompleted: 5,
      totalTasks: 22,
      color: "bg-red-500",
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Project Overview
          </h2>
        </div>
        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          View All
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
};
