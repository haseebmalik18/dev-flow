import api from "../config/api";
import type { ApiResponse } from "../types/auth";

export interface TaskSummary {
  id: number;
  title: string;
  description: string;
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  dueDate: string | null;
  progress: number;
  isOverdue: boolean;
  isBlocked: boolean;
  updatedAt: string;
  assignee: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    jobTitle: string | null;
  } | null;
  project: {
    id: number;
    name: string;
    color: string;
  };
  tagList: string[];
}

export interface TaskResponse {
  id: number;
  title: string;
  description: string;
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  dueDate: string | null;
  completedDate: string | null;
  tags: string | null;
  storyPoints: number | null;
  progress: number;
  isArchived: boolean;
  isOverdue: boolean;
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    jobTitle: string | null;
  };
  assignee: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    jobTitle: string | null;
  } | null;
  project: {
    id: number;
    name: string;
    color: string;
  };
  subtasks: TaskResponse[];
  parentTask: TaskResponse | null;
  dependencies: TaskResponse[];
  dependentTasks: TaskResponse[];
  commentsCount: number;
  tagList: string[];
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  assigneeId?: number;
  dueDate?: string;
  storyPoints?: number;
  tags?: string;
  parentTaskId?: number;
  dependencyIds?: number[];
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "CANCELLED";
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  assigneeId?: number;
  dueDate?: string;
  storyPoints?: number;
  tags?: string;
  progress?: number;
  dependencyIds?: number[];
}

export interface TaskFilterRequest {
  status?: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "CANCELLED";
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  assigneeId?: number;
  projectId?: number;
  isOverdue?: boolean;
  isBlocked?: boolean;
  tags?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  search?: string;
}

export interface BulkTaskUpdateRequest {
  taskIds: number[];
  status?: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "CANCELLED";
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  assigneeId?: number;
  tags?: string;
}

export interface TaskStatsResponse {
  totalTasks: number;
  todoTasks: number;
  inProgressTasks: number;
  reviewTasks: number;
  completedTasks: number;
  overdueTasks: number;
  blockedTasks: number;
  averageProgress: number;
}

