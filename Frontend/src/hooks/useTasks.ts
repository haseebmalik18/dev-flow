import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { taskService } from "../services/taskService";
import type {
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskFilterRequest,
  BulkTaskUpdateRequest,
} from "../services/taskService";
import toast from "react-hot-toast";

export const useProjectTasks = (
  projectId: number,
  page = 0,
  size = 20,
  filters?: TaskFilterRequest
) => {
  return useQuery({
    queryKey: ["tasks", "project", projectId, page, size, filters],
    queryFn: () => taskService.getProjectTasks(projectId, page, size, filters),
    select: (data) => data.data,
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useAssignedTasks = (
  page = 0,
  size = 20,
  filters?: TaskFilterRequest
) => {
  return useQuery({
    queryKey: ["tasks", "assigned", page, size, filters],
    queryFn: () => taskService.getAssignedTasks(page, size, filters),
    select: (data) => data.data,
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreatedTasks = (
  page = 0,
  size = 20,
  filters?: TaskFilterRequest
) => {
  return useQuery({
    queryKey: ["tasks", "created", page, size, filters],
    queryFn: () => taskService.getCreatedTasks(page, size, filters),
    select: (data) => data.data,
    staleTime: 2 * 60 * 1000,
  });
};

export const useTask = (id: number) => {
  return useQuery({
    queryKey: ["task", id],
    queryFn: () => taskService.getTask(id),
    select: (data) => data.data,
    enabled: !!id,
    staleTime: 1 * 60 * 1000,
  });
};

export const useTaskStats = (projectId?: number) => {
  return useQuery({
    queryKey: ["task-stats", projectId],
    queryFn: () => taskService.getTaskStats(projectId),
    select: (data) => data.data,
    staleTime: 5 * 60 * 1000,
  });
};

export const useOverdueTasks = (page = 0, size = 20, projectId?: number) => {
  return useQuery({
    queryKey: ["tasks", "overdue", page, size, projectId],
    queryFn: () => taskService.getOverdueTasks(page, size, projectId),
    select: (data) => data.data,
    staleTime: 2 * 60 * 1000,
  });
};

export const useTasksDueSoon = (
  page = 0,
  size = 20,
  days = 7,
  projectId?: number
) => {
  return useQuery({
    queryKey: ["tasks", "due-soon", page, size, days, projectId],
    queryFn: () => taskService.getTasksDueSoon(page, size, days, projectId),
    select: (data) => data.data,
    staleTime: 2 * 60 * 1000,
  });
};

export const useSearchTasks = (
  query: string,
  page = 0,
  size = 20,
  projectId?: number
) => {
  return useQuery({
    queryKey: ["tasks", "search", query, page, size, projectId],
    queryFn: () => taskService.searchTasks(query, page, size, projectId),
    select: (data) => data.data,
    enabled: !!query.trim(),
    staleTime: 1 * 60 * 1000,
  });
};

export const useSubtasks = (taskId: number) => {
  return useQuery({
    queryKey: ["task", taskId, "subtasks"],
    queryFn: () => taskService.getSubtasks(taskId),
    select: (data) => data.data,
    enabled: !!taskId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: number;
      data: CreateTaskRequest;
    }) => taskService.createTask(projectId, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["tasks", "project", variables.projectId],
      });
      queryClient.invalidateQueries({ queryKey: ["task-stats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });

      toast.success(response.message || "Task created successfully!");
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || "Failed to create task";
      toast.error(message);
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTaskRequest }) =>
      taskService.updateTask(id, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-stats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });

      toast.success(response.message || "Task updated successfully!");
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || "Failed to update task";
      toast.error(message);
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => taskService.deleteTask(id),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-stats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });

      toast.success(response.message || "Task deleted successfully!");
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || "Failed to delete task";
      toast.error(message);
    },
  });
};

export const useAssignTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, assigneeId }: { id: number; assigneeId: number }) =>
      taskService.assignTask(id, assigneeId),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });

      toast.success(response.message || "Task assigned successfully!");
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || "Failed to assign task";
      toast.error(message);
    },
  });
};

export const useUnassignTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => taskService.unassignTask(id),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task", variables] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });

      toast.success(response.message || "Task unassigned successfully!");
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || "Failed to unassign task";
      toast.error(message);
    },
  });
};

export const useCompleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => taskService.completeTask(id),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task", variables] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-stats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });

      toast.success(response.message || "Task completed successfully!");
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || "Failed to complete task";
      toast.error(message);
    },
  });
};

export const useReopenTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => taskService.reopenTask(id),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task", variables] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-stats"] });

      toast.success(response.message || "Task reopened successfully!");
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || "Failed to reopen task";
      toast.error(message);
    },
  });
};

export const useAddDependency = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      dependencyTaskId,
    }: {
      id: number;
      dependencyTaskId: number;
    }) => taskService.addDependency(id, dependencyTaskId),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });

      toast.success(response.message || "Dependency added successfully!");
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || "Failed to add dependency";
      toast.error(message);
    },
  });
};

export const useRemoveDependency = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dependencyId }: { id: number; dependencyId: number }) =>
      taskService.removeDependency(id, dependencyId),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });

      toast.success(response.message || "Dependency removed successfully!");
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || "Failed to remove dependency";
      toast.error(message);
    },
  });
};

export const useBulkUpdateTasks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkTaskUpdateRequest) =>
      taskService.bulkUpdateTasks(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-stats"] });

      toast.success(
        response.message ||
          `${response.data?.length || 0} tasks updated successfully!`
      );
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || "Failed to update tasks";
      toast.error(message);
    },
  });
};

export const useCreateSubtask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      parentId,
      data,
    }: {
      parentId: number;
      data: CreateTaskRequest;
    }) => taskService.createSubtask(parentId, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task", variables.parentId] });
      queryClient.invalidateQueries({
        queryKey: ["task", variables.parentId, "subtasks"],
      });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });

      toast.success(response.message || "Subtask created successfully!");
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || "Failed to create subtask";
      toast.error(message);
    },
  });
};

export const useArchiveTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => taskService.archiveTask(id),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task", variables] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-stats"] });

      toast.success(response.message || "Task archived successfully!");
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || "Failed to archive task";
      toast.error(message);
    },
  });
};

export const useRestoreTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => taskService.restoreTask(id),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task", variables] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });

      toast.success(response.message || "Task restored successfully!");
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || "Failed to restore task";
      toast.error(message);
    },
  });
};
