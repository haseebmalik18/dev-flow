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
    },
    [queryClient]
  );

  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = websocketService.onActivityUpdate(handleNewActivity);

    return () => {
      unsubscribe();
    };
  }, [isConnected, handleNewActivity]);

  const markAsRead = useCallback(() => {
    setHasNewActivity(false);
    setRealtimeActivities([]);
  }, []);

  const subscribeToProject = useCallback((projectId: number) => {
    websocketService.subscribeToProjectActivities(projectId);
  }, []);

  const unsubscribeFromProject = useCallback((projectId: number) => {
    websocketService.unsubscribeFromProject(projectId);
  }, []);

  const subscribeToTask = useCallback((taskId: number) => {
    websocketService.subscribeToTaskActivities(taskId);
  }, []);

  const unsubscribeFromTask = useCallback((taskId: number) => {
    websocketService.unsubscribeFromTask(taskId);
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
