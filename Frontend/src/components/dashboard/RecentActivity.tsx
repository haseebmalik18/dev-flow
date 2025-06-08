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
} from "lucide-react";

interface ActivityItem {
  id: string;
  type: "commit" | "comment" | "task" | "file" | "user" | "project";
  user: {
    name: string;
    avatar?: string;
    initials: string;
  };
  action: string;
  target: string;
  time: string;
  project?: string;
}

const ActivityIcon: React.FC<{ type: string }> = ({ type }) => {
  const iconClass = "w-4 h-4 text-white";

  switch (type) {
    case "commit":
      return <GitCommit className={iconClass} />;
    case "comment":
      return <MessageCircle className={iconClass} />;
    case "task":
      return <CheckCircle className={iconClass} />;
    case "file":
      return <Upload className={iconClass} />;
    case "user":
      return <UserPlus className={iconClass} />;
    case "project":
      return <FileText className={iconClass} />;
    default:
      return <Activity className={iconClass} />;
  }
};

const getActivityColor = (type: string) => {
  switch (type) {
    case "commit":
      return "bg-blue-500";
    case "comment":
      return "bg-green-500";
    case "task":
      return "bg-purple-500";
    case "file":
      return "bg-orange-500";
    case "user":
      return "bg-indigo-500";
    case "project":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
};

const ActivityItemComponent: React.FC<{ activity: ActivityItem }> = ({
  activity,
}) => {
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
          <span className="font-medium text-gray-900">
            {activity.user.name}
          </span>
          <span className="text-gray-600"> {activity.action} </span>
          <span className="font-medium text-gray-900">{activity.target}</span>
          {activity.project && (
            <>
              <span className="text-gray-600"> in </span>
              <span className="font-medium text-blue-600">
                {activity.project}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center space-x-1 mt-1">
          <Clock className="w-3 h-3 text-gray-400" />
          <span className="text-xs text-gray-500">{activity.time}</span>
        </div>
      </div>
    </div>
  );
};

export const RecentActivity: React.FC = () => {
  const activities: ActivityItem[] = [
    {
      id: "1",
      type: "task",
      user: {
        name: "Sarah Chen",
        initials: "SC",
      },
      action: "completed task",
      target: "User Registration Form",
      time: "2 minutes ago",
      project: "E-commerce Platform",
    },
    {
      id: "2",
      type: "commit",
      user: {
        name: "Alex Johnson",
        initials: "AJ",
      },
      action: "pushed 3 commits to",
      target: "main branch",
      time: "15 minutes ago",
      project: "Mobile App Redesign",
    },
    {
      id: "3",
      type: "comment",
      user: {
        name: "Mike Rodriguez",
        initials: "MR",
      },
      action: "commented on",
      target: "Payment Integration",
      time: "1 hour ago",
      project: "E-commerce Platform",
    },
    {
      id: "4",
      type: "file",
      user: {
        name: "Emma Wilson",
        initials: "EW",
      },
      action: "uploaded file",
      target: "API_Documentation.pdf",
      time: "2 hours ago",
      project: "API Gateway",
    },
    {
      id: "5",
      type: "user",
      user: {
        name: "David Park",
        initials: "DP",
      },
      action: "invited",
      target: "John Doe",
      time: "3 hours ago",
      project: "Marketing Website",
    },
    {
      id: "6",
      type: "project",
      user: {
        name: "Lisa Thompson",
        initials: "LT",
      },
      action: "created project",
      target: "Customer Support Portal",
      time: "5 hours ago",
    },
    {
      id: "7",
      type: "task",
      user: {
        name: "Ryan Foster",
        initials: "RF",
      },
      action: "moved task",
      target: "Database Optimization",
      time: "6 hours ago",
      project: "E-commerce Platform",
    },
    {
      id: "8",
      type: "comment",
      user: {
        name: "Jessica Adams",
        initials: "JA",
      },
      action: "mentioned you in",
      target: "UI Review Discussion",
      time: "8 hours ago",
      project: "Mobile App Redesign",
    },
  ];

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
        {activities.map((activity) => (
          <ActivityItemComponent key={activity.id} activity={activity} />
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <button className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Load more activities
          </button>
        </div>
      </div>
    </div>
  );
};
