export const websocketConfig = {
  development: {
    url: "ws://localhost:8080/ws",
    reconnectDelay: 1000,
    maxReconnectAttempts: 5,
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,
  },
  production: {
    url: `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${
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
