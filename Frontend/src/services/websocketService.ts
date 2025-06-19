import { Client, StompConfig, type Message } from "@stomp/stompjs";
import { useAuthStore } from "../hooks/useAuthStore";
import { getWebSocketConfig, websocketConfig } from "../config/websocket";

export interface ActivityUpdate {
  id: number;
  type: string;
  description: string;
  createdAt: string;
  user: {
    name: string;
    initials: string;
    avatar: string | null;
  };
  project?: string;
  task?: string;
}

export interface WebSocketMessage {
  type:
    | "ACTIVITY_UPDATE"
    | "CONNECTION_STATUS"
    | "HEARTBEAT"
    | "SUBSCRIBE"
    | "UNSUBSCRIBE"
    | "AUTH";
  data: any;
  timestamp: string;
  subscription?: string;
}

class StompWebSocketService {
  private client: Client | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private subscriptions: Map<string, any> = new Map();
  private activityCallbacks: Set<(activity: ActivityUpdate) => void> =
    new Set();
  private connectionCallbacks: Set<(connected: boolean) => void> = new Set();

  constructor() {
    this.setupClient();
  }

  private setupClient(): void {
    const config = getWebSocketConfig();

    const stompConfig: StompConfig = {
      brokerURL: config.url,

      webSocketFactory: () => {
        return new WebSocket(config.url);
      },

      connectHeaders: this.getAuthHeaders(),

      debug: (str: string) => {
        if (process.env.NODE_ENV === "development") {
          console.log("STOMP Debug:", str);
        }
      },

      reconnectDelay: config.reconnectDelay,
      heartbeatIncoming: config.heartbeatIncoming,
      heartbeatOutgoing: config.heartbeatOutgoing,

      onConnect: this.onConnect.bind(this),
      onDisconnect: this.onDisconnect.bind(this),
      onStompError: this.onStompError.bind(this),
      onWebSocketError: this.onWebSocketError.bind(this),
      onWebSocketClose: this.onWebSocketClose.bind(this),
    };

    this.client = new Client(stompConfig);
  }

  private getWsUrl(): string {
    return getWebSocketConfig().url;
  }

  private getAuthHeaders(): Record<string, string> {
    const token = useAuthStore.getState().token;
    const headers: Record<string, string> = {};

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
  }

  private onConnect(): void {
    console.log("STOMP WebSocket connected");
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.notifyConnectionStatus(true);

    this.resubscribeAll();

    this.subscribeToGlobalActivities();
  }

  private onDisconnect(): void {
    console.log("STOMP WebSocket disconnected");
    this.notifyConnectionStatus(false);
    this.clearSubscriptions();
  }

  private onStompError(frame: any): void {
    console.error("STOMP error:", frame);
    this.notifyConnectionStatus(false);
  }

  private onWebSocketError(error: Event): void {
    console.error("WebSocket error:", error);
    this.isConnecting = false;
    this.notifyConnectionStatus(false);
  }

  private onWebSocketClose(event: CloseEvent): void {
    console.log("WebSocket closed:", event.code, event.reason);
    this.isConnecting = false;
    this.notifyConnectionStatus(false);

    if (
      event.code !== 1000 &&
      this.reconnectAttempts < this.maxReconnectAttempts
    ) {
      this.attemptReconnect();
    }
  }

