import { Client, StompConfig, type Message } from "@stomp/stompjs";
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

export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

class EnhancedWebSocketService {
  private client: Client | null = null;
  private connectionState: ConnectionState = "disconnected";
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  private activityCallbacks: Set<(activity: ActivityUpdate) => void> =
    new Set();
  private connectionCallbacks: Set<(state: ConnectionState) => void> =
    new Set();

  // Track subscription state
  private isSubscribed = false;
  private subscriptionId: string | null = null;

  constructor() {
    // Listen for auth state changes
    this.setupAuthListener();

    // Handle page visibility changes
    this.setupVisibilityListener();

    // Handle browser tab/window close
    this.setupUnloadListener();
  }

  private setupAuthListener(): void {
    // Listen for auth state changes from useAuthStore
    let lastToken: string | null = null;

    const checkAuthState = () => {
      const authState = useAuthStore.getState();
      const currentToken = authState.token;

      if (currentToken !== lastToken) {
        lastToken = currentToken;

        if (currentToken && authState.isAuthenticated) {
          // User logged in or token refreshed
          console.log("🔄 Auth state changed - reconnecting WebSocket");
          this.connect();
        } else {
          // User logged out
          console.log("🔄 User logged out - disconnecting WebSocket");
          this.disconnect();
        }
      }
    };

    // Check periodically for auth changes
    setInterval(checkAuthState, 1000);
  }

  private setupVisibilityListener(): void {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        // Tab became visible - ensure connection is active
        if (this.shouldBeConnected() && !this.isConnected()) {
          console.log("🔄 Tab visible - reconnecting WebSocket");
          this.connect();
        }
      }
    });
  }

  private setupUnloadListener(): void {
    window.addEventListener("beforeunload", () => {
      this.disconnect();
    });
  }

  private shouldBeConnected(): boolean {
    const authState = useAuthStore.getState();
    return authState.isAuthenticated && !!authState.token;
  }

  private getAuthHeaders(): Record<string, string> {
    const authState = useAuthStore.getState();
    const token = authState.token;
    const headers: Record<string, string> = {};

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      headers["token"] = token;
    }

    console.log("🔑 Using auth headers:", Object.keys(headers));
    return headers;
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      console.log(`🔗 Connection state: ${this.connectionState} → ${state}`);
      this.connectionState = state;
      this.notifyConnectionStatus(state);
    }
  }

  private setupClient(): void {
    if (this.client) {
      this.client.deactivate();
    }

    const stompConfig: StompConfig = {
      brokerURL: `ws://${window.location.hostname}:3000/ws`,

      connectHeaders: this.getAuthHeaders(),

      debug: (str: string) => {
        if (process.env.NODE_ENV === "development") {
          console.log("STOMP:", str);
        }
      },

      reconnectDelay: 2000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,

      onConnect: (frame) => {
        console.log("✅ WebSocket connected successfully");
        this.reconnectAttempts = 0;
        this.setConnectionState("connected");
        this.subscribeToActivities();
      },

      onDisconnect: (frame) => {
        console.log("❌ WebSocket disconnected");
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
        console.log("WebSocket closed:", event.code, event.reason);
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
      console.log("📡 Subscribing to global activities...");

      // Subscribe to the user-specific queue for global activities
      const subscription = this.client.subscribe(
        "/user/queue/activities/global",
        (message: Message) => {
          this.handleActivityMessage(message);
        }
      );

      // Send subscription request to backend
      this.client.publish({
        destination: "/app/subscribe/global",
        body: JSON.stringify({
          scope: "global",
          lastSeen: localStorage.getItem("lastActivitySeen") || null,
        }),
        headers: this.getAuthHeaders(),
      });

      this.isSubscribed = true;
      this.subscriptionId = subscription.id;
      console.log("✅ Successfully subscribed to activities");
    } catch (error) {
      console.error("❌ Failed to subscribe to activities:", error);
      this.setConnectionState("error");
    }
  }

  private handleActivityMessage(message: Message): void {
    try {
      const activity: ActivityUpdate = JSON.parse(message.body);
      console.log("📥 Received real-time activity:", activity);

      // Update last seen timestamp
      localStorage.setItem("lastActivitySeen", new Date().toISOString());

      // Notify all listeners
      this.activityCallbacks.forEach((callback) => {
        try {
          callback(activity);
        } catch (error) {
          console.error("Error in activity callback:", error);
        }
      });
    } catch (error) {
      console.error("Failed to parse activity message:", error);
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
    console.log(
      `🔄 Scheduling reconnect in ${delay}ms (attempt ${
        this.reconnectAttempts + 1
      })`
    );

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

  // Public API
  public connect(): void {
    if (!this.shouldBeConnected()) {
      console.warn("❌ Cannot connect - user not authenticated");
      return;
    }

    if (
      this.connectionState === "connected" ||
      this.connectionState === "connecting"
    ) {
      console.log("Already connected or connecting");
      return;
    }

    console.log("🔄 Connecting to WebSocket...");
    this.setConnectionState("connecting");

    this.setupClient();

    if (this.client) {
      this.client.activate();
    }
  }

  public disconnect(): void {
    console.log("🔄 Disconnecting WebSocket...");

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.isSubscribed = false;
    this.subscriptionId = null;
    this.reconnectAttempts = 0;

    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }

    this.setConnectionState("disconnected");
  }

  public forceReconnect(): void {
    console.log("🔄 Force reconnecting WebSocket...");
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
    // Immediately call with current state
    callback(this.connectionState);
    return () => {
      this.connectionCallbacks.delete(callback);
    };
  }

  // Send heartbeat to keep connection alive
  public sendHeartbeat(): void {
    if (this.client?.connected) {
      try {
        this.client.publish({
          destination: "/app/heartbeat",
          body: JSON.stringify({
            timestamp: new Date().toISOString(),
          }),
          headers: this.getAuthHeaders(),
        });
      } catch (error) {
        console.error("Failed to send heartbeat:", error);
      }
    }
  }

  // Development testing methods
  public simulateActivity(activityData?: Partial<ActivityUpdate>): void {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    const mockActivity: ActivityUpdate = {
      id: Date.now(),
      type: "TASK_COMPLETED",
      description: "John completed task 'Fix login bug'",
      createdAt: new Date().toISOString(),
      user: {
        name: "John Doe",
        initials: "JD",
        avatar: null,
      },
      project: "E-commerce Platform",
      task: "Fix login bug",
      ...activityData,
    };

    console.log("🧪 Simulating activity:", mockActivity);
    this.activityCallbacks.forEach((callback) => {
      try {
        callback(mockActivity);
      } catch (error) {
        console.error("Error in simulated activity callback:", error);
      }
    });
  }

  public getDebugInfo(): object {
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
    };
  }
}

