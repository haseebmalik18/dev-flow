import { useEffect, useState, useRef } from "react";
import { websocketService } from "../services/websocketService";
import { useAuthStore } from "./useAuthStore";

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<
    "connecting" | "connected" | "disconnected" | "error"
  >("disconnected");
  const { isAuthenticated, user } = useAuthStore();
  const connectionRef = useRef<boolean>(false);
  const authRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (connectionRef.current) {
        websocketService.disconnect();
        connectionRef.current = false;
        authRef.current = false;
      }
      return;
    }

    if (!connectionRef.current || !authRef.current) {
      websocketService.connect();
      connectionRef.current = true;
      authRef.current = true;
    }

    const unsubscribeConnection = websocketService.onConnectionStatusChange(
      (connected) => {
        setIsConnected(connected);
        setConnectionState(websocketService.getConnectionState());

        if (connected && user) {
          setTimeout(() => {
            websocketService.subscribeToUserNotifications();
          }, 100);
        }
      }
    );

    setIsConnected(websocketService.isConnected());
    setConnectionState(websocketService.getConnectionState());

    return () => {
      unsubscribeConnection();
    };
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    return () => {
      if (connectionRef.current) {
        websocketService.disconnect();
        connectionRef.current = false;
        authRef.current = false;
      }
    };
  }, []);

  const connect = () => {
    if (isAuthenticated && user) {
      websocketService.connect();
      connectionRef.current = true;
    }
  };

  const disconnect = () => {
    websocketService.disconnect();
    connectionRef.current = false;
    authRef.current = false;
  };

  const subscribeToProject = (projectId: number) => {
    websocketService.subscribeToProjectActivities(projectId);
  };

  const unsubscribeFromProject = (projectId: number) => {
    websocketService.unsubscribeFromProject(projectId);
  };

  const subscribeToTask = (taskId: number) => {
    websocketService.subscribeToTaskActivities(taskId);
  };

  const unsubscribeFromTask = (taskId: number) => {
    websocketService.unsubscribeFromTask(taskId);
  };

  const subscribeToTeam = (teamId: number) => {
    websocketService.subscribeToTeamUpdates(teamId);
  };

  const sendMessage = (
    destination: string,
    body: any,
    headers?: Record<string, string>
  ) => {
    websocketService.sendMessage(destination, body, headers);
  };

  return {
    isConnected,
    connectionState,
    connect,
    disconnect,
    subscribeToProject,
    unsubscribeFromProject,
    subscribeToTask,
    unsubscribeFromTask,
    subscribeToTeam,
    sendMessage,
  };
};
