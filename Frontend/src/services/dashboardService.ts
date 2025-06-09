// src/services/dashboardService.ts
import api from "../config/api";
import type { ApiResponse } from "../types/auth";

export interface DashboardStats {
  activeProjects: number;
  activeProjectsChange: number;
  completedTasks: number;
  completedTasksChange: number;
  hoursTracked: string;
  hoursTrackedChange: number;
  teamMembers: number;
  teamMembersChange: number;
  overdueTasks: number;
}

export interface ActivityItem {
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

export interface ProjectSummary {
  id: number;
  name: string;
  description: string;
  status: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  dueDate: string | null;
  color: string;
  progress: number;
  teamSize: number;
  totalTasks: number;
  completedTasks: number;
  healthStatus: "ON_TRACK" | "AT_RISK" | "DELAYED" | "COMPLETED";
  updatedAt: string;
}

export interface TaskOverview {
  stats: {
    total: number;
    todo: number;
    inProgress: number;
    review: number;
    completed: number;
    overdue: number;
  };
  recentTasks: Array<{
    id: number;
    title: string;
    status: string;
    priority: string;
    dueDate: string | null;
    isOverdue: boolean;
    progress: number;
    project: string;
    assignee: {
      name: string;
      initials: string;
      avatar: string | null;
    } | null;
  }>;
}

export interface UserProfile {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar: string | null;
  role: string;
  jobTitle: string | null;
  bio: string | null;
  isVerified: boolean;
  lastLoginAt: string | null;
}

export const dashboardService = {
  getStats: async (): Promise<ApiResponse<DashboardStats>> => {
    const response = await api.get("/dashboard/stats");
    return response.data;
  },

  getRecentActivity: async (): Promise<ApiResponse<ActivityItem[]>> => {
    const response = await api.get("/dashboard/recent-activity");
    return response.data;
  },

  getProjectsOverview: async (): Promise<ApiResponse<ProjectSummary[]>> => {
    const response = await api.get("/dashboard/projects-overview");
    return response.data;
  },

  getTasksOverview: async (): Promise<ApiResponse<TaskOverview>> => {
    const response = await api.get("/dashboard/tasks-overview");
    return response.data;
  },

  getUserProfile: async (): Promise<ApiResponse<UserProfile>> => {
    const response = await api.get("/dashboard/user-profile");
    return response.data;
  },
};
