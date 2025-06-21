import React, { useState, useEffect, useMemo } from "react";
import {
  Activity,
  CheckCircle,
  Clock,
  User,
  MessageCircle,
  FileText,
  Users,
  AlertTriangle,
  Calendar,
  Target,
  Wifi,
  WifiOff,
  RefreshCw,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Hash,
  Tag,
} from "lucide-react";
import { useProjectRealtimeActivity } from "../../hooks/useProjectRealtimeActivity";
import type { ActivityItem } from "../../services/dashboardService";
import { Button } from "../ui/Button";
import { Link } from "react-router-dom";

interface ProjectActivityFeedProps {
  projectId: number;
  projectName: string;
  showHeader?: boolean;
  maxHeight?: string;
  limit?: number;
  autoRefresh?: boolean;
  enableFiltering?: boolean;
  showConnectionStatus?: boolean;
}

interface ActivityFilter {
  type: string[];
  user: string[];
  timeRange: "1h" | "24h" | "7d" | "30d" | "all";
  search: string;
}

export const ProjectActivityFeed: React.FC<ProjectActivityFeedProps> = ({
  projectId,
  projectName,
  showHeader = true,
  maxHeight = "600px",
  limit = 50,
  autoRefresh = true,
  enableFiltering = true,
  showConnectionStatus = true,
}) => {
  const {
    projectActivities,
    isConnected,
    isLoading,
    clearActivities,
    refreshActivities,
    activityCount,
    lastActivityTime,
  } = useProjectRealtimeActivity(projectId);

  const [showFilters, setShowFilters] = useState(false);
  const [filter, setFilter] = useState<ActivityFilter>({
    type: [],
    user: [],
    timeRange: "24h",
    search: "",
  });
  const [expandedActivities, setExpandedActivities] = useState<Set<number>>(
    new Set()
  );

  useEffect(() => {
    if (autoRefresh && !isConnected) {
      const interval = setInterval(() => {
        if (!isConnected) {
          refreshActivities();
        }
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, isConnected, refreshActivities]);

  const filteredActivities = useMemo(() => {
    let filtered = [...projectActivities];

    if (filter.type.length > 0) {
      filtered = filtered.filter((activity) =>
        filter.type.some((type) =>
          activity.type.toLowerCase().includes(type.toLowerCase())
        )
      );
    }

    if (filter.user.length > 0) {
      filtered = filtered.filter((activity) =>
        filter.user.includes(activity.user.name.toLowerCase())
      );
    }

    if (filter.timeRange !== "all") {
      const now = new Date();
      const timeRanges = {
        "1h": 1 * 60 * 60 * 1000,
        "24h": 24 * 60 * 60 * 1000,
        "7d": 7 * 24 * 60 * 60 * 1000,
        "30d": 30 * 24 * 60 * 60 * 1000,
      };

      const cutoff = new Date(now.getTime() - timeRanges[filter.timeRange]);
      filtered = filtered.filter(
        (activity) => new Date(activity.createdAt) >= cutoff
      );
    }

    if (filter.search.trim()) {
      const searchTerm = filter.search.toLowerCase();
      filtered = filtered.filter(
        (activity) =>
          activity.description.toLowerCase().includes(searchTerm) ||
          activity.user.name.toLowerCase().includes(searchTerm) ||
          (activity.task && activity.task.toLowerCase().includes(searchTerm))
      );
    }

    return filtered.slice(0, limit);
  }, [projectActivities, filter, limit]);

  const availableTypes = useMemo(() => {
    const types = new Set(projectActivities.map((activity) => activity.type));
    return Array.from(types).sort();
  }, [projectActivities]);

  const availableUsers = useMemo(() => {
    const users = new Set(
      projectActivities.map((activity) => activity.user.name)
    );
    return Array.from(users).sort();
  }, [projectActivities]);

  const getActivityIcon = (type: string) => {
    const lowerType = type.toLowerCase();

    if (lowerType.includes("task")) {
      if (lowerType.includes("completed"))
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      if (lowerType.includes("assigned"))
        return <User className="w-4 h-4 text-blue-600" />;
      return <Hash className="w-4 h-4 text-purple-600" />;
    }
    if (lowerType.includes("comment"))
      return <MessageCircle className="w-4 h-4 text-indigo-600" />;
    if (lowerType.includes("file"))
      return <FileText className="w-4 h-4 text-orange-600" />;
    if (lowerType.includes("member"))
      return <Users className="w-4 h-4 text-teal-600" />;
    if (lowerType.includes("project"))
      return <Target className="w-4 h-4 text-blue-600" />;
    if (lowerType.includes("deadline"))
      return <AlertTriangle className="w-4 h-4 text-red-600" />;

    return <Activity className="w-4 h-4 text-gray-600" />;
  };

  const getActivityColor = (type: string) => {
    const lowerType = type.toLowerCase();

    if (lowerType.includes("completed")) return "bg-green-50 border-green-200";
    if (lowerType.includes("created")) return "bg-blue-50 border-blue-200";
    if (lowerType.includes("assigned")) return "bg-purple-50 border-purple-200";
    if (lowerType.includes("comment")) return "bg-indigo-50 border-indigo-200";
    if (lowerType.includes("file")) return "bg-orange-50 border-orange-200";
    if (lowerType.includes("member")) return "bg-teal-50 border-teal-200";
    if (lowerType.includes("deadline") || lowerType.includes("overdue"))
      return "bg-red-50 border-red-200";

    return "bg-gray-50 border-gray-200";
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return date.toLocaleDateString();
  };

  const toggleActivityExpansion = (activityId: number) => {
    setExpandedActivities((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(activityId)) {
        newSet.delete(activityId);
      } else {
        newSet.add(activityId);
      }
      return newSet;
    });
  };

  const resetFilters = () => {
    setFilter({
      type: [],
      user: [],
      timeRange: "24h",
      search: "",
    });
  };

  const hasActiveFilters =
    filter.type.length > 0 ||
    filter.user.length > 0 ||
    filter.timeRange !== "24h" ||
    filter.search.trim();

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {showHeader && (
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Activity className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-semibold text-gray-900">
                  Project Activity
                </h3>
                <p className="text-sm text-gray-600">
                  Real-time updates for {projectName}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {showConnectionStatus && (
                <div className="flex items-center space-x-2">
                  {isConnected ? (
                    <div className="flex items-center space-x-1 text-green-600">
                      <Wifi className="w-4 h-4" />
                      <span className="text-sm font-medium">Live</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 text-red-600">
                      <WifiOff className="w-4 h-4" />
                      <span className="text-sm font-medium">Offline</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshActivities}
                  icon={<RefreshCw className="w-4 h-4" />}
                  disabled={isLoading}
                >
                  {isLoading ? "Loading..." : "Refresh"}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearActivities}
                  className="text-red-600 border-red-600 hover:bg-red-50"
                >
                  Clear
                </Button>

                {enableFiltering && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    icon={<Filter className="w-4 h-4" />}
                  >
                    Filter
                    {hasActiveFilters && (
                      <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">
                        {filter.type.length +
                          filter.user.length +
                          (filter.search ? 1 : 0)}
                      </span>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search activities..."
                      value={filter.search}
                      onChange={(e) =>
                        setFilter((prev) => ({
                          ...prev,
                          search: e.target.value,
                        }))
                      }
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time Range
                  </label>
                  <select
                    value={filter.timeRange}
                    onChange={(e) =>
                      setFilter((prev) => ({
                        ...prev,
                        timeRange: e.target
                          .value as ActivityFilter["timeRange"],
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="1h">Last hour</option>
                    <option value="24h">Last 24 hours</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="all">All time</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Activity Type
                  </label>
                  <select
                    multiple
                    value={filter.type}
                    onChange={(e) => {
                      const values = Array.from(
                        e.target.selectedOptions,
                        (option) => option.value
                      );
                      setFilter((prev) => ({ ...prev, type: values }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    size={3}
                  >
                    {availableTypes.map((type) => (
                      <option key={type} value={type}>
                        {type
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    User
                  </label>
                  <select
                    multiple
                    value={filter.user}
                    onChange={(e) => {
                      const values = Array.from(
                        e.target.selectedOptions,
                        (option) => option.value
                      );
                      setFilter((prev) => ({ ...prev, user: values }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    size={3}
                  >
                    {availableUsers.map((user) => (
                      <option key={user} value={user.toLowerCase()}>
                        {user}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {filteredActivities.length} of{" "}
                  {projectActivities.length} activities
                </div>

                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="overflow-y-auto" style={{ maxHeight }}>
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Loading activities...
            </h3>
            <p className="text-gray-600">
              Fetching the latest project activity
            </p>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="p-8 text-center">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {projectActivities.length === 0
                ? "No activity yet"
                : "No matching activities"}
            </h3>
            <p className="text-gray-600">
              {projectActivities.length === 0
                ? "Activity will appear here as your team works on the project"
                : "Try adjusting your filters to see more activities"}
            </p>
            {!isConnected && (
              <Button
                className="mt-4"
                onClick={refreshActivities}
                icon={<RefreshCw className="w-4 h-4" />}
              >
                Reconnect
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredActivities.map((activity) => {
              const isExpanded = expandedActivities.has(activity.id);
              const hasDetails =
                activity.task || activity.description.length > 100;

              return (
                <div
                  key={activity.id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${getActivityColor(
                    activity.type
                  )} border-l-4`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getActivityIcon(activity.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <div className="flex items-center space-x-2">
                              {activity.user.avatar ? (
                                <img
                                  src={activity.user.avatar}
                                  alt={activity.user.name}
                                  className="w-6 h-6 rounded-full"
                                />
                              ) : (
                                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                  {activity.user.initials}
                                </div>
                              )}
                              <span className="font-medium text-gray-900">
                                {activity.user.name}
                              </span>
                            </div>
                            <span className="text-gray-400">•</span>
                            <time className="text-sm text-gray-600">
                              {formatTimeAgo(activity.createdAt)}
                            </time>
                          </div>

                          <p className="text-gray-900 text-sm">
                            {isExpanded || activity.description.length <= 100
                              ? activity.description
                              : `${activity.description.substring(0, 100)}...`}
                          </p>

                          {activity.task && (
                            <div className="mt-2 flex items-center space-x-1 text-sm text-blue-600">
                              <Tag className="w-3 h-3" />
                              <span>Task: {activity.task}</span>
                              <ExternalLink className="w-3 h-3" />
                            </div>
                          )}
                        </div>

                        {hasDetails && (
                          <button
                            onClick={() => toggleActivityExpansion(activity.id)}
                            className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {filteredActivities.length > 0 && (
        <div className="border-t border-gray-200 p-3 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              {activityCount} total activities
              {lastActivityTime && (
                <span className="ml-2">
                  • Last update {formatTimeAgo(lastActivityTime)}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {isConnected ? (
                <span className="text-green-600 font-medium">
                  Live updates enabled
                </span>
              ) : (
                <span className="text-red-600 font-medium">
                  Reconnecting...
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
