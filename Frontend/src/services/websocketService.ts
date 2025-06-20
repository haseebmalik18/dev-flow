import { Client, StompConfig, type Message } from "@stomp/stompjs";
import { useAuthStore } from "../hooks/useAuthStore";

export interface ActivityUpdate {
  id?: number;
  activityId?: number;
  type: string;
  description?: string;
  displayMessage?: string;
  createdAt?: string;
  timestamp?: string;
  user: {
    name?: string;
    fullName?: string;
    initials: string;
    avatar: string | null;
  };
  project?: string | { name: string; id: number };
  task?: string | { title: string; id: number };
}

export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

class SingletonWebSocketService {
  private static instance: SingletonWebSocketService;
  private client: Client | null = null;
  private connectionState: ConnectionState = "disconnected";
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  private activityCallbacks: Set<(activity: ActivityUpdate) => void> =
    new Set();
  private connectionCallbacks: Set<(state: ConnectionState) => void> =
    new Set();

  private isSubscribed = false;
  private subscriptionId: string | null = null;
  private lastHeartbeatTime: number = 0;
  private authCheckInterval: NodeJS.Timeout | null = null;

  private activeTabs: Set<string> = new Set();
  private hasVisibleTab = true;
  private visibilityCheckInterval: NodeJS.Timeout | null = null;

  private messageQueue: ActivityUpdate[] = [];
  private maxQueueSize = 100;

  private constructor() {
    this.setupAuthListener();
    this.setupTabVisibilityTracking();
    this.setupUnloadListener();
    this.startHeartbeat();
  }

  public static getInstance(): SingletonWebSocketService {
    if (!SingletonWebSocketService.instance) {
      SingletonWebSocketService.instance = new SingletonWebSocketService();
    }
    return SingletonWebSocketService.instance;
  }

  public registerTab(tabId: string): () => void {
    this.activeTabs.add(tabId);
    this.updateVisibilityState();

    return () => {
      this.activeTabs.delete(tabId);
      this.updateVisibilityState();

      if (this.activeTabs.size === 0) {
        setTimeout(() => {
          if (this.activeTabs.size === 0) {
            this.disconnect();
          }
        }, 30000);
      }
    };
  }

  private setupTabVisibilityTracking(): void {
    this.visibilityCheckInterval = setInterval(() => {
      this.updateVisibilityState();
    }, 1000);
  }

  private updateVisibilityState(): void {
    const wasVisible = this.hasVisibleTab;
    this.hasVisibleTab =
      document.visibilityState === "visible" || this.activeTabs.size > 1;

    if (!wasVisible && this.hasVisibleTab && this.messageQueue.length > 0) {
      const messages = [...this.messageQueue];
      this.messageQueue = [];

      messages.forEach((activity) => {
        this.notifyActivityCallbacks(activity);
      });
    }
  }

  private handleActivityMessage(message: Message): void {
    try {
      const activity: ActivityUpdate = JSON.parse(message.body);

      if (this.hasVisibleTab) {
        this.notifyActivityCallbacks(activity);
      } else {
        this.messageQueue.push(activity);

        if (this.messageQueue.length > this.maxQueueSize) {
          this.messageQueue.shift();
        }
      }
    } catch (error) {
      console.error("Failed to parse activity message:", error);
    }
  }

