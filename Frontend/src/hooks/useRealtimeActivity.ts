import { useState, useEffect, useCallback } from "react";
import {
  websocketService,
  type ActivityUpdate,
} from "../services/webSocketService";
import type { ActivityItem } from "../services/dashboardService";

interface UseRealtimeActivityOptions {
  projectId?: number | null;
  enableGlobal?: boolean;
  enableProject?: boolean;
  maxActivities?: number;
  autoConnect?: boolean;
}

export const useRealtimeActivity = (
  options: UseRealtimeActivityOptions = {}
) => {
  const {
    projectId = null,
    enableGlobal = true,
    enableProject = !!projectId,
    maxActivities = 50,
    autoConnect = true,
  } = options;

  const [globalActivities, setGlobalActivities] = useState<ActivityItem[]>([]);
  const [projectActivities, setProjectActivities] = useState<ActivityItem[]>(
    []
  );
  const [isConnected, setIsConnected] = useState(false);
  const [hasNewActivity, setHasNewActivity] = useState(false);

  const convertActivity = useCallback(
    (activity: ActivityUpdate): ActivityItem => {
      const isNewFormat = activity.activityId || activity.displayMessage;

      if (isNewFormat) {
        return {
          id: activity.activityId || activity.id || Math.random(),
          type: (activity.type || "UNKNOWN").toLowerCase(),
          description:
            activity.displayMessage ||
            activity.description ||
            "Activity occurred",
          createdAt:
            activity.timestamp ||
            activity.createdAt ||
            new Date().toISOString(),
          user: {
            name:
              activity.user?.fullName || activity.user?.name || "Unknown User",
            initials: activity.user?.initials || "??",
            avatar: activity.user?.avatar || null,
          },
          project:
            typeof activity.project === "object"
              ? activity.project?.name
              : activity.project || "Unknown Project",
          task:
            typeof activity.task === "object"
              ? activity.task?.title
              : activity.task,
        };
      } else {
        return {
          id: activity.id || Math.random(),
          type: activity.type.toLowerCase(),
          description: activity.description || "Activity occurred",
          createdAt: activity.createdAt || new Date().toISOString(),
          user: {
            name:
              activity.user?.name || activity.user?.fullName || "Unknown User",
            initials: activity.user?.initials || "??",
            avatar: activity.user?.avatar || null,
          },
          project:
            typeof activity.project === "object"
              ? activity.project?.name
              : activity.project || "Unknown Project",
          task:
            typeof activity.task === "object"
              ? activity.task?.title
              : activity.task,
        };
      }
    },
    []
  );

  const handleNewGlobalActivity = useCallback(
    (activity: ActivityUpdate) => {
      try {
        const convertedActivity = convertActivity(activity);

        setGlobalActivities((prev) => {
          const exists = prev.some(
            (existing) => existing.id === convertedActivity.id
          );
          if (exists) {
            return prev;
          }

          const updated = [convertedActivity, ...prev];
          const trimmed = updated.slice(0, maxActivities);
          return trimmed;
        });

        setHasNewActivity(true);
      } catch (error) {
        // Silent error handling
      }
    },
    [convertActivity, maxActivities]
  );

  const handleNewProjectActivity = useCallback(
    (activity: ActivityUpdate) => {
      try {
        const convertedActivity = convertActivity(activity);

        setProjectActivities((prev) => {
          const exists = prev.some(
            (existing) => existing.id === convertedActivity.id
          );
          if (exists) {
            return prev;
          }

          const updated = [convertedActivity, ...prev];
          const trimmed = updated.slice(0, maxActivities);
          return trimmed;
        });

        setHasNewActivity(true);
      } catch (error) {
        // Silent error handling
      }
    },
    [convertActivity, maxActivities]
  );

  const handleConnectionStatus = useCallback(
    (isConnected: boolean) => {
      setIsConnected(isConnected);

      if (!isConnected) {
        setTimeout(() => {
          if (!websocketService.isConnected()) {
            if (enableGlobal) setGlobalActivities([]);
            if (enableProject) setProjectActivities([]);
          }
        }, 60000);
      }
    },
    [enableGlobal, enableProject]
  );

  const markAsRead = useCallback(() => {
    setHasNewActivity(false);
  }, []);

  const clearActivities = useCallback(() => {
    if (enableGlobal) setGlobalActivities([]);
    if (enableProject) setProjectActivities([]);
    setHasNewActivity(false);
  }, [enableGlobal, enableProject]);

  const refreshActivities = useCallback(() => {
    websocketService.forceReconnect();
  }, []);

  useEffect(() => {
    if (!enableGlobal) return;

    const unsubscribeActivity = websocketService.onGlobalActivityUpdate(
      (activity) => {
        try {
          handleNewGlobalActivity(activity);
        } catch (error) {
          // Silent error handling
        }
      }
    );

    return unsubscribeActivity;
  }, [enableGlobal, handleNewGlobalActivity]);

  useEffect(() => {
    if (!enableProject || !projectId) return;

    const unsubscribeActivity = websocketService.onProjectActivityUpdate(
      projectId,
      (activity) => {
        try {
          handleNewProjectActivity(activity);
        } catch (error) {
          // Silent error handling
        }
      }
    );

    return unsubscribeActivity;
  }, [enableProject, projectId, handleNewProjectActivity]);

  useEffect(() => {
    const unsubscribeConnection = websocketService.onConnectionStatusChange(
      (state) => {
        handleConnectionStatus(state === "connected");
      }
    );

    return unsubscribeConnection;
  }, [handleConnectionStatus]);

  useEffect(() => {
    if (autoConnect) {
      const timer = setTimeout(() => {
        if (websocketService.getConnectionState() === "disconnected") {
          websocketService.connect();
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [autoConnect]);

  const allActivities = useCallback(() => {
    const combined = [...globalActivities, ...projectActivities];

    const uniqueActivities = combined.filter(
      (activity, index, arr) =>
        arr.findIndex((a) => a.id === activity.id) === index
    );

    return uniqueActivities
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, maxActivities);
  }, [globalActivities, projectActivities, maxActivities]);

  return {
    globalActivities,
    realtimeActivities: globalActivities,
    projectActivities,
    allActivities: allActivities(),
    isConnected,
    hasNewActivity,
    markAsRead,
    clearActivities,
    refreshActivities,
    globalActivityCount: globalActivities.length,
    projectActivityCount: projectActivities.length,
    totalActivityCount: allActivities().length,
    lastGlobalActivityTime: globalActivities[0]?.createdAt || null,
    lastProjectActivityTime: projectActivities[0]?.createdAt || null,
    lastActivityTime: allActivities()[0]?.createdAt || null,
    projectId,
    enableGlobal,
    enableProject,
  };
};