export const taskService = {
  createTask: async (
    projectId: number,
    data: CreateTaskRequest
  ): Promise<ApiResponse<TaskResponse>> => {
    const response = await api.post(`/tasks/projects/${projectId}`, data);
    return response.data;
  },

  getTask: async (id: number): Promise<ApiResponse<TaskResponse>> => {
    const response = await api.get(`/tasks/${id}`);
    return response.data;
  },

  updateTask: async (
    id: number,
    data: UpdateTaskRequest
  ): Promise<ApiResponse<TaskResponse>> => {
    const response = await api.put(`/tasks/${id}`, data);
    return response.data;
  },

  deleteTask: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/tasks/${id}`);
    return response.data;
  },

  getProjectTasks: async (
    projectId: number,
    page = 0,
    size = 20,
    filters?: TaskFilterRequest
  ): Promise<
    ApiResponse<{
      content: TaskSummary[];
      totalElements: number;
      totalPages: number;
    }>
  > => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, value.toString());
        }
      });
    }

    const response = await api.get(`/tasks/projects/${projectId}?${params}`);
    return response.data;
  },

  getAssignedTasks: async (
    page = 0,
    size = 20,
    filters?: TaskFilterRequest
  ): Promise<
    ApiResponse<{
      content: TaskSummary[];
      totalElements: number;
      totalPages: number;
    }>
  > => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, value.toString());
        }
      });
    }

    const response = await api.get(`/tasks/assigned?${params}`);
    return response.data;
  },

  getCreatedTasks: async (
    page = 0,
    size = 20,
    filters?: TaskFilterRequest
  ): Promise<
    ApiResponse<{
      content: TaskSummary[];
      totalElements: number;
      totalPages: number;
    }>
  > => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, value.toString());
        }
      });
    }

    const response = await api.get(`/tasks/created?${params}`);
    return response.data;
  },

  assignTask: async (
    id: number,
    assigneeId: number
  ): Promise<ApiResponse<TaskResponse>> => {
    const response = await api.post(
      `/tasks/${id}/assign?assigneeId=${assigneeId}`
    );
    return response.data;
  },

  unassignTask: async (id: number): Promise<ApiResponse<TaskResponse>> => {
    const response = await api.post(`/tasks/${id}/unassign`);
    return response.data;
  },

  completeTask: async (id: number): Promise<ApiResponse<TaskResponse>> => {
    const response = await api.post(`/tasks/${id}/complete`);
    return response.data;
  },

  reopenTask: async (id: number): Promise<ApiResponse<TaskResponse>> => {
    const response = await api.post(`/tasks/${id}/reopen`);
    return response.data;
  },

  addDependency: async (
    id: number,
    dependencyTaskId: number
  ): Promise<ApiResponse<TaskResponse>> => {
    const response = await api.post(`/tasks/${id}/dependencies`, {
      dependencyTaskId,
    });
    return response.data;
  },

  removeDependency: async (
    id: number,
    dependencyId: number
  ): Promise<ApiResponse<TaskResponse>> => {
    const response = await api.delete(
      `/tasks/${id}/dependencies/${dependencyId}`
    );
    return response.data;
  },

  bulkUpdateTasks: async (
    data: BulkTaskUpdateRequest
  ): Promise<ApiResponse<TaskSummary[]>> => {
    const response = await api.post("/tasks/bulk-update", data);
    return response.data;
  },

  getTaskStats: async (
    projectId?: number
  ): Promise<ApiResponse<TaskStatsResponse>> => {
    const params = projectId ? `?projectId=${projectId}` : "";
    const response = await api.get(`/tasks/stats${params}`);
    return response.data;
  },

  getOverdueTasks: async (
    page = 0,
    size = 20,
    projectId?: number
  ): Promise<
    ApiResponse<{
      content: TaskSummary[];
      totalElements: number;
      totalPages: number;
    }>
  > => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });

    if (projectId) {
      params.append("projectId", projectId.toString());
    }

    const response = await api.get(`/tasks/overdue?${params}`);
    return response.data;
  },

  getTasksDueSoon: async (
    page = 0,
    size = 20,
    days = 7,
    projectId?: number
  ): Promise<
    ApiResponse<{
      content: TaskSummary[];
      totalElements: number;
      totalPages: number;
    }>
  > => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
      days: days.toString(),
    });

    if (projectId) {
      params.append("projectId", projectId.toString());
    }

    const response = await api.get(`/tasks/due-soon?${params}`);
    return response.data;
  },

  searchTasks: async (
    query: string,
    page = 0,
    size = 20,
    projectId?: number
  ): Promise<
    ApiResponse<{
      content: TaskSummary[];
      totalElements: number;
      totalPages: number;
    }>
  > => {
    const params = new URLSearchParams({
      query,
      page: page.toString(),
      size: size.toString(),
    });

    if (projectId) {
      params.append("projectId", projectId.toString());
    }

    const response = await api.get(`/tasks/search?${params}`);
    return response.data;
  },

  getSubtasks: async (id: number): Promise<ApiResponse<TaskSummary[]>> => {
    const response = await api.get(`/tasks/${id}/subtasks`);
    return response.data;
  },

  createSubtask: async (
    parentId: number,
    data: CreateTaskRequest
  ): Promise<ApiResponse<TaskResponse>> => {
    const response = await api.post(`/tasks/${parentId}/subtasks`, data);
    return response.data;
  },

  archiveTask: async (id: number): Promise<ApiResponse<TaskResponse>> => {
    const response = await api.post(`/tasks/${id}/archive`);
    return response.data;
  },

  restoreTask: async (id: number): Promise<ApiResponse<TaskResponse>> => {
    const response = await api.post(`/tasks/${id}/restore`);
    return response.data;
  },
};
