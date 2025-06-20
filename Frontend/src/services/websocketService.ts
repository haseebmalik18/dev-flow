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

class PerformanceOptimizedWebSocketService {
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

  // Track subscription state
  private isSubscribed = false;
  private subscriptionId: string | null = null;

  // Unique tab identifier
  private readonly tabId = Math.random().toString(36).substring(2);

  // ✅ PERFORMANCE: Smart visibility and processing management
  private isTabVisible = true;
  private visibilityChangeHandler: (() => void) | null = null;
  private lastHeartbeatTime: number = 0;
  private authCheckInterval: NodeJS.Timeout | null = null;

  // ✅ PERFORMANCE: Smart message processing with rate limiting
  private messageQueue: ActivityUpdate[] = [];
  private processingInterval: NodeJS.Timeout | null = null;
  private maxQueueSize = 50; // Prevent memory bloat
  private batchProcessingSize = 5; // Process in small batches
  private processingFrequency = 2000; // Process every 2 seconds when hidden

  // ✅ PERFORMANCE: Throttling and rate limiting
  private lastProcessingTime = 0;
  private processingThrottle = 100; // Minimum 100ms between processing batches
  private messageCount = 0;
  private resetCountInterval: NodeJS.Timeout | null = null;

  constructor() {
    console.log(
      `🚀 Performance-optimized WebSocket Service initialized for tab: ${this.tabId}`
    );

    // Initialize visibility state
    this.isTabVisible = document.visibilityState === "visible";

    // Setup all listeners and intervals
    this.setupAuthListener();
    this.setupVisibilityListener();
    this.setupUnloadListener();
    this.startHeartbeat();
    this.startSmartMessageProcessor();
    this.startPerformanceMonitoring();
  }

  // ✅ PERFORMANCE: Smart message processing that adapts to tab visibility
  private startSmartMessageProcessor(): void {
    this.processingInterval = setInterval(
      () => {
        if (this.messageQueue.length > 0) {
          const now = Date.now();

          // ✅ THROTTLING: Don't process too frequently
          if (now - this.lastProcessingTime < this.processingThrottle) {
            return;
          }

          const batchSize = this.isTabVisible
            ? this.messageQueue.length
            : this.batchProcessingSize;
          const messagesToProcess = this.messageQueue.splice(0, batchSize);

          console.log(
            `🔄 Tab ${this.tabId} processing ${messagesToProcess.length} messages (visible: ${this.isTabVisible})`
          );

          // ✅ PERFORMANCE: Use requestIdleCallback for background processing
          if (this.isTabVisible) {
            // Process immediately when visible
            messagesToProcess.forEach((activity) => {
              this.notifyActivityCallbacks(activity);
            });
          } else {
            // Use idle time when tab is hidden
            if ("requestIdleCallback" in window) {
              (window as any).requestIdleCallback(
                () => {
                  messagesToProcess.forEach((activity) => {
                    this.notifyActivityCallbacks(activity);
                  });
                },
                { timeout: 5000 }
              );
            } else {
              // Fallback for browsers without requestIdleCallback
              setTimeout(() => {
                messagesToProcess.forEach((activity) => {
                  this.notifyActivityCallbacks(activity);
                });
              }, 0);
            }
          }

          this.lastProcessingTime = now;
        }
      },
      this.isTabVisible ? 500 : this.processingFrequency
    ); // Faster when visible
  }

  // ✅ PERFORMANCE: Monitor performance and adjust accordingly
  private startPerformanceMonitoring(): void {
    this.resetCountInterval = setInterval(() => {
      if (this.messageCount > 100) {
        console.warn(
          `⚠️ Tab ${this.tabId} high message volume: ${this.messageCount}/minute - adjusting processing`
        );
        // Increase batch size for high volume
        this.batchProcessingSize = Math.min(10, this.batchProcessingSize + 2);
        this.processingFrequency = Math.max(
          1000,
          this.processingFrequency - 500
        );
      } else {
        // Reset to normal processing
        this.batchProcessingSize = 5;
        this.processingFrequency = 2000;
      }

      this.messageCount = 0;
    }, 60000); // Reset every minute
  }

