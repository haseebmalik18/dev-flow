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

class SimpleWebSocketService {
  private client: Client | null = null;
  private isConnecting = false;
  private activityCallbacks: Set<(activity: ActivityUpdate) => void> =
    new Set();
  private connectionCallbacks: Set<(connected: boolean) => void> = new Set();

  constructor() {
    // Setup will happen when connect() is called
  }

  private setupClient(): void {
    const stompConfig: StompConfig = {
      brokerURL: "ws://localhost:3000/ws",

      connectHeaders: this.getAuthHeaders(),

      debug: (str: string) => {
        if (process.env.NODE_ENV === "development") {
          console.log("STOMP:", str);
        }
      },

      // STOMP-specific configuration
      reconnectDelay: 2000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      // Force STOMP protocol
      forceBinaryWSFrames: false,
      appendMissingNULLonIncoming: true,

      onConnect: () => {
        console.log("✅ STOMP WebSocket connected");
        this.isConnecting = false;
        this.notifyConnectionStatus(true);
        this.subscribeToGlobalActivities();
      },

      onDisconnect: () => {
        console.log("❌ STOMP WebSocket disconnected");
        this.notifyConnectionStatus(false);
      },

      onStompError: (frame: any) => {
        console.error("STOMP protocol error:", frame);
        this.notifyConnectionStatus(false);
      },

      onWebSocketError: (error: Event) => {
        console.error("WebSocket transport error:", error);
        this.isConnecting = false;
        this.notifyConnectionStatus(false);
      },

      // Ensure we're using STOMP over WebSocket (not raw WebSocket)
      webSocketFactory: () => {
        const ws = new WebSocket("ws://localhost:3000/ws");
        ws.binaryType = "arraybuffer";
        return ws;
      },
    };

    this.client = new Client(stompConfig);
  }

  private getAuthHeaders(): Record<string, string> {
    const token = useAuthStore.getState().token;
    const headers: Record<string, string> = {};

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      headers["token"] = token;
    }

    return headers;
  }

  private subscribeToGlobalActivities(): void {
    if (!this.client?.connected) {
      console.warn("Cannot subscribe - not connected");
      return;
    }

    try {
      // Send STOMP subscription message to the backend mapping
      const subscription = this.client.subscribe(
        "/user/queue/activities/global",
        (message: Message) => {
          this.handleActivityMessage(message);
        }
      );

      // Also send a STOMP message to trigger the backend subscription
      this.client.publish({
        destination: "/app/subscribe/global",
        body: JSON.stringify({
          scope: "global",
          lastSeen: localStorage.getItem("lastActivitySeen"),
        }),
        headers: this.getAuthHeaders(),
      });

      console.log("✅ Subscribed to global activities via STOMP");
    } catch (error) {
      console.error("❌ Failed to subscribe to activities:", error);
    }
  }

  private handleActivityMessage(message: Message): void {
    try {
      const activity: ActivityUpdate = JSON.parse(message.body);
      console.log("📥 Received activity:", activity);

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

  private notifyConnectionStatus(connected: boolean): void {
    this.connectionCallbacks.forEach((callback) => {
      try {
        callback(connected);
      } catch (error) {
        console.error("Error in connection callback:", error);
      }
    });
  }

  public connect(): void {
    // Check authentication
    const authState = useAuthStore.getState();
    if (!authState.isAuthenticated || !authState.token) {
      console.warn("Cannot connect - user not authenticated");
      return;
    }

    if (this.isConnected() || this.isConnecting) {
      console.log("Already connected or connecting");
      return;
    }

    console.log("🔄 Connecting to WebSocket...");
    this.isConnecting = true;

    if (!this.client) {
      this.setupClient();
    }

    // Update auth headers
    if (this.client) {
      this.client.connectHeaders = this.getAuthHeaders();
      this.client.activate();
    }
  }

  public disconnect(): void {
    console.log("🔄 Disconnecting WebSocket...");

    if (this.client) {
      this.client.deactivate();
    }

    this.activityCallbacks.clear();
    this.connectionCallbacks.clear();
  }

  public isConnected(): boolean {
    return this.client?.connected ?? false;
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

  // TESTING METHODS - Add these for frontend simulation
  public simulateActivity(activityData?: Partial<ActivityUpdate>): void {
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

    // Trigger the same callback that real WebSocket messages would
    this.activityCallbacks.forEach((callback) => {
      try {
        callback(mockActivity);
      } catch (error) {
        console.error("Error in simulated activity callback:", error);
      }
    });
  }

  public simulateRandomActivity(): void {
    const activities = [
      {
        type: "TASK_CREATED",
        description: "Sarah created task 'Update user interface'",
        user: { name: "Sarah Chen", initials: "SC", avatar: null },
        project: "Mobile App",
        task: "Update user interface",
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
      {
        type: "PROJECT_CREATED",
        description: "David created project 'Marketing Website'",
        user: { name: "David Park", initials: "DP", avatar: null },
        project: "Marketing Website",
      },
      {
        type: "MEMBER_ADDED",
        description: "Alex added Lisa to project 'Mobile App'",
        user: { name: "Alex Johnson", initials: "AJ", avatar: null },
        project: "Mobile App",
      },
    ];

    const randomActivity =
      activities[Math.floor(Math.random() * activities.length)];
    this.simulateActivity(randomActivity);
  }
}

export const websocketService = new SimpleWebSocketService();

// Add testing utilities to window in development
if (process.env.NODE_ENV === "development") {
  (window as any).testRealtime = {
    // Test single activity
    triggerActivity: () => {
      websocketService.simulateActivity();
    },

    // Test random activity
    triggerRandom: () => {
      websocketService.simulateRandomActivity();
    },

    // Test multiple activities
    triggerBurst: (count = 5) => {
      console.log(`🚀 Triggering ${count} activities...`);
      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          websocketService.simulateRandomActivity();
        }, i * 1000); // 1 second apart
      }
    },

    // Test connection status
    testConnection: () => {
      console.log("📡 Connection status:", websocketService.isConnected());
    },

    // Test different activity types
    testTypes: () => {
      const types = [
        "TASK_CREATED",
        "TASK_COMPLETED",
        "COMMENT_ADDED",
        "PROJECT_CREATED",
      ];
      console.log("🎯 Testing different activity types...");
      types.forEach((type, index) => {
        setTimeout(() => {
          websocketService.simulateActivity({
            type,
            description: `Test ${type} activity`,
            user: { name: "Test User", initials: "TU", avatar: null },
            project: "Test Project",
          });
        }, index * 2000); // 2 seconds apart
      });
    },

    // Test with custom data
    custom: (data: Partial<ActivityUpdate>) => {
      websocketService.simulateActivity(data);
    },
  };

  console.log("🧪 Realtime testing available in console:");
  console.log("• testRealtime.triggerActivity() - Single test activity");
  console.log("• testRealtime.triggerRandom() - Random activity");
  console.log("• testRealtime.triggerBurst(5) - Multiple activities");
  console.log("• testRealtime.testTypes() - Test different types");
  console.log("• testRealtime.testConnection() - Check connection");
  console.log("• testRealtime.custom({type: 'CUSTOM'}) - Custom activity");
}
