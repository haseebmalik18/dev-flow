import { useEffect, useState, useRef } from "react";
import { websocketService } from "../services/websocketService";
import { useAuthStore } from "./useAuthStore";

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<
    "connecting" | "connected" | "disconnected" | "error"
  >("disconnected");
  const { isAuthenticated } = useAuthStore();
  const connectionRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isAuthenticated) {
      websocketService.disconnect();
      connectionRef.current = false;
      return;
    }

    if (!connectionRef.current) {
      websocketService.connect();
      connectionRef.current = true;
    }

    const unsubscribeConnection = websocketService.onConnectionStatusChange(
      (connected) => {
        setIsConnected(connected);
        setConnectionState(websocketService.getConnectionState());
      }
    );

    setIsConnected(websocketService.isConnected());
    setConnectionState(websocketService.getConnectionState());

    return () => {
      unsubscribeConnection();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    return () => {
      if (connectionRef.current) {
        websocketService.disconnect();
        connectionRef.current = false;
      }
    };
  }, []);

  return {
    isConnected,
    connectionState,
    connect: () => websocketService.connect(),
    disconnect: () => websocketService.disconnect(),
  };
};
