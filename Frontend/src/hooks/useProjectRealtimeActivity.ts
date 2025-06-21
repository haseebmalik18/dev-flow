import { useState, useEffect, useCallback, useRef } from "react";
import {
  websocketService,
  type ActivityUpdate,
} from "../services/webSocketService";
import type { ActivityItem } from "../services/dashboardService";

export const useProjectRealtimeActivity = (projectId: number | null) => {
  const [projectActivities, setProjectActivities] = useState<ActivityItem[]>(
    []
  );
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedInitial = useRef(false);
  const lastProjectId = useRef<number | null>(null);

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

  const loadStoredActivities = useCallback(
    (newProjectId: number) => {
      try {
        setIsLoading(true);
        const storedActivities =
          websocketService.getProjectActivities(newProjectId);
        const convertedActivities = storedActivities.map(convertActivity);

        const sortedActivities = convertedActivities.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setProjectActivities(sortedActivities);
        hasLoadedInitial.current = true;
      } catch (error) {
        setProjectActivities([]);
      } finally {
        setIsLoading(false);
      }
    },
    [convertActivity]
  );

  const handleNewProjectActivity = useCallback(
    (activity: ActivityUpdate) => {
      try {
        const convertedActivity = convertActivity(activity);

        setProjectActivities((prev) => {
          const exists = prev.some(
            (existing) =>
              existing.id === convertedActivity.id ||
              (activity.activityId && existing.id === activity.activityId)
          );

          if (exists) {
            return prev;
          }

          const updated = [convertedActivity, ...prev];
          const sorted = updated.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          return sorted.slice(0, 100);
        });
      } catch (error) {
        // Silent error handling
      }
    },
    [convertActivity, projectId]
  );

  const handleConnectionStatus = useCallback((connected: boolean) => {
    setIsConnected(connected);
  }, []);

  const clearActivities = useCallback(() => {
    if (projectId) {
      websocketService.clearProjectActivities(projectId);
      setProjectActivities([]);
    }
  }, [projectId]);

  const refreshActivities = useCallback(() => {
    if (projectId) {
      loadStoredActivities(projectId);
      websocketService.forceReconnect();
    }
  }, [projectId, loadStoredActivities]);

  useEffect(() => {
    if (!projectId) {
      setProjectActivities([]);
      setIsLoading(false);
      hasLoadedInitial.current = false;
      lastProjectId.current = null;
      return;
    }

    if (lastProjectId.current !== projectId) {
      lastProjectId.current = projectId;
      hasLoadedInitial.current = false;
      loadStoredActivities(projectId);
    }
  }, [projectId, loadStoredActivities]);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    const unsubscribeActivity = websocketService.onProjectActivityUpdate(
      projectId,
      (activity) => {
        try {
          if (hasLoadedInitial.current) {
            handleNewProjectActivity(activity);
          }
        } catch (error) {
          // Silent error handling
        }
      }
    );

    return unsubscribeActivity;
  }, [projectId, handleNewProjectActivity]);

  useEffect(() => {
    const unsubscribeConnection = websocketService.onConnectionStatusChange(
      (state) => {
        handleConnectionStatus(state === "connected");
      }
    );

    return unsubscribeConnection;
  }, [handleConnectionStatus]);

  useEffect(() => {
    if (projectId) {
      const timer = setTimeout(() => {
        if (websocketService.getConnectionState() === "disconnected") {
          websocketService.connect();
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && hasLoadedInitial.current) {
        setTimeout(() => {
          const storedActivities =
            websocketService.getProjectActivities(projectId);
          const convertedActivities = storedActivities.map(convertActivity);
          const sortedActivities = convertedActivities.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          setProjectActivities((prev) => {
            if (sortedActivities.length !== prev.length) {
              return sortedActivities;
            }
            return prev;
          });
        }, 100);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [projectId, convertActivity]);

  return {
    projectActivities,
    isConnected,
    isLoading,
    clearActivities,
    refreshActivities,
    activityCount: projectActivities.length,
    lastActivityTime: projectActivities[0]?.createdAt || null,
    projectId,
  };
};
