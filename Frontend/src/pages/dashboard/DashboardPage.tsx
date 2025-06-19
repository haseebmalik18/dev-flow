import React from "react";
import { DashboardStats } from "../../components/dashboard/DashboardStats";
import { RecentActivity } from "../../components/dashboard/RecentActivity";
import { ProjectOverview } from "../../components/dashboard/ProjectOverview";
import { TasksOverview } from "../../components/dashboard/TasksOverview";
import { QuickActions } from "../../components/dashboard/QuickActions";
import { DashboardHeader } from "../../components/dashboard/DashboardHeader";
import { PendingInvitationsComponent } from "../../components/invitations/PendingInvitationsComponent";
import { useWebSocket } from "../../hooks/useWebsocket";
import { useRealtimeActivity } from "../../hooks/useRealtimeActivity";

export const DashboardPage: React.FC = () => {
  const { isConnected, connectionState } = useWebSocket();
  const { realtimeActivities, hasNewActivity, markAsRead } =
    useRealtimeActivity();

  const ConnectionStatus = () => {
    if (connectionState === "connecting") {
      return (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 text-yellow-800">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-800"></div>
            <span className="text-sm">Connecting to real-time updates...</span>
          </div>
        </div>
      );
    }

    if (connectionState === "disconnected") {
      return (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 text-red-800">
            <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm">
              Real-time updates disconnected. Data may not be current.
            </span>
          </div>
        </div>
      );
    }

    if (connectionState === "error") {
      return (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 text-red-800">
            <div className="w-4 h-4 bg-red-600 rounded-full"></div>
            <span className="text-sm">
              Connection error. Attempting to reconnect...
            </span>
          </div>
        </div>
      );
    }

    if (connectionState === "connected" && isConnected) {
      return (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-green-800">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">
                Real-time updates active
              </span>
            </div>
            {hasNewActivity && (
              <button
                onClick={markAsRead}
                className="px-3 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-800 rounded-full transition-colors"
              >
                Mark as read ({realtimeActivities.length})
              </button>
            )}
          </div>
        </div>
      );
    }

    return null;
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
