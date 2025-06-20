import { useState, useEffect, useCallback } from "react";
import {
  websocketService,
  type ActivityUpdate,
} from "../services/webSocketService";
import type { ActivityItem } from "../services/dashboardService";

export const useRealtimeActivity = () => {
  const [realtimeActivities, setRealtimeActivities] = useState<ActivityItem[]>(
    []
  );
  const [hasNewActivity, setHasNewActivity] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Convert WebSocket ActivityUpdate to dashboard ActivityItem format
  const convertActivity = useCallback(
    (activity: ActivityUpdate): ActivityItem => {
      return {
        id: activity.id,
        type: activity.type.toLowerCase(),
        description: activity.description,
        createdAt: activity.createdAt,
        user: {
          name: activity.user.name,
          initials: activity.user.initials,
          avatar: activity.user.avatar,
        },
        project: activity.project,
        task: activity.task,
      };
    },
    []
  );

  // Handle new activities from WebSocket
  const handleNewActivity = useCallback(
    (activity: ActivityUpdate) => {
      console.log("🔥 Processing new real-time activity:", activity);

      const convertedActivity = convertActivity(activity);

      setRealtimeActivities((prev) => {
        // Check if activity already exists to prevent duplicates
        const exists = prev.some(
          (existing) => existing.id === convertedActivity.id
        );
        if (exists) {
          console.log(
            "⚠️ Activity already exists, skipping:",
            convertedActivity.id
          );
          return prev;
        }

        // Add new activity to the beginning of the list
        const updated = [convertedActivity, ...prev];

        // Keep only the latest 50 activities to prevent memory issues
        const trimmed = updated.slice(0, 50);

        console.log(
          `✅ Added new activity. Total real-time activities: ${trimmed.length}`
        );
        return trimmed;
      });

      // Mark as having new activity
      setHasNewActivity(true);

      // Auto-clear new activity indicator after 30 seconds
      setTimeout(() => {
        setHasNewActivity(false);
      }, 30000);
    },
    [convertActivity]
  );

  // Handle connection status changes
  const handleConnectionStatus = useCallback((isConnected: boolean) => {
    console.log("🔗 Real-time connection status changed:", isConnected);
    setIsConnected(isConnected);

    // Clear activities if disconnected for too long
    if (!isConnected) {
      setTimeout(() => {
        if (!websocketService.isConnected()) {
          console.log(
            "🧹 Clearing real-time activities due to prolonged disconnection"
          );
          setRealtimeActivities([]);
          setHasNewActivity(false);
        }
      }, 60000); // Clear after 1 minute of disconnection
    }
  }, []);

  // Mark activities as read
  const markAsRead = useCallback(() => {
    console.log("✅ Marking real-time activities as read");
    setHasNewActivity(false);

    // Update last seen timestamp
    localStorage.setItem("lastActivitySeen", new Date().toISOString());
  }, []);

  // Clear all real-time activities (for development/testing)
  const clearActivities = useCallback(() => {
    console.log("🧹 Clearing all real-time activities");
    setRealtimeActivities([]);
    setHasNewActivity(false);
  }, []);

  // Force refresh activities (reconnect)
  const refreshActivities = useCallback(() => {
    console.log("🔄 Forcing refresh of real-time activities");
    websocketService.forceReconnect();
  }, []);

  // Setup WebSocket listeners
  useEffect(() => {
    console.log("🔧 Setting up real-time activity listeners");

    // Subscribe to activity updates
    const unsubscribeActivity =
      websocketService.onActivityUpdate(handleNewActivity);

    // Subscribe to connection status
    const unsubscribeConnection = websocketService.onConnectionStatusChange(
      (state) => {
        handleConnectionStatus(state === "connected");
      }
    );

    // Cleanup function
    return () => {
      console.log("🧹 Cleaning up real-time activity listeners");
      unsubscribeActivity();
      unsubscribeConnection();
    };
  }, [handleNewActivity, handleConnectionStatus]);

  // Auto-connect on mount if authenticated
  useEffect(() => {
    // Small delay to ensure auth state is ready
    const timer = setTimeout(() => {
      if (websocketService.getConnectionState() === "disconnected") {
        console.log("🔄 Auto-connecting WebSocket for real-time activities");
        websocketService.connect();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return {
    realtimeActivities,
    hasNewActivity,
    isConnected,
    markAsRead,
    clearActivities,
    refreshActivities,

    // Additional utility functions
    activityCount: realtimeActivities.length,
    lastActivityTime: realtimeActivities[0]?.createdAt || null,

    // Development helpers
    ...(process.env.NODE_ENV === "development" && {
      debugInfo: () => ({
        realtimeActivities: realtimeActivities.length,
        hasNewActivity,
        isConnected,
        lastActivityTime: realtimeActivities[0]?.createdAt || null,
        wsDebugInfo: websocketService.getDebugInfo(),
      }),
      simulateActivity:
        websocketService.simulateActivity.bind(websocketService),
    }),
  };
};