  // ✅ PERFORMANCE: Smart message handling with queue management
  private handleActivityMessage(message: Message): void {
    try {
      const activity: ActivityUpdate = JSON.parse(message.body);
      this.messageCount++;

      console.log(
        `📥 Tab ${this.tabId} received activity (queue: ${this.messageQueue.length})`
      );

      // Update last seen timestamp
      localStorage.setItem("lastActivitySeen", new Date().toISOString());

      if (this.isTabVisible) {
        // ✅ IMMEDIATE: Process right away when tab is visible
        this.notifyActivityCallbacks(activity);
      } else {
        // ✅ QUEUE: Add to queue for background processing
        this.messageQueue.push(activity);

        // ✅ PERFORMANCE: Prevent memory bloat
        if (this.messageQueue.length > this.maxQueueSize) {
          // Remove oldest messages if queue gets too large
          const removed = this.messageQueue.splice(
            0,
            this.messageQueue.length - this.maxQueueSize
          );
          console.warn(
            `⚠️ Tab ${this.tabId} queue overflow - removed ${removed.length} old messages`
          );
        }
      }
    } catch (error) {
      console.error(
        `❌ Failed to parse activity message in tab ${this.tabId}:`,
        error
      );
    }
  }

  // ✅ PERFORMANCE: Throttled callback notifications
  private notifyActivityCallbacks(activity: ActivityUpdate): void {
    // ✅ PERFORMANCE: Batch notifications to prevent UI thrashing
    if ("requestAnimationFrame" in window && this.isTabVisible) {
      requestAnimationFrame(() => {
        this.activityCallbacks.forEach((callback) => {
          try {
            callback(activity);
          } catch (error) {
            console.error(
              `❌ Error in activity callback for tab ${this.tabId}:`,
              error
            );
          }
        });
      });
    } else {
      // Direct notification for background tabs
      this.activityCallbacks.forEach((callback) => {
        try {
          callback(activity);
        } catch (error) {
          console.error(
            `❌ Error in activity callback for tab ${this.tabId}:`,
            error
          );
        }
      });
    }
  }

