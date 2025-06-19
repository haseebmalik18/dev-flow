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
}

export const useWebSocket = (): UseWebSocketReturn => {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const { isAuthenticated } = useAuthStore();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear reconnect timeout on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Listen to connection state changes
  useEffect(() => {
    const unsubscribe = websocketService.onConnectionStatusChange((state) => {
      console.log("🔗 WebSocket hook received state change:", state);
      setConnectionState(state);
    });

    return unsubscribe;
  }, []);

  // Auto-connect when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      console.log("🔄 User authenticated - auto-connecting WebSocket");

      // Small delay to ensure auth is fully set up
      const timeoutId = setTimeout(() => {
        websocketService.connect();
      }, 100);

      return () => {
        clearTimeout(timeoutId);
      };
    } else {
      console.log("🔄 User not authenticated - disconnecting WebSocket");
      websocketService.disconnect();
    }
  }, [isAuthenticated]);

  // Connection recovery logic
  useEffect(() => {
    if (connectionState === "error" && isAuthenticated) {
      // Clear any existing timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      // Schedule reconnection attempt
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log("🔄 Attempting connection recovery...");
        websocketService.forceReconnect();
      }, 3000);
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [connectionState, isAuthenticated]);

  // Heartbeat to keep connection alive
  useEffect(() => {
    if (connectionState === "connected") {
      const heartbeatInterval = setInterval(() => {
        websocketService.sendHeartbeat();
      }, 30000); // Send heartbeat every 30 seconds

      return () => {
        clearInterval(heartbeatInterval);
      };
    }
  }, [connectionState]);

  // Manual control functions
  const connect = useCallback(() => {
    console.log("🔄 Manual connect requested");
    websocketService.connect();
  }, []);

  const disconnect = useCallback(() => {
    console.log("🔄 Manual disconnect requested");
    websocketService.disconnect();
  }, []);

  const forceReconnect = useCallback(() => {
    console.log("🔄 Force reconnect requested");
    websocketService.forceReconnect();
  }, []);

  const sendHeartbeat = useCallback(() => {
    websocketService.sendHeartbeat();
  }, []);

  return {
    isConnected: connectionState === "connected",
    connectionState,
    connect,
    disconnect,
    forceReconnect,
    sendHeartbeat,
  };
};
