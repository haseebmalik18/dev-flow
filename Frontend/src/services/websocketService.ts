import { useAuthStore } from "../hooks/useAuthStore";

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

class NativeWebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private subscriptions: Set<string> = new Set();
  private activityCallbacks: Set<(activity: ActivityUpdate) => void> =
    new Set();
  private connectionCallbacks: Set<(connected: boolean) => void> = new Set();

  constructor() {}

  private getWsUrl(): string {
    const WS_URL = "ws://localhost:3000/ws";
    return WS_URL;
  }

  public connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      const wsUrl = this.getWsUrl();
      console.log("Connecting to WebSocket:", wsUrl);

      this.ws = new WebSocket(wsUrl);

      const token = useAuthStore.getState().token;
      if (token) {
        this.ws.addEventListener("open", () => {
          this.sendAuthMessage(token);
        });
      }

      this.ws.onopen = this.onOpen.bind(this);
      this.ws.onmessage = this.onMessage.bind(this);
      this.ws.onclose = this.onClose.bind(this);
      this.ws.onerror = this.onError.bind(this);
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      this.onError(error as Event);
    }
  }

  private sendAuthMessage(token: string): void {
    this.send({
      type: "AUTH",
      data: { token: `Bearer ${token}` },
      timestamp: new Date().toISOString(),
    });
  }

  private onOpen(): void {
    console.log("WebSocket connected");
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.notifyConnectionStatus(true);

    this.startHeartbeat();
    this.resubscribeAll();
    this.subscribeToGlobalActivities();
  }

  private onMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);

      switch (message.type) {
        case "ACTIVITY_UPDATE":
          this.handleActivityUpdate(message.data);
          break;
        case "CONNECTION_STATUS":
          console.log("Connection status:", message.data);
          break;
        case "HEARTBEAT":
          break;
        default:
          console.log("Unknown message type:", message.type, message);
      }
    } catch (error) {
      console.error("Failed to parse WebSocket message:", error);
    }
  }

  private onClose(event: CloseEvent): void {
    console.log("WebSocket disconnected:", event.code, event.reason);
    this.isConnecting = false;
    this.notifyConnectionStatus(false);
    this.stopHeartbeat();

    if (
      event.code !== 1000 &&
      event.code !== 1008 &&
      this.reconnectAttempts < this.maxReconnectAttempts
    ) {
      this.attemptReconnect();
    }
  }

  private onError(error: Event): void {
    console.error("WebSocket error:", error);
    this.isConnecting = false;
    this.notifyConnectionStatus(false);
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

  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({
          type: "HEARTBEAT",
          data: { userId: useAuthStore.getState().user?.id },
          timestamp: new Date().toISOString(),
        });
      }
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private send(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket not connected, cannot send message:", message);
    }
  }

  private resubscribeAll(): void {
    this.subscriptions.forEach((subscription) => {
      this.send({
        type: "SUBSCRIBE",
        data: { subscription },
        timestamp: new Date().toISOString(),
      });
    });
  }

  private handleActivityUpdate(activity: ActivityUpdate): void {
    localStorage.setItem("lastActivitySeen", new Date().toISOString());
    this.activityCallbacks.forEach((callback) => callback(activity));
  }

  private notifyConnectionStatus(connected: boolean): void {
    this.connectionCallbacks.forEach((callback) => callback(connected));
  }

  public subscribeToGlobalActivities(): void {
    const subscription = "global-activities";

    if (this.subscriptions.has(subscription)) {
      return;
    }

    this.subscriptions.add(subscription);

    this.send({
      type: "SUBSCRIBE",
      data: {
        subscription: "global",
        lastSeen:
          localStorage.getItem("lastActivitySeen") || new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  }

  public subscribeToProjectActivities(projectId: number): void {
    const subscription = `project-${projectId}`;

    this.subscriptions.forEach((sub) => {
      if (sub.startsWith("project-") && sub !== subscription) {
        this.unsubscribeFromProject(parseInt(sub.split("-")[1]));
      }
    });

    this.subscriptions.add(subscription);

    this.send({
      type: "SUBSCRIBE",
      data: {
        subscription: `project-${projectId}`,
        lastSeen:
          localStorage.getItem(`lastActivitySeen-project-${projectId}`) ||
          new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  }

  public subscribeToTaskActivities(taskId: number): void {
    const subscription = `task-${taskId}`;

    this.subscriptions.forEach((sub) => {
      if (sub.startsWith("task-") && sub !== subscription) {
        this.unsubscribeFromTask(parseInt(sub.split("-")[1]));
      }
    });

    this.subscriptions.add(subscription);

    this.send({
      type: "SUBSCRIBE",
      data: {
        subscription: `task-${taskId}`,
        lastSeen:
          localStorage.getItem(`lastActivitySeen-task-${taskId}`) ||
          new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  }

  public unsubscribeFromProject(projectId: number): void {
    const subscription = `project-${projectId}`;

    if (this.subscriptions.has(subscription)) {
      this.subscriptions.delete(subscription);

      this.send({
        type: "UNSUBSCRIBE",
        data: { subscription: `project-${projectId}` },
        timestamp: new Date().toISOString(),
      });
    }
  }

  public unsubscribeFromTask(taskId: number): void {
    const subscription = `task-${taskId}`;

    if (this.subscriptions.has(subscription)) {
      this.subscriptions.delete(subscription);

      this.send({
        type: "UNSUBSCRIBE",
        data: { subscription: `task-${taskId}` },
        timestamp: new Date().toISOString(),
      });
    }
  }

  public disconnect(): void {
    this.stopHeartbeat();
    this.subscriptions.clear();

    if (this.ws) {
      this.ws.close(1000, "Client disconnecting");
      this.ws = null;
    }

    this.activityCallbacks.clear();
    this.connectionCallbacks.clear();
    this.reconnectAttempts = this.maxReconnectAttempts;
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
    return this.ws?.readyState === WebSocket.OPEN;
  }

  public getConnectionState():
    | "connecting"
    | "connected"
    | "disconnected"
    | "error" {
    if (this.isConnecting) return "connecting";
    if (this.ws?.readyState === WebSocket.OPEN) return "connected";
    if (this.ws?.readyState === WebSocket.CONNECTING) return "connecting";
    return "disconnected";
  }
}

export const websocketService = new NativeWebSocketService();
