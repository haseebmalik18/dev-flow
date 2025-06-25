// Frontend/src/config/websocket.ts
export const websocketConfig = {
  development: {
    // Use environment variable or fallback to Railway URL
    url: import.meta.env.VITE_WS_URL || "ws://localhost:8080/ws",
    reconnectDelay: 1000,
    maxReconnectAttempts: 5,
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,
  },
  production: {
    // For production, use env var or construct from current location
    url:
      import.meta.env.VITE_WS_URL ||
      `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${
        window.location.host
      }/ws`,
    reconnectDelay: 2000,
    maxReconnectAttempts: 10,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
  },

  destinations: {
    globalActivities: "/topic/activities/global",
    projectActivities: (projectId: number) =>
      `/topic/activities/project/${projectId}`,
    taskActivities: (taskId: number) => `/topic/activities/task/${taskId}`,
    userNotifications: (userId: number) =>
      `/topic/notifications/user/${userId}`,
    teamUpdates: (teamId: number) => `/topic/teams/${teamId}/updates`,
  },

  messageTypes: {
    ACTIVITY_UPDATE: "ACTIVITY_UPDATE",
    NOTIFICATION: "NOTIFICATION",
    TEAM_UPDATE: "TEAM_UPDATE",
    HEARTBEAT: "HEARTBEAT",
  },
};

export const getWebSocketConfig = () => {
  const env =
    process.env.NODE_ENV === "development" ? "development" : "production";
  return websocketConfig[env];
};

// Helper function to get the correct WebSocket URL
export const getWebSocketUrl = (): string => {
  // Check for explicit environment variable first
  if (import.meta.env.VITE_WS_URL) {
    console.log(
      "Using WebSocket URL from environment:",
      import.meta.env.VITE_WS_URL
    );
    return import.meta.env.VITE_WS_URL;
  }

  // For development, try to derive from API base URL
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (apiBaseUrl) {
    // Convert HTTP URL to WebSocket URL
    const wsUrl =
      apiBaseUrl
        .replace("http://", "ws://")
        .replace("https://", "wss://")
        .replace("/api/v1", "") + "/ws";
    console.log("Derived WebSocket URL from API base URL:", wsUrl);
    return wsUrl;
  }

  // Fallback based on environment
  if (process.env.NODE_ENV === "development") {
    console.log("Using development fallback WebSocket URL");
    return "ws://localhost:8080/ws";
  } else {
    // Production fallback
    const fallbackUrl = `${
      window.location.protocol === "https:" ? "wss:" : "ws:"
    }//${window.location.host}/ws`;
    console.log("Using production fallback WebSocket URL:", fallbackUrl);
    return fallbackUrl;
  }
};

// Helper function to get WebSocket connect headers
export const getWebSocketHeaders = (token?: string) => {
  const headers: Record<string, string> = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers.token = token; // Fallback header as per your backend config
  }

  return headers;
};

// Debug helper to log WebSocket configuration
export const logWebSocketConfig = () => {
  const config = getWebSocketConfig();
  const url = getWebSocketUrl();

  console.group("🔌 WebSocket Configuration");
  console.log("Environment:", process.env.NODE_ENV);
  console.log("WebSocket URL:", url);
  console.log("Config:", config);
  console.log("API Base URL:", import.meta.env.VITE_API_BASE_URL);
  console.log("WS URL from env:", import.meta.env.VITE_WS_URL);
  console.groupEnd();
};