  private attemptReconnect(): void {
    if (this.isConnecting) return;

    this.reconnectAttempts++;
    console.log(
      `Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  private resubscribeAll(): void {
    const subscriptionKeys = Array.from(this.subscriptions.keys());

    this.subscriptions.clear();

    subscriptionKeys.forEach((destination) => {
      if (destination === websocketConfig.destinations.globalActivities) {
        this.subscribeToGlobalActivities();
      } else if (destination.startsWith("/topic/activities/project/")) {
        const projectId = parseInt(destination.split("/").pop() || "0");
        if (projectId > 0) {
          this.subscribeToProjectActivities(projectId);
        }
      } else if (destination.startsWith("/topic/activities/task/")) {
        const taskId = parseInt(destination.split("/").pop() || "0");
        if (taskId > 0) {
          this.subscribeToTaskActivities(taskId);
        }
      } else if (destination.startsWith("/topic/notifications/user/")) {
        this.subscribeToUserNotifications();
      } else if (destination.startsWith("/topic/teams/")) {
        const teamId = parseInt(destination.split("/")[2] || "0");
        if (teamId > 0) {
          this.subscribeToTeamUpdates(teamId);
        }
      }
    });
  }

  private clearSubscriptions(): void {
    this.subscriptions.forEach((subscription) => {
      if (subscription && subscription.unsubscribe) {
        subscription.unsubscribe();
      }
    });
    this.subscriptions.clear();
  }

  private handleActivityMessage(message: Message): void {
    try {
      const activity: ActivityUpdate = JSON.parse(message.body);

      localStorage.setItem("lastActivitySeen", new Date().toISOString());

      this.activityCallbacks.forEach((callback) => callback(activity));
    } catch (error) {
      console.error("Failed to parse activity message:", error);
    }
  }

  private notifyConnectionStatus(connected: boolean): void {
    this.connectionCallbacks.forEach((callback) => callback(connected));
  }

  public connect(): void {
    if (this.isConnected() || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    if (this.client) {
      this.client.connectHeaders = this.getAuthHeaders();
      this.client.activate();
    }
  }

  public disconnect(): void {
    this.clearSubscriptions();
    this.reconnectAttempts = this.maxReconnectAttempts;

    if (this.client) {
      this.client.deactivate();
    }

    this.activityCallbacks.clear();
    this.connectionCallbacks.clear();
  }

  public subscribeToGlobalActivities(): void {
    if (!this.isConnected()) {
      console.warn("Cannot subscribe - not connected");
      return;
    }

    const destination = websocketConfig.destinations.globalActivities;

    if (this.subscriptions.has(destination)) {
      return;
    }

    const subscription = this.client!.subscribe(
      destination,
      (message: Message) => {
        this.handleActivityMessage(message);
      }
    );

    this.subscriptions.set(destination, subscription);
    console.log("Subscribed to global activities");
  }

  public subscribeToProjectActivities(projectId: number): void {
    if (!this.isConnected()) {
      console.warn("Cannot subscribe - not connected");
      return;
    }

    const destination =
      websocketConfig.destinations.projectActivities(projectId);

    this.subscriptions.forEach((subscription, dest) => {
      if (
        dest.startsWith("/topic/activities/project/") &&
        dest !== destination
      ) {
        subscription.unsubscribe();
        this.subscriptions.delete(dest);
      }
    });

    if (this.subscriptions.has(destination)) {
      return;
    }

    const subscription = this.client!.subscribe(
      destination,
      (message: Message) => {
        this.handleActivityMessage(message);
      }
    );

    this.subscriptions.set(destination, subscription);
    console.log(`Subscribed to project ${projectId} activities`);

    localStorage.setItem(
      `lastActivitySeen-project-${projectId}`,
      new Date().toISOString()
    );
  }

  public subscribeToTaskActivities(taskId: number): void {
    if (!this.isConnected()) {
      console.warn("Cannot subscribe - not connected");
      return;
    }

    const destination = websocketConfig.destinations.taskActivities(taskId);

    this.subscriptions.forEach((subscription, dest) => {
      if (dest.startsWith("/topic/activities/task/") && dest !== destination) {
        subscription.unsubscribe();
        this.subscriptions.delete(dest);
      }
    });

    if (this.subscriptions.has(destination)) {
      return;
    }

    const subscription = this.client!.subscribe(
      destination,
      (message: Message) => {
        this.handleActivityMessage(message);
      }
    );

    this.subscriptions.set(destination, subscription);
    console.log(`Subscribed to task ${taskId} activities`);

    localStorage.setItem(
      `lastActivitySeen-task-${taskId}`,
      new Date().toISOString()
    );
  }

  public unsubscribeFromProject(projectId: number): void {
    const destination =
      websocketConfig.destinations.projectActivities(projectId);
    const subscription = this.subscriptions.get(destination);

    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(destination);
      console.log(`Unsubscribed from project ${projectId} activities`);
    }
  }

  public unsubscribeFromTask(taskId: number): void {
    const destination = websocketConfig.destinations.taskActivities(taskId);
    const subscription = this.subscriptions.get(destination);

    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(destination);
      console.log(`Unsubscribed from task ${taskId} activities`);
    }
  }

  public sendMessage(
    destination: string,
    body: any,
    headers: Record<string, string> = {}
  ): void {
    if (!this.isConnected()) {
      console.warn("Cannot send message - not connected");
      return;
    }

    this.client!.publish({
      destination,
      body: JSON.stringify(body),
      headers,
    });
  }

  public onActivityUpdate(
    callback: (activity: ActivityUpdate) => void
  ): () => void {
    this.activityCallbacks.add(callback);

    return () => {
      this.activityCallbacks.delete(callback);
    };
  }

  public onConnectionStatusChange(
    callback: (connected: boolean) => void
  ): () => void {
    this.connectionCallbacks.add(callback);

    return () => {
      this.connectionCallbacks.delete(callback);
    };
  }

  public isConnected(): boolean {
    return this.client?.connected ?? false;
  }

  public getConnectionState():
    | "connecting"
    | "connected"
    | "disconnected"
    | "error" {
    if (this.isConnecting) return "connecting";
    if (this.isConnected()) return "connected";
    return "disconnected";
  }

  public subscribeToUserNotifications(): void {
    if (!this.isConnected()) {
      console.warn("Cannot subscribe - not connected");
      return;
    }

    const user = useAuthStore.getState().user;
    if (!user) {
      console.warn("No user found for notifications subscription");
      return;
    }

    const destination = websocketConfig.destinations.userNotifications(user.id);

    if (this.subscriptions.has(destination)) {
      return;
    }

    const subscription = this.client!.subscribe(
      destination,
      (message: Message) => {
        try {
          const notification = JSON.parse(message.body);
          console.log("Received notification:", notification);
        } catch (error) {
          console.error("Failed to parse notification:", error);
        }
      }
    );

    this.subscriptions.set(destination, subscription);
    console.log(`Subscribed to user ${user.id} notifications`);
  }

  public subscribeToTeamUpdates(teamId: number): void {
    if (!this.isConnected()) {
      console.warn("Cannot subscribe - not connected");
      return;
    }

    const destination = websocketConfig.destinations.teamUpdates(teamId);

    if (this.subscriptions.has(destination)) {
      return;
    }

    const subscription = this.client!.subscribe(
      destination,
      (message: Message) => {
        try {
          const update = JSON.parse(message.body);
          console.log("Received team update:", update);
        } catch (error) {
          console.error("Failed to parse team update:", error);
        }
      }
    );

    this.subscriptions.set(destination, subscription);
    console.log(`Subscribed to team ${teamId} updates`);
  }
}

export const websocketService = new StompWebSocketService();

export { StompWebSocketService };