  // ✅ PERFORMANCE: Smart visibility handling
  private setupVisibilityListener(): void {
    this.visibilityChangeHandler = () => {
      const wasVisible = this.isTabVisible;
      this.isTabVisible = document.visibilityState === "visible";

      if (wasVisible !== this.isTabVisible) {
        console.log(
          `👁️ Tab ${this.tabId} visibility: ${
            wasVisible ? "visible" : "hidden"
          } → ${this.isTabVisible ? "visible" : "hidden"}`
        );

        if (this.isTabVisible && !wasVisible) {
          // ✅ PERFORMANCE: Process queued messages efficiently when tab becomes visible
          if (this.messageQueue.length > 0) {
            console.log(
              `🔄 Tab ${this.tabId} became visible - processing ${this.messageQueue.length} queued messages`
            );

            // Process all queued messages in small batches to avoid UI freeze
            const processInBatches = () => {
              const batch = this.messageQueue.splice(0, 10); // Process 10 at a time
              if (batch.length > 0) {
                batch.forEach((activity) =>
                  this.notifyActivityCallbacks(activity)
                );

                if (this.messageQueue.length > 0) {
                  // Schedule next batch
                  setTimeout(processInBatches, 50);
                }
              }
            };

            processInBatches();
          }

          // ✅ PERFORMANCE: Update processing frequency for visible tab
          if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.startSmartMessageProcessor();
          }

          // Check connection after a delay
          setTimeout(() => {
            if (this.shouldBeConnected() && !this.isConnected()) {
              console.log(
                `🔄 Tab ${this.tabId} became visible - checking connection`
              );
              this.connect();
            }
          }, 1000);
        } else if (!this.isTabVisible && wasVisible) {
          // ✅ PERFORMANCE: Reduce processing frequency for hidden tab
          if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.startSmartMessageProcessor();
          }
        }
      }
    };

    document.addEventListener("visibilitychange", this.visibilityChangeHandler);
  }

  // ✅ PERFORMANCE: Adaptive heartbeat based on tab visibility
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected() && this.shouldBeConnected()) {
        // ✅ PERFORMANCE: Reduce heartbeat frequency for hidden tabs
        const heartbeatFrequency = this.isTabVisible ? 30000 : 60000; // 30s visible, 60s hidden

        const now = Date.now();
        const timeSinceLastHeartbeat = now - this.lastHeartbeatTime;

        if (timeSinceLastHeartbeat >= heartbeatFrequency - 1000) {
          // 1s tolerance
          console.log(
            `💓 Tab ${this.tabId} sending heartbeat (visible: ${this.isTabVisible})`
          );
          this.sendHeartbeat();
        }
      }
    }, 10000); // Check every 10 seconds
  }

  // ✅ PERFORMANCE: Comprehensive cleanup to prevent memory leaks
  public disconnect(): void {
    console.log(`🔄 Tab ${this.tabId} disconnecting WebSocket...`);

    // Clear all intervals
    [
      this.reconnectTimeout,
      this.heartbeatInterval,
      this.authCheckInterval,
      this.processingInterval,
      this.resetCountInterval,
    ].forEach((interval) => {
      if (interval) {
        clearTimeout(interval);
        clearInterval(interval);
      }
    });

    // Reset all interval references
    this.reconnectTimeout = null;
    this.heartbeatInterval = null;
    this.authCheckInterval = null;
    this.processingInterval = null;
    this.resetCountInterval = null;

    // Clean up event listeners
    if (this.visibilityChangeHandler) {
      document.removeEventListener(
        "visibilitychange",
        this.visibilityChangeHandler
      );
      this.visibilityChangeHandler = null;
    }

    // Clear message queue to free memory
    this.messageQueue = [];

    // Reset state
    this.isSubscribed = false;
    this.subscriptionId = null;
    this.reconnectAttempts = 0;
    this.messageCount = 0;

    // Disconnect client
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }

    this.setConnectionState("disconnected");
  }

  // ✅ PERFORMANCE: Enhanced debug info with performance metrics
  public getDebugInfo(): object {
    return {
      tabId: this.tabId,
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
      isTabVisible: this.isTabVisible,

      // ✅ PERFORMANCE METRICS
      queuedMessages: this.messageQueue.length,
      maxQueueSize: this.maxQueueSize,
      batchProcessingSize: this.batchProcessingSize,
      processingFrequency: this.processingFrequency,
      messageCount: this.messageCount,
      lastProcessingTime: this.lastProcessingTime,

      lastHeartbeat: this.lastHeartbeatTime
        ? new Date(this.lastHeartbeatTime).toISOString()
        : "never",
      heartbeatIntervalActive: !!this.heartbeatInterval,
      authCheckIntervalActive: !!this.authCheckInterval,
      processingIntervalActive: !!this.processingInterval,
      visibilityHandlerActive: !!this.visibilityChangeHandler,
    };
  }

  // ✅ REST OF METHODS: Keep existing methods unchanged
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

        if (currentToken && currentAuthState) {
          this.connect();
        } else {
          this.disconnect();
        }
      }
    };

    this.authCheckInterval = setInterval(checkAuthState, 1000); // Check every second
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
      headers["X-Tab-ID"] = this.tabId;
    }

    return headers;
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      console.log(
        `🔗 Tab ${this.tabId} connection state: ${this.connectionState} → ${state}`
      );
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
      debug: (str: string) => {
        if (process.env.NODE_ENV === "development") {
          console.log(`STOMP[${this.tabId}]:`, str);
        }
      },
      reconnectDelay: 2000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: (frame) => {
        console.log(`✅ WebSocket connected for tab ${this.tabId}`);
        this.reconnectAttempts = 0;
        this.setConnectionState("connected");
        this.subscribeToActivities();
      },
      onDisconnect: (frame) => {
        console.log(`❌ WebSocket disconnected for tab ${this.tabId}`);
        this.isSubscribed = false;
        this.subscriptionId = null;
        this.setConnectionState("disconnected");
        this.scheduleReconnect();
      },
      onStompError: (frame) => {
        console.error(`STOMP protocol error for tab ${this.tabId}:`, frame);
        this.setConnectionState("error");
        this.scheduleReconnect();
      },
      onWebSocketError: (error) => {
        console.error(
          `WebSocket transport error for tab ${this.tabId}:`,
          error
        );
        this.setConnectionState("error");
        this.scheduleReconnect();
      },
      onWebSocketClose: (event) => {
        console.log(
          `WebSocket closed for tab ${this.tabId}:`,
          event.code,
          event.reason
        );
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
      console.log(`📡 Tab ${this.tabId} subscribing to global activities...`);

      const subscription = this.client.subscribe(
        "/user/queue/activities/global",
        (message: Message) => {
          this.handleActivityMessage(message);
        },
        this.getAuthHeaders()
      );

      this.client.publish({
        destination: "/app/subscribe/global",
        body: JSON.stringify({
          scope: "global",
          tabId: this.tabId,
          lastSeen: localStorage.getItem("lastActivitySeen") || null,
        }),
        headers: this.getAuthHeaders(),
      });

      this.isSubscribed = true;
      this.subscriptionId = subscription.id;
      console.log(`✅ Tab ${this.tabId} successfully subscribed to activities`);
    } catch (error) {
      console.error(
        `❌ Tab ${this.tabId} failed to subscribe to activities:`,
        error
      );
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
        console.error(
          `Error in connection callback for tab ${this.tabId}:`,
          error
        );
      }
    });
  }

  public connect(): void {
    if (!this.shouldBeConnected()) {
      console.warn(
        `❌ Tab ${this.tabId} cannot connect - user not authenticated`
      );
      return;
    }

    if (
      this.connectionState === "connected" ||
      this.connectionState === "connecting"
    ) {
      return;
    }

    console.log(`🔄 Tab ${this.tabId} connecting to WebSocket...`);
    this.setConnectionState("connecting");
    this.setupClient();

    if (this.client) {
      this.client.activate();
    }
  }

  public forceReconnect(): void {
    console.log(`🔄 Tab ${this.tabId} force reconnecting WebSocket...`);
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
            tabId: this.tabId,
          }),
          headers: this.getAuthHeaders(),
        });

        this.setLastHeartbeatTime(now);
      } catch (error) {
        console.error(`Failed to send heartbeat for tab ${this.tabId}:`, error);
      }
    }
  }

  private setLastHeartbeatTime(time: number): void {
    this.lastHeartbeatTime = time;
  }

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

    this.handleActivityMessage({
      body: JSON.stringify(mockActivity),
    } as Message);
  }
}

// Create singleton instance
export const websocketService = new PerformanceOptimizedWebSocketService();

// Development testing utilities
if (process.env.NODE_ENV === "development") {
  (window as any).wsDebug = {
    connect: () => websocketService.connect(),
    disconnect: () => websocketService.disconnect(),
    forceReconnect: () => websocketService.forceReconnect(),
    status: () => websocketService.getConnectionState(),
    isConnected: () => websocketService.isConnected(),
    debug: () => console.table(websocketService.getDebugInfo()),
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
    triggerBurst: (count = 5) => {
      console.log(`🚀 Triggering ${count} activities...`);
      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          (window as any).wsDebug.triggerRandom();
        }, i * 1000);
      }
    },
    heartbeat: () => websocketService.sendHeartbeat(),
  };
}
