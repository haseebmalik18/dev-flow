import React from "react";
import {
  FolderOpen,
  CheckSquare,
  Clock,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon,
  color,
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
  const stats = [
    {
      title: "Active Projects",
      value: 12,
      change: 8.2,
      icon: <FolderOpen className="w-6 h-6 text-blue-600" />,
      color: "bg-blue-100",
    },
    {
      title: "Tasks Completed",
      value: 89,
      change: 12.5,
      icon: <CheckSquare className="w-6 h-6 text-green-600" />,
      color: "bg-green-100",
    },
    {
      title: "Hours Tracked",
      value: "247h",
      change: -2.3,
      icon: <Clock className="w-6 h-6 text-orange-600" />,
      color: "bg-orange-100",
    },
    {
      title: "Team Members",
      value: 24,
      change: 0,
      icon: <Users className="w-6 h-6 text-purple-600" />,
      color: "bg-purple-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
};
