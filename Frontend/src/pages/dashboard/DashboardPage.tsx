import React from "react";
import { DashboardStats } from "../../components/dashboard/DashboardStats";
import { RecentActivity } from "../../components/dashboard/RecentActivity";
import { ProjectOverview } from "../../components/dashboard/ProjectOverview";
import { TasksOverview } from "../../components/dashboard/TasksOverview";
import { QuickActions } from "../../components/dashboard/QuickActions";
import { DashboardHeader } from "../../components/dashboard/DashboardHeader";
import { PendingInvitationsComponent } from "../../components/invitations/PendingInvitationsComponent";
import { useWebSocket } from "../../hooks/useWebSocket";
import { useRealtimeActivity } from "../../hooks/useRealTimeActivity";
import {
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
} from "lucide-react";

export const DashboardPage: React.FC = () => {
  const { isConnected, connectionState, forceReconnect } = useWebSocket();
  const { realtimeActivities, hasNewActivity, markAsRead } =
    useRealtimeActivity();

  const ConnectionStatus = () => {
    const getStatusConfig = () => {
      switch (connectionState) {
        case "connecting":
          return {
            icon: <RefreshCw className="w-4 h-4 animate-spin" />,
            bgColor: "bg-yellow-50",
            borderColor: "border-yellow-200",
            textColor: "text-yellow-800",
            message: "Connecting to real-time updates...",
            showReconnect: false,
          };
        case "connected":
          return {
            icon: <CheckCircle className="w-4 h-4" />,
            bgColor: "bg-green-50",
            borderColor: "border-green-200",
            textColor: "text-green-800",
            message: "Real-time updates active",
            showReconnect: false,
          };
        case "error":
          return {
            icon: <AlertTriangle className="w-4 h-4" />,
            bgColor: "bg-red-50",
            borderColor: "border-red-200",
            textColor: "text-red-800",
            message: "Connection error. Click to retry.",
            showReconnect: true,
          };
        case "disconnected":
        default:
          return {
            icon: <WifiOff className="w-4 h-4" />,
            bgColor: "bg-gray-50",
            borderColor: "border-gray-200",
            textColor: "text-gray-800",
            message: "Real-time updates disconnected. Click to reconnect.",
            showReconnect: true,
          };
      }
    };

    const config = getStatusConfig();

    if (connectionState === "connected" && !hasNewActivity) {
      return null;
    }

    return (
      <div
        className={`mb-4 ${config.bgColor} border ${config.borderColor} rounded-lg p-3`}
      >
        <div className="flex items-center justify-between">
          <div className={`flex items-center space-x-2 ${config.textColor}`}>
            {config.icon}
            <span className="text-sm font-medium">{config.message}</span>
            {connectionState === "connected" && hasNewActivity && (
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                {realtimeActivities.length} new
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {hasNewActivity && (
              <button
                onClick={markAsRead}
                className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-full transition-colors"
              >
                Mark as read
              </button>
            )}

            {config.showReconnect && (
              <button
                onClick={forceReconnect}
                className={`px-3 py-1 text-xs ${config.bgColor} hover:opacity-80 ${config.textColor} border ${config.borderColor} rounded-full transition-colors flex items-center space-x-1`}
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reconnect</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <ConnectionStatus />

        <div className="space-y-8">
          <DashboardStats />

          <QuickActions />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <ProjectOverview />
              <TasksOverview />
            </div>

            <div className="lg:col-span-1">
              <div className="space-y-6">
                <PendingInvitationsComponent />

                <RecentActivity />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
