// src/hooks/useDashboard.ts
import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "../services/dashboardService";

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => dashboardService.getStats(),
    select: (data) => data.data,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useRecentActivity = () => {
  return useQuery({
    queryKey: ["dashboard", "activity"],
    queryFn: () => dashboardService.getRecentActivity(),
    select: (data) => data.data,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useProjectsOverview = () => {
  return useQuery({
    queryKey: ["dashboard", "projects"],
    queryFn: () => dashboardService.getProjectsOverview(),
    select: (data) => data.data,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useTasksOverview = () => {
  return useQuery({
    queryKey: ["dashboard", "tasks"],
    queryFn: () => dashboardService.getTasksOverview(),
    select: (data) => data.data,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useUserProfile = () => {
  return useQuery({
    queryKey: ["user", "profile"],
    queryFn: () => dashboardService.getUserProfile(),
    select: (data) => data.data,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};
