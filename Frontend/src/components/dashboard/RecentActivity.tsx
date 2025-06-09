import React from "react";
import {
  Activity,
  GitCommit,
  MessageCircle,
  FileText,
  UserPlus,
  CheckCircle,
  Upload,
  Clock,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useRecentActivity } from "../../hooks/useDashboard";
import type { ActivityItem } from "../../services/dashboardService";

const ActivityIcon: React.FC<{ type: string }> = ({ type }) => {
  const iconClass = "w-4 h-4 text-white";

  switch (type.toLowerCase()) {
    case "project_created":
    case "project_updated":
      return <FileText className={iconClass} />;
    case "task_created":
    case "task_completed":
    case "task_updated":
      return <CheckCircle className={iconClass} />;
    case "task_commented":
      return <MessageCircle className={iconClass} />;
    case "member_added":
    case "member_removed":
      return <UserPlus className={iconClass} />;
    case "file_uploaded":
      return <Upload className={iconClass} />;
    default:
      return <Activity className={iconClass} />;
  }
};

const getActivityColor = (type: string) => {
  switch (type.toLowerCase()) {
    case "project_created":
    case "project_updated":
      return "bg-blue-500";
    case "task_created":
    case "task_updated":
      return "bg-purple-500";
    case "task_completed":
      return "bg-green-500";
    case "task_commented":
      return "bg-green-500";
    case "member_added":
    case "member_removed":
      return "bg-indigo-500";
    case "file_uploaded":
      return "bg-orange-500";
    default:
      return "bg-gray-500";
  }
};

const ActivityItemComponent: React.FC<{ activity: ActivityItem }> = ({
  activity,
}) => {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
      <div className="flex-shrink-0">
        <div className="relative">
          {activity.user.avatar ? (
            <img
              src={activity.user.avatar}
              alt={activity.user.name}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
              {activity.user.initials}
            </div>
          )}
          <div
            className={`absolute -bottom-1 -right-1 w-5 h-5 ${getActivityColor(
              activity.type
            )} rounded-full flex items-center justify-center border-2 border-white`}
          >
            <ActivityIcon type={activity.type} />
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm">
          <p className="text-gray-900 leading-relaxed">
            {activity.description}
          </p>
          {activity.project && (
            <span className="text-blue-600 font-medium">
              {" "}
              in {activity.project}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1 mt-1">
          <Clock className="w-3 h-3 text-gray-400" />
          <span className="text-xs text-gray-500">
            {formatTime(activity.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
};

const ActivityItemSkeleton: React.FC = () => (
  <div className="flex items-start space-x-3 p-3 animate-pulse">
    <div className="relative">
      <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gray-200 rounded-full"></div>
    </div>
    <div className="flex-1">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-20"></div>
    </div>
  </div>
);

export const RecentActivity: React.FC = () => {
  const { data: activities, isLoading, error } = useRecentActivity();

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 h-fit">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Activity
            </h2>
          </div>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            <span>Failed to load activity</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 h-fit">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Activity
          </h2>
        </div>
        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          View All
        </button>
      </div>

      <div className="space-y-1 max-h-96 overflow-y-auto">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, index) => (
            <ActivityItemSkeleton key={index} />
          ))
        ) : activities && activities.length > 0 ? (
          activities.map((activity) => (
            <ActivityItemComponent key={activity.id} activity={activity} />
          ))
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No activity yet</p>
              <p className="text-sm">
                Start working on projects to see activity
              </p>
            </div>
          </div>
        )}
      </div>

      {activities && activities.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="text-center">
            <button className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              Load more activities
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
