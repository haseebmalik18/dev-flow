import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectService } from "../services/projectService";
import type {
  CreateProjectRequest,
  UpdateProjectRequest,
  AddMemberRequest,
} from "../services/projectService";
import toast from "react-hot-toast";

export const useProjects = (page = 0, size = 10, search?: string) => {
  return useQuery({
    queryKey: ["projects", page, size, search],
    queryFn: () => projectService.getUserProjects(page, size, search),
    select: (data) => data.data,
    staleTime: 5 * 60 * 1000,
  });
};

export const useProject = (id: number | string) => {
  return useQuery({
    queryKey: ["project", id],
    queryFn: () => projectService.getProject(Number(id)),
    select: (data) => data.data,
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
};

export const useProjectMembers = (id: number | string) => {
  return useQuery({
    queryKey: ["project", id, "members"],
    queryFn: () => projectService.getProjectMembers(Number(id)),
    select: (data) => data.data,
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
};

export const useProjectStats = () => {
  return useQuery({
    queryKey: ["project-stats"],
    queryFn: () => projectService.getUserProjectStats(),
    select: (data) => data.data,
    staleTime: 5 * 60 * 1000,
  });
};

export const useProjectHealth = (id: number | string) => {
  return useQuery({
    queryKey: ["project", id, "health"],
    queryFn: () => projectService.getProjectHealth(Number(id)),
    select: (data) => data.data,
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectRequest) =>
      projectService.createProject(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-stats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });

      toast.success(response.message || "Project created successfully!");
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || "Failed to create project";
      toast.error(message);
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProjectRequest }) =>
      projectService.updateProject(id, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["project-stats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });

      toast.success(response.message || "Project updated successfully!");
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || "Failed to update project";
      toast.error(message);
    },
  });
};

export const useArchiveProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => projectService.archiveProject(id),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-stats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });

      toast.success(response.message || "Project archived successfully!");
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || "Failed to archive project";
      toast.error(message);
    },
  });
};

export const useAddProjectMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: AddMemberRequest }) =>
      projectService.addMember(id, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["project", variables.id, "members"],
      });
      queryClient.invalidateQueries({ queryKey: ["project", variables.id] });

      toast.success(response.message || "Member added successfully!");
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || "Failed to add member";
      toast.error(message);
    },
  });
};

export const useRemoveProjectMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, memberId }: { id: number; memberId: number }) =>
      projectService.removeMember(id, memberId),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["project", variables.id, "members"],
      });
      queryClient.invalidateQueries({ queryKey: ["project", variables.id] });

      toast.success(response.message || "Member removed successfully!");
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || "Failed to remove member";
      toast.error(message);
    },
  });
};
