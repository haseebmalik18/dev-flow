import React from "react";
import {
  FolderOpen,
  CheckSquare,
  Clock,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useDashboardStats } from "../../hooks/useDashboard";

interface StatCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon,
  color,
  loading = false,
}) => {
  const getChangeIcon = () => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getChangeColor = () => {
    if (change > 0) return "text-green-600";
    if (change < 0) return "text-red-600";
    return "text-gray-500";
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
          <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mb-2">{value}</p>
          <div className="flex items-center space-x-1">
            {getChangeIcon()}
            <span className={`text-sm font-medium ${getChangeColor()}`}>
              {change > 0 ? "+" : ""}
              {change}%
            </span>
            <span className="text-sm text-gray-500">vs last month</span>
          </div>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
      </div>
    </div>
  );
};

export const DashboardStats: React.FC = () => {
  const { data: stats, isLoading, error } = useDashboardStats();

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center space-x-2 text-red-700">
          <AlertTriangle className="w-5 h-5" />
          <span>Failed to load dashboard statistics</span>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Active Projects",
      value: stats?.activeProjects ?? 0,
      change: stats?.activeProjectsChange ?? 0,
      icon: <FolderOpen className="w-6 h-6 text-blue-600" />,
      color: "bg-blue-100",
    },
    {
      title: "Tasks Completed",
      value: stats?.completedTasks ?? 0,
      change: stats?.completedTasksChange ?? 0,
      icon: <CheckSquare className="w-6 h-6 text-green-600" />,
      color: "bg-green-100",
    },
    {
      title: "Hours Tracked",
      value: stats?.hoursTracked ?? "0h",
      change: stats?.hoursTrackedChange ?? 0,
      icon: <Clock className="w-6 h-6 text-orange-600" />,
      color: "bg-orange-100",
    },
    {
      title: "Team Members",
      value: stats?.teamMembers ?? 0,
      change: stats?.teamMembersChange ?? 0,
      icon: <Users className="w-6 h-6 text-purple-600" />,
      color: "bg-purple-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => (
        <StatCard key={index} {...stat} loading={isLoading} />
      ))}
    </div>
  );
};
