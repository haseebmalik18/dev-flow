import { useEffect, useState, useCallback } from "react";
import { websocketService } from "../services/websocketService";
import { useAuthStore } from "./useAuthStore";

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const { isAuthenticated, user, token } = useAuthStore();

  // Handle connection status changes
  const handleConnectionChange = useCallback((connected: boolean) => {
    setIsConnected(connected);
  }, []);

  // Setup connection status listener
  useEffect(() => {
    const unsubscribe = websocketService.onConnectionStatusChange(
      handleConnectionChange
    );

    // Set initial state
    setIsConnected(websocketService.isConnected());

    return unsubscribe;
  }, [handleConnectionChange]);

  // Manage connection based on auth state
  useEffect(() => {
    if (isAuthenticated && user && token) {
      console.log("🔄 User authenticated, connecting STOMP WebSocket...");
      websocketService.connect();
    } else {
      console.log(
        "🔄 User not authenticated, disconnecting STOMP WebSocket..."
      );
      websocketService.disconnect();
    }

    // Cleanup on unmount or auth change
    return () => {
      if (!isAuthenticated) {
        websocketService.disconnect();
      }
    };
  }, [isAuthenticated, user?.id, token]);

  const connect = useCallback(() => {
    if (isAuthenticated && user && token) {
      websocketService.connect();
    }
  }, [isAuthenticated, user, token]);

  const disconnect = useCallback(() => {
    websocketService.disconnect();
  }, []);

  return {
    isConnected,
    connect,
    disconnect,
  };
};
