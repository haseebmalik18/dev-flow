import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Plus, FolderOpen } from "lucide-react";
import { DashboardHeader } from "../../components/dashboard/DashboardHeader";
import { ProjectCard } from "../../components/projects/ProjectCard";
import { ProjectFilters } from "../../components/projects/ProjectFilters";
import { Button } from "../../components/ui/Button";
import { tempProjects } from "../../data/tempProjects";
import toast from "react-hot-toast";

export const ProjectsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [sortBy, setSortBy] = useState("updated");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filteredProjects = useMemo(() => {
    let filtered = tempProjects.filter((project) => {
      const matchesSearch =
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = !statusFilter || project.status === statusFilter;
      const matchesPriority =
        !priorityFilter || project.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "created":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
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
  }, [searchTerm, statusFilter, priorityFilter, sortBy]);

  const handleArchiveProject = (projectId: string) => {
    toast.success("Project archived successfully");
    //wip
  };

  const handleEditProject = (projectId: string) => {
    window.location.href = `/projects/${projectId}/edit`;
  };

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
                    {tempProjects.length}
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
                    {tempProjects.filter((p) => p.status === "active").length}
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
                    {
                      tempProjects.filter((p) => p.status === "completed")
                        .length
                    }
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
                    {
                      tempProjects.filter(
                        (p) =>
                          p.healthStatus === "at_risk" ||
                          p.healthStatus === "delayed"
                      ).length
                    }
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

          {filteredProjects.length > 0 ? (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  : "space-y-4"
              }
            >
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onArchive={handleArchiveProject}
                  onEdit={handleEditProject}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No projects found
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || statusFilter || priorityFilter
                  ? "Try adjusting your filters"
                  : "Get started by creating your first project"}
              </p>
              {!searchTerm && !statusFilter && !priorityFilter && (
                <Link to="/projects/new">
                  <Button
                    icon={<Plus className="w-5 h-5" />}
                    className="bg-gradient-to-r from-blue-600 to-purple-600"
                  >
                    Create Project
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
