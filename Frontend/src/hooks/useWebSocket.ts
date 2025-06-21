import { useEffect, useState, useCallback, useRef } from "react";
import {
  websocketService,
  type ConnectionState,
} from "../services/webSocketService";
import { useAuthStore } from "./useAuthStore";

export interface UseWebSocketReturn {
  isConnected: boolean;
  connectionState: ConnectionState;
  connect: () => void;
  disconnect: () => void;
  forceReconnect: () => void;
  sendHeartbeat: () => void;
  subscribeToGlobalActivities: (
    callback: (activity: any) => void
  ) => () => void;
  subscribeToProjectActivities: (
    projectId: number,
    callback: (activity: any) => void
  ) => () => void;
}

export const useWebSocket = (): UseWebSocketReturn => {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const { isAuthenticated } = useAuthStore();
  const tabIdRef = useRef<string | undefined>(undefined);
  const unregisterTabRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!tabIdRef.current) {
      tabIdRef.current = Math.random().toString(36).substring(2);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = websocketService.onConnectionStatusChange((state) => {
      setConnectionState(state);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isAuthenticated && tabIdRef.current) {
      unregisterTabRef.current = websocketService.registerTab(tabIdRef.current);

      setTimeout(() => {
        websocketService.connect();
      }, 100);

      return () => {
        if (unregisterTabRef.current) {
          unregisterTabRef.current();
          unregisterTabRef.current = null;
        }
      };
    } else {
      if (unregisterTabRef.current) {
        unregisterTabRef.current();
        unregisterTabRef.current = null;
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (connectionState === "connected") {
      const heartbeatInterval = setInterval(() => {
        websocketService.sendHeartbeat();
      }, 30000);

      return () => {
        clearInterval(heartbeatInterval);
      };
    }
  }, [connectionState]);

  const connect = useCallback(() => {
    websocketService.connect();
  }, []);

  const disconnect = useCallback(() => {
    websocketService.disconnect();
  }, []);

  const forceReconnect = useCallback(() => {
    websocketService.forceReconnect();
  }, []);

  const sendHeartbeat = useCallback(() => {
    websocketService.sendHeartbeat();
  }, []);

  const subscribeToGlobalActivities = useCallback(
    (callback: (activity: any) => void) => {
      return websocketService.onGlobalActivityUpdate(callback);
    },
    []
  );

  const subscribeToProjectActivities = useCallback(
    (projectId: number, callback: (activity: any) => void) => {
      return websocketService.onProjectActivityUpdate(projectId, callback);
    },
    []
  );

  return {
    isConnected: connectionState === "connected",
    connectionState,
    connect,
    disconnect,
    forceReconnect,
    sendHeartbeat,
    subscribeToGlobalActivities,
    subscribeToProjectActivities,
  };
};