  private notifyActivityCallbacks(activity: ActivityUpdate): void {
    if ("requestAnimationFrame" in window) {
      requestAnimationFrame(() => {
        this.activityCallbacks.forEach((callback) => {
          try {
            callback(activity);
          } catch (error) {
            console.error("Error in activity callback:", error);
          }
        });
      });
    } else {
      this.activityCallbacks.forEach((callback) => {
        try {
          callback(activity);
        } catch (error) {
          console.error("Error in activity callback:", error);
        }
      });
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected() && this.shouldBeConnected()) {
        const heartbeatFrequency = this.hasVisibleTab ? 30000 : 60000;
        const now = Date.now();
        const timeSinceLastHeartbeat = now - this.lastHeartbeatTime;

        if (timeSinceLastHeartbeat >= heartbeatFrequency - 1000) {
          this.sendHeartbeat();
        }
      }
    }, 10000);
  }

  public disconnect(): void {
    [
      this.reconnectTimeout,
      this.heartbeatInterval,
      this.authCheckInterval,
      this.visibilityCheckInterval,
    ].forEach((interval) => {
      if (interval) {
        clearTimeout(interval);
        clearInterval(interval);
      }
    });

    this.reconnectTimeout = null;
    this.heartbeatInterval = null;
    this.authCheckInterval = null;
    this.visibilityCheckInterval = null;

    this.messageQueue = [];
    this.isSubscribed = false;
    this.subscriptionId = null;
    this.reconnectAttempts = 0;

    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }

    this.setConnectionState("disconnected");
  }

  public getDebugInfo() {
    return {
      connectionState: this.connectionState,
      isConnected: this.isConnected(),
      isSubscribed: this.isSubscribed,
      subscriptionId: this.subscriptionId,
      reconnectAttempts: this.reconnectAttempts,
      shouldBeConnected: this.shouldBeConnected(),
      clientActive: this.client?.active,
      clientConnected: this.client?.connected,
      activeCallbacks: this.activityCallbacks.size,
      connectionCallbacks: this.connectionCallbacks.size,
      activeTabs: this.activeTabs.size,
      hasVisibleTab: this.hasVisibleTab,
      queuedMessages: this.messageQueue.length,
      lastHeartbeat: this.lastHeartbeatTime
        ? new Date(this.lastHeartbeatTime).toISOString()
        : "never",
    };
  }

  private setupAuthListener(): void {
    let lastToken: string | null = null;
    let lastAuthState = false;

    const checkAuthState = () => {
      const authState = useAuthStore.getState();
      const currentToken = authState.token;
      const currentAuthState = authState.isAuthenticated;

      if (currentToken !== lastToken || currentAuthState !== lastAuthState) {
        lastToken = currentToken;
        lastAuthState = currentAuthState;

        if (currentToken && currentAuthState && this.activeTabs.size > 0) {
          this.connect();
        } else {
          this.disconnect();
        }
      }
    };

    this.authCheckInterval = setInterval(checkAuthState, 1000);
  }

  private setupUnloadListener(): void {
    window.addEventListener("beforeunload", () => {
      if (this.activeTabs.size <= 1) {
        this.disconnect();
      }
    });
  }

  private shouldBeConnected(): boolean {
    const authState = useAuthStore.getState();
    return (
      authState.isAuthenticated && !!authState.token && this.activeTabs.size > 0
    );
  }

  private getAuthHeaders(): Record<string, string> {
    const authState = useAuthStore.getState();
    const token = authState.token;
    const headers: Record<string, string> = {};

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      headers["token"] = token;
    }

    return headers;
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.notifyConnectionStatus(state);
    }
  }

  private setupClient(): void {
    if (this.client) {
      this.client.deactivate();
    }

    const wsUrl =
      process.env.NODE_ENV === "development"
        ? "ws://localhost:3000/ws"
        : `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${
            window.location.host
          }/ws`;

    const stompConfig: StompConfig = {
      brokerURL: wsUrl,
      connectHeaders: this.getAuthHeaders(),
      reconnectDelay: 2000,
      heartbeatIncoming: 30000,
      heartbeatOutgoing: 30000,
      onConnect: (frame) => {
        this.reconnectAttempts = 0;
        this.setConnectionState("connected");
        this.subscribeToActivities();
      },
      onDisconnect: (frame) => {
        this.isSubscribed = false;
        this.subscriptionId = null;
        this.setConnectionState("disconnected");
        this.scheduleReconnect();
      },
      onStompError: (frame) => {
        console.error("STOMP protocol error:", frame);
        this.setConnectionState("error");
        this.scheduleReconnect();
      },
      onWebSocketError: (error) => {
        console.error("WebSocket transport error:", error);
        this.setConnectionState("error");
        this.scheduleReconnect();
      },
      onWebSocketClose: (event) => {
        this.setConnectionState("disconnected");
        this.scheduleReconnect();
      },
    };

    this.client = new Client(stompConfig);
  }

  private subscribeToActivities(): void {
    if (!this.client?.connected || this.isSubscribed) {
      return;
    }

    try {
      const authState = useAuthStore.getState();
      const username = authState.user?.username || "unknown";
      const destination = `/user/${username}/queue/activities/global`;

      const subscription = this.client.subscribe(
        destination,
        (message: Message) => {
          this.handleActivityMessage(message);
        },
        this.getAuthHeaders()
      );

      this.client.publish({
        destination: "/app/subscribe/global",
        body: JSON.stringify({
          scope: "global",
        }),
        headers: this.getAuthHeaders(),
      });

      this.isSubscribed = true;
      this.subscriptionId = subscription.id;
    } catch (error) {
      console.error("Failed to subscribe to activities:", error);
      this.setConnectionState("error");
    }
  }

  private scheduleReconnect(): void {
    if (
      !this.shouldBeConnected() ||
      this.reconnectAttempts >= this.maxReconnectAttempts
    ) {
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    const delay = Math.min(2000 * Math.pow(2, this.reconnectAttempts), 30000);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  private notifyConnectionStatus(state: ConnectionState): void {
    this.connectionCallbacks.forEach((callback) => {
      try {
        callback(state);
      } catch (error) {
        console.error("Error in connection callback:", error);
      }
    });
  }

  public connect(): void {
    if (!this.shouldBeConnected()) {
      return;
    }

    if (
      this.connectionState === "connected" ||
      this.connectionState === "connecting"
    ) {
      return;
    }

    this.setConnectionState("connecting");
    this.setupClient();

    if (this.client) {
      this.client.activate();
    }
  }

  public forceReconnect(): void {
    this.disconnect();
    setTimeout(() => {
      this.connect();
    }, 1000);
  }

  public isConnected(): boolean {
    return (
      this.connectionState === "connected" && this.client?.connected === true
    );
  }

  public getConnectionState(): ConnectionState {
    return this.connectionState;
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
    callback: (state: ConnectionState) => void
  ): () => void {
    this.connectionCallbacks.add(callback);
    callback(this.connectionState);
    return () => {
      this.connectionCallbacks.delete(callback);
    };
  }

  public sendHeartbeat(): void {
    if (this.client?.connected) {
      try {
        const now = Date.now();
        if (now - this.lastHeartbeatTime < 5000) {
          return;
        }

        this.client.publish({
          destination: "/app/heartbeat",
          body: JSON.stringify({
            timestamp: new Date().toISOString(),
          }),
          headers: this.getAuthHeaders(),
        });

        this.setLastHeartbeatTime(now);
      } catch (error) {
        console.error("Failed to send heartbeat:", error);
      }
    }
  }

  private setLastHeartbeatTime(time: number): void {
    this.lastHeartbeatTime = time;
  }
}

export const websocketService = SingletonWebSocketService.getInstance();
