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
  const [isConnected, setIsConnected] = useState(false);

  const convertActivity = useCallback((activity: any): ActivityItem => {
    const isNewFormat = activity.activityId || activity.displayMessage;

    if (isNewFormat) {
      return {
        id: activity.activityId || activity.id,
        type: (activity.type || "UNKNOWN").toLowerCase(),
        description: activity.displayMessage || activity.description,
        createdAt: activity.timestamp || activity.createdAt,
        user: {
          name:
            activity.user?.fullName || activity.user?.name || "Unknown User",
          initials: activity.user?.initials || "??",
          avatar: activity.user?.avatar || null,
        },
        project: activity.project?.name || activity.project,
        task: activity.task?.title || activity.task,
      };
    } else {
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
    }
  }, []);

  const handleNewActivity = useCallback(
    (activity: any) => {
      try {
        const convertedActivity = convertActivity(activity);

        setRealtimeActivities((prev) => {
          const exists = prev.some(
            (existing) => existing.id === convertedActivity.id
          );
          if (exists) {
            return prev;
          }

          const updated = [convertedActivity, ...prev];
          const trimmed = updated.slice(0, 50);
          return trimmed;
        });
      } catch (error) {
        console.error("Failed to process activity:", error, activity);
      }
    },
    [convertActivity]
  );

  const handleConnectionStatus = useCallback((isConnected: boolean) => {
    setIsConnected(isConnected);

    if (!isConnected) {
      setTimeout(() => {
        if (!websocketService.isConnected()) {
          setRealtimeActivities([]);
        }
      }, 60000);
    }
  }, []);

  const clearActivities = useCallback(() => {
    setRealtimeActivities([]);
  }, []);

  const refreshActivities = useCallback(() => {
    websocketService.forceReconnect();
  }, []);

  useEffect(() => {
    const unsubscribeActivity = websocketService.onActivityUpdate(
      (activity) => {
        try {
          handleNewActivity(activity);
        } catch (error) {
          console.error("Error handling WebSocket activity:", error);
        }
      }
    );

    const unsubscribeConnection = websocketService.onConnectionStatusChange(
      (state) => {
        handleConnectionStatus(state === "connected");
      }
    );

    return () => {
      unsubscribeActivity();
      unsubscribeConnection();
    };
  }, [handleNewActivity, handleConnectionStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (websocketService.getConnectionState() === "disconnected") {
        websocketService.connect();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return {
    realtimeActivities,
    isConnected,
    clearActivities,
    refreshActivities,
    activityCount: realtimeActivities.length,
    lastActivityTime: realtimeActivities[0]?.createdAt || null,

    ...(process.env.NODE_ENV === "development" && {
      debugInfo: () => ({
        realtimeActivities: realtimeActivities.length,
        isConnected,
        lastActivityTime: realtimeActivities[0]?.createdAt || null,
        wsDebugInfo: websocketService.getDebugInfo?.(),
        latestActivities: realtimeActivities.slice(0, 3),
      }),
      testConversion: (activity: any) => {
        try {
          const result = convertActivity(activity);
          return result;
        } catch (error) {
          console.error("Conversion failed:", error);
          return null;
        }
      },
    }),
  };
};
