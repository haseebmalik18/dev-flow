import { useEffect, useState, useCallback, useRef } from "react";
import {
  websocketService,
  type ActivityUpdate,
} from "../services/webSocketService";
import type { ActivityItem } from "../services/dashboardService";

export interface UseRealtimeActivityReturn {
  realtimeActivities: ActivityItem[];
  hasNewActivity: boolean;
  isConnected: boolean;
  markAsRead: () => void;
  clearActivities: () => void;
  addActivity: (activity: ActivityUpdate) => void;
}

// Transform WebSocket activity to dashboard activity format
const transformActivity = (activity: ActivityUpdate): ActivityItem => ({
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
});

export const useRealtimeActivity = (): UseRealtimeActivityReturn => {
  const [realtimeActivities, setRealtimeActivities] = useState<ActivityItem[]>(
    []
  );
  const [hasNewActivity, setHasNewActivity] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const lastSeenTimestamp = useRef<string | null>(
    localStorage.getItem("lastActivitySeen")
  );

  // Listen to WebSocket connection status
  useEffect(() => {
    const unsubscribe = websocketService.onConnectionStatusChange((state) => {
      setIsConnected(state === "connected");

      if (state === "connected") {
        console.log("✅ Real-time activities connected");
      } else {
        console.log("❌ Real-time activities disconnected");
      }
    });

    return unsubscribe;
  }, []);

  // Listen to activity updates
  useEffect(() => {
    const unsubscribe = websocketService.onActivityUpdate((activity) => {
      console.log("📥 Received real-time activity:", activity);

      const transformedActivity = transformActivity(activity);

      setRealtimeActivities((prev) => {
        // Check if activity already exists to prevent duplicates
        const existsInPrev = prev.some((a) => a.id === transformedActivity.id);
        if (existsInPrev) {
          return prev;
        }

        // Add new activity to the beginning and limit to 50 items
        const newActivities = [transformedActivity, ...prev].slice(0, 50);
        return newActivities;
      });

      // Mark as having new activity if it's newer than last seen
      const activityTime = new Date(activity.createdAt).getTime();
      const lastSeenTime = lastSeenTimestamp.current
        ? new Date(lastSeenTimestamp.current).getTime()
        : 0;

      if (activityTime > lastSeenTime) {
        setHasNewActivity(true);
      }
    });

    return unsubscribe;
  }, []);

  // Mark activities as read
  const markAsRead = useCallback(() => {
    console.log("📖 Marking activities as read");
    const now = new Date().toISOString();
    lastSeenTimestamp.current = now;
    localStorage.setItem("lastActivitySeen", now);
    setHasNewActivity(false);
  }, []);

  // Clear all real-time activities
  const clearActivities = useCallback(() => {
    console.log("🗑️ Clearing real-time activities");
    setRealtimeActivities([]);
    setHasNewActivity(false);
  }, []);

  // Manually add activity (useful for testing or local updates)
  const addActivity = useCallback((activity: ActivityUpdate) => {
    console.log("➕ Manually adding activity:", activity);
    const transformedActivity = transformActivity(activity);

    setRealtimeActivities((prev) => {
      const existsInPrev = prev.some((a) => a.id === transformedActivity.id);
      if (existsInPrev) {
        return prev;
      }
      return [transformedActivity, ...prev].slice(0, 50);
    });

    setHasNewActivity(true);
  }, []);

  // Auto-mark as read when component unmounts
  useEffect(() => {
    return () => {
      if (hasNewActivity) {
        markAsRead();
      }
    };
  }, [hasNewActivity, markAsRead]);

  // Debug logging
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("🔍 Real-time activity state:", {
        activitiesCount: realtimeActivities.length,
        hasNewActivity,
        isConnected,
        lastSeen: lastSeenTimestamp.current,
      });
    }
  }, [realtimeActivities.length, hasNewActivity, isConnected]);

  return {
    realtimeActivities,
    hasNewActivity,
    isConnected,
    markAsRead,
    clearActivities,
    addActivity,
  };
};
