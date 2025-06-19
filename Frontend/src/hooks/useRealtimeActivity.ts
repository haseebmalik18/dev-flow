import { useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { websocketService } from "../services/webSocketService";
import type { ActivityUpdate } from "../services/webSocketService";
import { useWebSocket } from "./useWebSocket";
import type { ActivityItem } from "../services/dashboardService";

export const useRealtimeActivity = () => {
  const [realtimeActivities, setRealtimeActivities] = useState<
    ActivityUpdate[]
  >([]);
  const [hasNewActivity, setHasNewActivity] = useState(false);
  const queryClient = useQueryClient();
  const { isConnected } = useWebSocket();

  // Handle new activity updates from STOMP
  const handleNewActivity = useCallback(
    (activity: ActivityUpdate) => {
      console.log("📥 Processing new STOMP activity:", activity);

      // Add to realtime activities list (prevent duplicates)
      setRealtimeActivities((prev) => {
        const exists = prev.some((a) => a.id === activity.id);
        if (exists) return prev;
        return [activity, ...prev].slice(0, 50);
      });

      setHasNewActivity(true);

      // Update React Query cache for dashboard activity
      queryClient.setQueryData(["dashboard", "activity"], (oldData: any) => {
        // Handle case where oldData might not be an array or might be undefined
        if (!oldData || !Array.isArray(oldData)) {
          console.log(
            "📝 Dashboard activity cache is empty or invalid, creating new array"
          );
          const newActivityItem: ActivityItem = {
            id: activity.id,
            type: activity.type,
            description: activity.description,
            createdAt: activity.createdAt,
            user: activity.user,
            project: activity.project,
            task: activity.task,
          };
          return [newActivityItem];
        }

        const newActivityItem: ActivityItem = {
          id: activity.id,
          type: activity.type,
          description: activity.description,
          createdAt: activity.createdAt,
          user: activity.user,
          project: activity.project,
          task: activity.task,
        };

        // Prevent duplicates
        const exists = oldData.some(
          (item: ActivityItem) => item.id === activity.id
        );
        if (exists) {
          console.log("🔄 Activity already exists in cache, skipping");
          return oldData;
        }

        console.log("✅ Adding new activity to cache");
        return [newActivityItem, ...oldData].slice(0, 20);
      });

      // Invalidate dashboard queries after a short delay
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ["dashboard", "stats"],
          exact: false,
        });
      }, 1000);
    },
    [queryClient]
  );

  // Setup STOMP activity listener when connected
  useEffect(() => {
    if (!isConnected) {
      console.log("❌ STOMP not connected, skipping activity subscription");
      return;
    }

    console.log("✅ Setting up STOMP activity listener");
    const unsubscribe = websocketService.onActivityUpdate(handleNewActivity);

    return () => {
      console.log("🧹 Cleaning up STOMP activity listener");
      unsubscribe();
    };
  }, [isConnected, handleNewActivity]);

  // Clear activities when disconnected
  useEffect(() => {
    if (!isConnected && realtimeActivities.length > 0) {
      console.log("🧹 STOMP disconnected, clearing realtime activities");
      setRealtimeActivities([]);
      setHasNewActivity(false);
    }
  }, [isConnected, realtimeActivities.length]);

  const markAsRead = useCallback(() => {
    console.log("✅ Marking STOMP activities as read");
    setHasNewActivity(false);
    setRealtimeActivities([]);
    localStorage.setItem("lastActivitySeen", new Date().toISOString());
  }, []);

  return {
    realtimeActivities,
    hasNewActivity,
    markAsRead,
    isConnected,
  };
};