// Create singleton instance
export const websocketService = new EnhancedWebSocketService();

// Development testing utilities
if (process.env.NODE_ENV === "development") {
  (window as any).wsDebug = {
    // Connection controls
    connect: () => websocketService.connect(),
    disconnect: () => websocketService.disconnect(),
    forceReconnect: () => websocketService.forceReconnect(),

    // Status checks
    status: () => websocketService.getConnectionState(),
    isConnected: () => websocketService.isConnected(),
    debug: () => console.table(websocketService.getDebugInfo()),

    // Test activities
    triggerActivity: () => websocketService.simulateActivity(),
    triggerRandom: () => {
      const activities = [
        {
          type: "PROJECT_CREATED",
          description: "Sarah created project 'Marketing Website'",
          user: { name: "Sarah Chen", initials: "SC", avatar: null },
          project: "Marketing Website",
        },
        {
          type: "TASK_ASSIGNED",
          description: "Mike assigned task 'Database optimization' to Emma",
          user: { name: "Mike Rodriguez", initials: "MR", avatar: null },
          project: "Backend API",
          task: "Database optimization",
        },
        {
          type: "COMMENT_ADDED",
          description: "Emma commented on task 'Fix payment gateway'",
          user: { name: "Emma Wilson", initials: "EW", avatar: null },
          project: "E-commerce Platform",
          task: "Fix payment gateway",
        },
      ];
      const random = activities[Math.floor(Math.random() * activities.length)];
      websocketService.simulateActivity(random);
    },

    // Burst testing
    triggerBurst: (count = 5) => {
      console.log(`🚀 Triggering ${count} activities...`);
      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          (window as any).wsDebug.triggerRandom();
        }, i * 1000);
      }
    },

    // Heartbeat test
    heartbeat: () => websocketService.sendHeartbeat(),
  };

  console.log("🧪 WebSocket debugging available in console:");
  console.log("• wsDebug.status() - Connection status");
  console.log("• wsDebug.debug() - Debug information");
  console.log("• wsDebug.connect() - Force connect");
  console.log("• wsDebug.disconnect() - Force disconnect");
  console.log("• wsDebug.forceReconnect() - Force reconnect");
  console.log("• wsDebug.triggerActivity() - Test activity");
  console.log("• wsDebug.triggerRandom() - Random activity");
  console.log("• wsDebug.triggerBurst(5) - Multiple activities");
}
