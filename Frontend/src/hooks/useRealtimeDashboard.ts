import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRealtimeActivity } from "./useRealtimeActivity";

export const useRealtimeDashboard = () => {
  const queryClient = useQueryClient();
  const { realtimeActivities, hasNewActivity, markAsRead, isConnected } =
    useRealtimeActivity();

  useEffect(() => {
    if (hasNewActivity && realtimeActivities.length > 0) {
      const timer = setTimeout(() => {
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
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [hasNewActivity, realtimeActivities.length, queryClient]);

  return {
    hasNewActivity,
    markAsRead,
    isConnected,
    realtimeActivityCount: realtimeActivities.length,
  };
};
