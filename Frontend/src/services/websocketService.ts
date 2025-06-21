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
  targetEntity?: string;
  targetEntityId?: number;
  iconType?: string;
  priority?: string;
  color?: string;
}

export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface ProjectSubscription {
  projectId: number;
  subscriptionId: string;
  callbacks: Set<(activity: ActivityUpdate) => void>;
}

const STORAGE_KEY = "devflow_project_activities";
const STORAGE_EXPIRY = 24 * 60 * 60 * 1000;

interface StoredActivities {
  [projectId: string]: {
    activities: ActivityUpdate[];
    lastUpdated: number;
  };
}

class EnhancedWebSocketService {
  private static instance: EnhancedWebSocketService;
  private client: Client | null = null;
  private connectionState: ConnectionState = "disconnected";
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  private globalActivityCallbacks: Set<(activity: ActivityUpdate) => void> =
    new Set();

  private projectSubscriptions: Map<number, ProjectSubscription> = new Map();

  private connectionCallbacks: Set<(state: ConnectionState) => void> =
    new Set();

  private projectActivities: Map<number, ActivityUpdate[]> = new Map();

  private isGlobalSubscribed = false;
  private globalSubscriptionId: string | null = null;
  private lastHeartbeatTime: number = 0;
  private authCheckInterval: NodeJS.Timeout | null = null;

  private activeTabs: Set<string> = new Set();
  private hasVisibleTab = true;
  private visibilityCheckInterval: NodeJS.Timeout | null = null;

  private messageQueue: ActivityUpdate[] = [];
  private maxQueueSize = 100;
  private maxActivitiesPerProject = 100;

  private constructor() {
    this.loadStoredActivities();
    this.setupAuthListener();
    this.setupTabVisibilityTracking();
    this.setupUnloadListener();
    this.startHeartbeat();
    this.setupStorageCleanup();
  }

  public static getInstance(): EnhancedWebSocketService {
    if (!EnhancedWebSocketService.instance) {
      EnhancedWebSocketService.instance = new EnhancedWebSocketService();
    }
    return EnhancedWebSocketService.instance;
  }

