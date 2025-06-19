import { useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { websocketService } from "../services/websocketService";
import type { ActivityUpdate } from "../services/websocketService";
import { useWebSocket } from "./useWebsocket";
import type { ActivityItem } from "../services/dashboardService";

export const useRealtimeActivity = () => {
  const [realtimeActivities, setRealtimeActivities] = useState<
    ActivityUpdate[]
  >([]);
  const [hasNewActivity, setHasNewActivity] = useState(false);
  const queryClient = useQueryClient();
  const { isConnected } = useWebSocket();

  const handleNewActivity = useCallback(
    (activity: ActivityUpdate) => {
      console.log("Processing new activity in useRealtimeActivity:", activity);

      setRealtimeActivities((prev) => {
        const updated = [activity, ...prev].slice(0, 50);
        return updated;
      });

      setHasNewActivity(true);

      queryClient.setQueryData(["dashboard", "activity"], (oldData: any) => {
        if (!oldData) return oldData;

        const newActivityItem: ActivityItem = {
          id: activity.id,
          type: activity.type,
          description: activity.description,
          createdAt: activity.createdAt,
          user: activity.user,
          project: activity.project,
          task: activity.task,
        };

        return [newActivityItem, ...oldData].slice(0, 20);
      });

      queryClient.invalidateQueries({
        queryKey: ["dashboard", "activity"],
        exact: false,
      });

      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ["dashboard", "stats"],
          exact: false,
        });
        queryClient.invalidateQueries({
          queryKey: ["dashboard", "projects"],
          exact: false,
        });
        queryClient.invalidateQueries({
          queryKey: ["dashboard", "tasks"],
          exact: false,
        });
      }, 1000);
    },
    [queryClient]
  );

  useEffect(() => {
    if (!isConnected) {
      console.log("WebSocket not connected, skipping activity subscription");
      return;
    }

    console.log("Setting up activity update listener");
    const unsubscribe = websocketService.onActivityUpdate(handleNewActivity);

    return () => {
      console.log("Cleaning up activity update listener");
      unsubscribe();
    };
  }, [isConnected, handleNewActivity]);

  const markAsRead = useCallback(() => {
    console.log("Marking activities as read");
    setHasNewActivity(false);
    setRealtimeActivities([]);

    localStorage.setItem("lastActivitySeen", new Date().toISOString());
  }, []);

  const subscribeToProject = useCallback((projectId: number) => {
    console.log(
      `Project ${projectId} subscription requested - not implemented yet`
    );
    // websocketService.subscribeToProjectActivities(projectId);
  }, []);

  const unsubscribeFromProject = useCallback((projectId: number) => {
    console.log(
      `Unsubscribe from project ${projectId} requested - not implemented yet`
    );
    // websocketService.unsubscribeFromProject(projectId);
  }, []);

  const subscribeToTask = useCallback((taskId: number) => {
    console.log(`Task ${taskId} subscription requested - not implemented yet`);
    // websocketService.subscribeToTaskActivities(taskId);
  }, []);

  const unsubscribeFromTask = useCallback((taskId: number) => {
    console.log(
      `Unsubscribe from task ${taskId} requested - not implemented yet`
    );
    // websocketService.unsubscribeFromTask(taskId);
  }, []);

  return {
    realtimeActivities,
    hasNewActivity,
    markAsRead,
    subscribeToProject,
    unsubscribeFromProject,
    subscribeToTask,
    unsubscribeFromTask,
    isConnected,
  };
};
