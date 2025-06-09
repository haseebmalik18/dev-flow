// src/services/projectService.ts
import api from "../config/api";
import type { ApiResponse } from "../types/auth";

export interface Project {
  id: number;
  name: string;
  description: string;
  status: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  startDate: string | null;
  dueDate: string | null;
  completedDate: string | null;
  color: string;
  progress: number;
  budget: number | null;
  spent: number | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    jobTitle: string | null;
  };
  teamSize: number;
  members: ProjectMember[];
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  healthStatus: "ON_TRACK" | "AT_RISK" | "DELAYED" | "COMPLETED";
}

export interface ProjectMember {
  id: number;
  user: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    jobTitle: string | null;
  };
  role:
    | "OWNER"
    | "ADMIN"
    | "MANAGER"
    | "DEVELOPER"
    | "DESIGNER"
    | "TESTER"
    | "VIEWER";
  joinedAt: string;
  invitedBy: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    jobTitle: string | null;
  } | null;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  startDate?: string;
  dueDate?: string;
  color?: string;
  budget?: number;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  startDate?: string;
  dueDate?: string;
  color?: string;
  budget?: number;
  spent?: number;
  progress?: number;
}

export interface AddMemberRequest {
  usernameOrEmail: string;
  role?: "ADMIN" | "MANAGER" | "DEVELOPER" | "DESIGNER" | "TESTER" | "VIEWER";
}

export interface ProjectStatsResponse {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  averageProgress: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  teamMembersCount: number;
}

export interface ProjectHealthResponse {
  status: "ON_TRACK" | "AT_RISK" | "DELAYED" | "COMPLETED";
  message: string;
  suggestions: string[];
  riskScore: number;
}

export const projectService = {
  // Get user's projects with pagination and search
  getUserProjects: async (
    page = 0,
    size = 10,
    search?: string
  ): Promise<ApiResponse<{ content: Project[]; totalElements: number }>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    if (search) {
      params.append("search", search);
    }
    const response = await api.get(`/projects?${params}`);
    return response.data;
  },

  // Get a specific project by ID
  getProject: async (id: number): Promise<ApiResponse<Project>> => {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },

  // Create a new project
  createProject: async (
    data: CreateProjectRequest
  ): Promise<ApiResponse<Project>> => {
    const response = await api.post("/projects", data);
    return response.data;
  },

  // Update an existing project
  updateProject: async (
    id: number,
    data: UpdateProjectRequest
  ): Promise<ApiResponse<Project>> => {
    const response = await api.put(`/projects/${id}`, data);
    return response.data;
  },

  // Archive a project
  archiveProject: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/projects/${id}`);
    return response.data;
  },

  // Get project members
  getProjectMembers: async (
    id: number
  ): Promise<ApiResponse<ProjectMember[]>> => {
    const response = await api.get(`/projects/${id}/members`);
    return response.data;
  },

  // Add a member to a project
  addMember: async (
    id: number,
    data: AddMemberRequest
  ): Promise<ApiResponse<ProjectMember>> => {
    const response = await api.post(`/projects/${id}/members`, data);
    return response.data;
  },

  // Remove a member from a project
  removeMember: async (
    id: number,
    memberId: number
  ): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/projects/${id}/members/${memberId}`);
    return response.data;
  },

  // Get user project statistics
  getUserProjectStats: async (): Promise<ApiResponse<ProjectStatsResponse>> => {
    const response = await api.get("/projects/stats");
    return response.data;
  },

  // Get project health information
  getProjectHealth: async (
    id: number
  ): Promise<ApiResponse<ProjectHealthResponse>> => {
    const response = await api.get(`/projects/${id}/health`);
    return response.data;
  },
};