  private loadStoredActivities(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedData: StoredActivities = JSON.parse(stored);
        const now = Date.now();

        Object.entries(parsedData).forEach(([projectIdStr, data]) => {
          if (now - data.lastUpdated < STORAGE_EXPIRY) {
            const projectId = parseInt(projectIdStr);
            this.projectActivities.set(projectId, data.activities);
          }
        });
      }
    } catch (error) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  private saveProjectActivities(projectId: number): void {
    try {
      const activities = this.projectActivities.get(projectId) || [];
      const stored = localStorage.getItem(STORAGE_KEY);
      let data: StoredActivities = {};

      if (stored) {
        try {
          data = JSON.parse(stored);
        } catch (e) {
          data = {};
        }
      }

      data[projectId.toString()] = {
        activities: activities.slice(0, this.maxActivitiesPerProject),
        lastUpdated: Date.now(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      // Silent fail
    }
  }

  private setupStorageCleanup(): void {
    const cleanup = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const data: StoredActivities = JSON.parse(stored);
          const now = Date.now();
          const cleaned: StoredActivities = {};

          Object.entries(data).forEach(([projectId, projectData]) => {
            if (now - projectData.lastUpdated < STORAGE_EXPIRY) {
              cleaned[projectId] = projectData;
            }
          });

          localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
        }
      } catch (error) {
        // Silent fail
      }
    };

    setInterval(cleanup, 60 * 60 * 1000);
  }

  public getProjectActivities(projectId: number): ActivityUpdate[] {
    return this.projectActivities.get(projectId) || [];
  }

  private addProjectActivity(
    projectId: number,
    activity: ActivityUpdate
  ): void {
    const activities = this.projectActivities.get(projectId) || [];

    const exists = activities.some(
      (existing) =>
        existing.id === activity.id ||
        existing.activityId === activity.activityId
    );

    if (!exists) {
      const updated = [activity, ...activities].slice(
        0,
        this.maxActivitiesPerProject
      );
      this.projectActivities.set(projectId, updated);
      this.saveProjectActivities(projectId);
    }
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

  public onGlobalActivityUpdate(
    callback: (activity: ActivityUpdate) => void
  ): () => void {
    this.globalActivityCallbacks.add(callback);

    if (this.isConnected() && !this.isGlobalSubscribed) {
      this.subscribeToGlobalActivities();
    }

    return () => {
      this.globalActivityCallbacks.delete(callback);

      if (this.globalActivityCallbacks.size === 0 && this.isGlobalSubscribed) {
        this.unsubscribeFromGlobalActivities();
      }
    };
  }

  public onProjectActivityUpdate(
    projectId: number,
    callback: (activity: ActivityUpdate) => void
  ): () => void {
    let subscription = this.projectSubscriptions.get(projectId);

    if (!subscription) {
      subscription = {
        projectId,
        subscriptionId: "",
        callbacks: new Set(),
      };
      this.projectSubscriptions.set(projectId, subscription);

      if (this.isConnected()) {
        this.subscribeToProjectActivities(projectId);
      }
    }

    subscription.callbacks.add(callback);

    const storedActivities = this.getProjectActivities(projectId);
    if (storedActivities.length > 0) {
      setTimeout(() => {
        storedActivities.forEach((activity) => {
          try {
            callback(activity);
          } catch (error) {
            // Silent fail
          }
        });
      }, 0);
    }

    return () => {
      const sub = this.projectSubscriptions.get(projectId);
      if (sub) {
        sub.callbacks.delete(callback);

        if (sub.callbacks.size === 0) {
          this.unsubscribeFromProjectActivities(projectId);
          this.projectSubscriptions.delete(projectId);
        }
      }
    };
  }

  private subscribeToGlobalActivities(): void {
    if (!this.client?.connected || this.isGlobalSubscribed) {
      return;
    }

    try {
      const authState = useAuthStore.getState();
      const username = authState.user?.username || "unknown";
      const destination = `/user/${username}/queue/activities/global`;

      const subscription = this.client.subscribe(
        destination,
        (message: Message) => {
          this.handleGlobalActivityMessage(message);
        },
        this.getAuthHeaders()
      );

      this.client.publish({
        destination: "/app/subscribe/global",
        body: JSON.stringify({
          scope: "global",
          lastSeen: new Date().toISOString(),
        }),
        headers: this.getAuthHeaders(),
      });

      this.isGlobalSubscribed = true;
      this.globalSubscriptionId = subscription.id;
    } catch (error) {
      // Silent fail
    }
  }

  private subscribeToProjectActivities(projectId: number): void {
    if (!this.client?.connected) {
      return;
    }

    const subscription = this.projectSubscriptions.get(projectId);
    if (!subscription || subscription.subscriptionId) {
      return;
    }

    try {
      const authState = useAuthStore.getState();
      const username = authState.user?.username || "unknown";
      const destination = `/user/${username}/queue/activities/project/${projectId}`;

      const clientSubscription = this.client.subscribe(
        destination,
        (message: Message) => {
          this.handleProjectActivityMessage(projectId, message);
        },
        this.getAuthHeaders()
      );

      this.client.publish({
        destination: `/app/subscribe/project/${projectId}`,
        body: JSON.stringify({
          scope: "project",
          entityId: projectId,
          lastSeen: new Date().toISOString(),
        }),
        headers: this.getAuthHeaders(),
      });

      subscription.subscriptionId = clientSubscription.id;
    } catch (error) {
      // Silent fail
    }
  }

  private unsubscribeFromGlobalActivities(): void {
    if (!this.isGlobalSubscribed || !this.globalSubscriptionId) {
      return;
    }

    try {
      if (this.client?.connected) {
        this.client.publish({
          destination: `/app/unsubscribe/${this.globalSubscriptionId}`,
          headers: this.getAuthHeaders(),
        });
      }

      this.isGlobalSubscribed = false;
      this.globalSubscriptionId = null;
    } catch (error) {
      // Silent fail
    }
  }

  private unsubscribeFromProjectActivities(projectId: number): void {
    const subscription = this.projectSubscriptions.get(projectId);
    if (!subscription || !subscription.subscriptionId) {
      return;
    }

    try {
      if (this.client?.connected) {
        this.client.publish({
          destination: `/app/unsubscribe/${subscription.subscriptionId}`,
          headers: this.getAuthHeaders(),
        });
      }
    } catch (error) {
      // Silent fail
    }
  }

  private handleGlobalActivityMessage(message: Message): void {
    try {
      const activity: ActivityUpdate = JSON.parse(message.body);
      this.processActivityMessage(activity, this.globalActivityCallbacks);
    } catch (error) {
      // Silent fail
    }
  }

  private handleProjectActivityMessage(
    projectId: number,
    message: Message
  ): void {
    try {
      const activity: ActivityUpdate = JSON.parse(message.body);

      this.addProjectActivity(projectId, activity);

      const subscription = this.projectSubscriptions.get(projectId);
      if (subscription) {
        this.processActivityMessage(activity, subscription.callbacks);
      }
    } catch (error) {
      // Silent fail
    }
  }

  private processActivityMessage(
    activity: ActivityUpdate,
    callbacks: Set<(activity: ActivityUpdate) => void>
  ): void {
    if (this.hasVisibleTab) {
      this.notifyCallbacks(activity, callbacks);
    } else {
      this.messageQueue.push(activity);

      if (this.messageQueue.length > this.maxQueueSize) {
        this.messageQueue.shift();
      }
    }
  }

  private notifyCallbacks(
    activity: ActivityUpdate,
    callbacks: Set<(activity: ActivityUpdate) => void>
  ): void {
    if ("requestAnimationFrame" in window) {
      requestAnimationFrame(() => {
        callbacks.forEach((callback) => {
          try {
            callback(activity);
          } catch (error) {
            // Silent fail
          }
        });
      });
    } else {
      callbacks.forEach((callback) => {
        try {
          callback(activity);
        } catch (error) {
          // Silent fail
        }
      });
    }
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
        this.globalActivityCallbacks.forEach((callback) => {
          try {
            callback(activity);
          } catch (error) {
            // Silent fail
          }
        });

        if (
          activity.project &&
          typeof activity.project === "object" &&
          activity.project.id
        ) {
          const subscription = this.projectSubscriptions.get(
            activity.project.id
          );
          if (subscription) {
            subscription.callbacks.forEach((callback) => {
              try {
                callback(activity);
              } catch (error) {
                // Silent fail
              }
            });
          }
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
        // Silent fail
      }
    }
  }

  public clearProjectActivities(projectId: number): void {
    this.projectActivities.delete(projectId);

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: StoredActivities = JSON.parse(stored);
        delete data[projectId.toString()];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    } catch (error) {
      // Silent fail
    }
  }

  public clearAllStoredActivities(): void {
    this.projectActivities.clear();
    localStorage.removeItem(STORAGE_KEY);
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
        this.resubscribeAll();
      },
      onDisconnect: (frame) => {
        this.resetSubscriptions();
        this.setConnectionState("disconnected");
        this.scheduleReconnect();
      },
      onStompError: (frame) => {
        this.setConnectionState("error");
        this.scheduleReconnect();
      },
      onWebSocketError: (error) => {
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

  private resubscribeAll(): void {
    if (this.globalActivityCallbacks.size > 0) {
      this.subscribeToGlobalActivities();
    }

    this.projectSubscriptions.forEach((subscription, projectId) => {
      if (subscription.callbacks.size > 0) {
        subscription.subscriptionId = "";
        this.subscribeToProjectActivities(projectId);
      }
    });
  }

  private resetSubscriptions(): void {
    this.isGlobalSubscribed = false;
    this.globalSubscriptionId = null;

    this.projectSubscriptions.forEach((subscription) => {
      subscription.subscriptionId = "";
    });
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
        // Silent fail
      }
    });
  }

  private setLastHeartbeatTime(time: number): void {
    this.lastHeartbeatTime = time;
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
    this.resetSubscriptions();
    this.reconnectAttempts = 0;

    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }

    this.setConnectionState("disconnected");
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

  public onConnectionStatusChange(
    callback: (state: ConnectionState) => void
  ): () => void {
    this.connectionCallbacks.add(callback);
    callback(this.connectionState);
    return () => {
      this.connectionCallbacks.delete(callback);
    };
  }

  public onActivityUpdate(
    callback: (activity: ActivityUpdate) => void
  ): () => void {
    return this.onGlobalActivityUpdate(callback);
  }

  public getDebugInfo() {
    return {
      connectionState: this.connectionState,
      isConnected: this.isConnected(),
      isGlobalSubscribed: this.isGlobalSubscribed,
      globalSubscriptionId: this.globalSubscriptionId,
      projectSubscriptions: Array.from(this.projectSubscriptions.entries()).map(
        ([projectId, subscription]) => ({
          projectId,
          subscriptionId: subscription.subscriptionId,
          callbackCount: subscription.callbacks.size,
          storedActivities: this.projectActivities.get(projectId)?.length || 0,
        })
      ),
      storedProjectCount: this.projectActivities.size,
      reconnectAttempts: this.reconnectAttempts,
      shouldBeConnected: this.shouldBeConnected(),
      clientActive: this.client?.active,
      clientConnected: this.client?.connected,
      globalCallbacks: this.globalActivityCallbacks.size,
      connectionCallbacks: this.connectionCallbacks.size,
      activeTabs: this.activeTabs.size,
      hasVisibleTab: this.hasVisibleTab,
      queuedMessages: this.messageQueue.length,
      lastHeartbeat: this.lastHeartbeatTime
        ? new Date(this.lastHeartbeatTime).toISOString()
        : "never",
    };
  }
}

export const websocketService = EnhancedWebSocketService.getInstance();
