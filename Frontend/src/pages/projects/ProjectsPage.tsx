import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, FolderOpen, AlertTriangle } from "lucide-react";
import { DashboardHeader } from "../../components/dashboard/DashboardHeader";
import { ProjectFilters } from "../../components/projects/ProjectFilters";
import { ProjectList } from "../../components/projects/ProjectList";
import { Button } from "../../components/ui/Button";
import {
  useProjects,
  useProjectStats,
  useArchiveProject,
} from "../../hooks/useProjects";

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [sortBy, setSortBy] = useState("updated");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(0);

  const {
    data: projectsData,
    isLoading: isLoadingProjects,
    error: projectsError,
  } = useProjects(currentPage, 12, searchTerm);

  const { data: statsData, isLoading: isLoadingStats } = useProjectStats();

  const archiveProjectMutation = useArchiveProject();

  const transformedProjects = useMemo(() => {
    if (!projectsData?.content) return [];

    return projectsData.content.map((project) => ({
      id: project.id.toString(),
      name: project.name,
      description: project.description,
      progress: project.progress,
      status: project.status.toLowerCase() as any,
      priority: project.priority.toLowerCase() as any,
      dueDate: project.dueDate,
      teamSize: project.teamSize,
      tasksCompleted: project.completedTasks,
      totalTasks: project.totalTasks,
      color: project.color,
      healthStatus: project.healthStatus.toLowerCase().replace("_", "_") as any,
      updatedAt: project.updatedAt,
    }));
  }, [projectsData]);

  const filteredProjects = useMemo(() => {
    let filtered = transformedProjects.filter((project) => {
      const matchesStatus = !statusFilter || project.status === statusFilter;
      const matchesPriority =
        !priorityFilter || project.priority === priorityFilter;
      return matchesStatus && matchesPriority;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "created":
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        case "dueDate":
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case "progress":
          return b.progress - a.progress;
        case "updated":
        default:
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
      }
    });

    return filtered;
  }, [transformedProjects, statusFilter, priorityFilter, sortBy]);

  const handleArchiveProject = async (projectId: string) => {
    try {
      await archiveProjectMutation.mutateAsync(Number(projectId));
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  const handleEditProject = (projectId: string) => {
    navigate(`/projects/${projectId}/edit`);
  };

  const stats = {
    total: statsData?.totalProjects || 0,
    active: statsData?.activeProjects || 0,
    completed: statsData?.completedProjects || 0,
    atRisk:
      (statsData?.totalProjects || 0) -
      (statsData?.activeProjects || 0) -
      (statsData?.completedProjects || 0),
  };

  if (projectsError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Failed to load projects
            </h2>
            <p className="text-gray-600 mb-4">
              There was an error loading your projects. Please try again.
            </p>
            <Button onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
              <p className="text-gray-600">
                Manage and track all your projects in one place
              </p>
            </div>
            <Link to="/projects/new">
              <Button
                icon={<Plus className="w-5 h-5" />}
                className="bg-gradient-to-r from-blue-600 to-purple-600"
              >
                New Project
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FolderOpen className="w-8 h-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-600">
                    Total Projects
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {isLoadingStats ? "..." : stats.total}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <FolderOpen className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-600">
                    Active
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {isLoadingStats ? "..." : stats.active}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <FolderOpen className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-600">
                    Completed
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {isLoadingStats ? "..." : stats.completed}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <FolderOpen className="w-5 h-5 text-yellow-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-600">
                    At Risk
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {isLoadingStats ? "..." : stats.atRisk}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <ProjectFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            priorityFilter={priorityFilter}
            onPriorityFilterChange={setPriorityFilter}
            sortBy={sortBy}
            onSortChange={setSortBy}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          <ProjectList
            projects={filteredProjects}
            viewMode={viewMode}
            onArchive={handleArchiveProject}
            onEdit={handleEditProject}
            loading={isLoadingProjects}
          />

          {projectsData && projectsData.totalElements > 12 && (
            <div className="flex items-center justify-between pt-6">
              <div className="text-sm text-gray-700">
                Showing {currentPage * 12 + 1} to{" "}
                {Math.min((currentPage + 1) * 12, projectsData.totalElements)}{" "}
                of {projectsData.totalElements} projects
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Previous
                </Button>

                <Button
                  variant="outline"
                  disabled={
                    (currentPage + 1) * 12 >= projectsData.totalElements
                  }
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
