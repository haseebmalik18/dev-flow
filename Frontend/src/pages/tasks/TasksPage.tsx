import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  CheckSquare,
  AlertTriangle,
  Search,
  Calendar,
  Clock,
  User,
} from "lucide-react";
import { DashboardHeader } from "../../components/dashboard/DashboardHeader";
import { Button } from "../../components/ui/Button";
import { TaskFormModal } from "../../components/projects/TaskFormModal";
import {
  useAssignedTasks,
  useCreatedTasks,
  useOverdueTasks,
  useTasksDueSoon,
  useTaskStats,
  useProjectTasks,
} from "../../hooks/useTasks";
import { useProjects, useProjectMembers } from "../../hooks/useProjects";
import type { TaskFilterRequest } from "../../services/taskService";

export const TasksPage: React.FC = () => {
  const [activeView, setActiveView] = useState<
    "assigned" | "created" | "overdue" | "due-soon"
  >("assigned");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("dueDate");
  const [currentPage, setCurrentPage] = useState(0);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedProjectForNewTask, setSelectedProjectForNewTask] = useState<
    number | undefined
  >();

  const { data: projectsData } = useProjects(0, 50);
  const projects = projectsData?.content || [];

  const { data: projectMembers } = useProjectMembers(
    selectedProjectForNewTask || 0
  );

  const { data: availableTasksData } = useProjectTasks(
    selectedProjectForNewTask || 0,
    0,
    100,
    {
      status: undefined,
    }
  );

  const availableTasks = useMemo(() => {
    if (!availableTasksData?.content || !selectedProjectForNewTask) return [];

    return availableTasksData.content
      .filter((task) => {
        return task.status !== "DONE" && task.status !== "CANCELLED";
      })
      .map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        assignee: task.assignee,
        project: task.project,
      }));
  }, [availableTasksData, selectedProjectForNewTask]);

  const filters: TaskFilterRequest = useMemo(() => {
    const baseFilters: TaskFilterRequest = {};

    if (searchTerm.trim()) {
      baseFilters.search = searchTerm.trim();
    }

    if (statusFilter !== "all") {
      baseFilters.status = statusFilter as any;
    }

    if (priorityFilter !== "all") {
      baseFilters.priority = priorityFilter as any;
    }

    if (projectFilter !== "all") {
      baseFilters.projectId = parseInt(projectFilter);
    }

    return baseFilters;
  }, [searchTerm, statusFilter, priorityFilter, projectFilter]);

  const {
    data: assignedTasksData,
    isLoading: isLoadingAssigned,
    error: assignedError,
  } = useAssignedTasks(
    currentPage,
    20,
    activeView === "assigned" ? filters : undefined
  );

  const {
    data: createdTasksData,
    isLoading: isLoadingCreated,
    error: createdError,
  } = useCreatedTasks(
    currentPage,
    20,
    activeView === "created" ? filters : undefined
  );

  const {
    data: overdueTasksData,
    isLoading: isLoadingOverdue,
    error: overdueError,
  } = useOverdueTasks(currentPage, 20, filters.projectId);

  const {
    data: dueSoonTasksData,
    isLoading: isLoadingDueSoon,
    error: dueSoonError,
  } = useTasksDueSoon(currentPage, 20, 7, filters.projectId);

  const { data: taskStats, isLoading: isLoadingStats } = useTaskStats();

  const getCurrentData = () => {
    switch (activeView) {
      case "assigned":
        return {
          data: assignedTasksData,
          isLoading: isLoadingAssigned,
          error: assignedError,
        };
      case "created":
        return {
          data: createdTasksData,
          isLoading: isLoadingCreated,
          error: createdError,
        };
      case "overdue":
        return {
          data: overdueTasksData,
          isLoading: isLoadingOverdue,
          error: overdueError,
        };
      case "due-soon":
        return {
          data: dueSoonTasksData,
          isLoading: isLoadingDueSoon,
          error: dueSoonError,
        };
      default:
        return {
          data: assignedTasksData,
          isLoading: isLoadingAssigned,
          error: assignedError,
        };
    }
  };

  const { data: currentTaskData, isLoading, error } = getCurrentData();
  const tasks = currentTaskData?.content || [];
  const totalTasks = currentTaskData?.totalElements || 0;

  const handleAddTask = (projectId?: number) => {
    const targetProjectId = projectId || projects[0]?.id;

    if (!targetProjectId) {
      alert("Please create a project first before adding tasks.");
      return;
    }

    setSelectedProjectForNewTask(targetProjectId);
    setIsTaskModalOpen(true);
  };

  const handleCloseTaskModal = () => {
    setIsTaskModalOpen(false);
    setSelectedProjectForNewTask(undefined);
  };

  const getViewTitle = () => {
    switch (activeView) {
      case "assigned":
        return "Assigned to Me";
      case "created":
        return "Created by Me";
      case "overdue":
        return "Overdue Tasks";
      case "due-soon":
        return "Due Soon";
      default:
        return "My Tasks";
    }
  };

  const getViewIcon = () => {
    switch (activeView) {
      case "assigned":
        return <User className="w-5 h-5 text-blue-600" />;
      case "created":
        return <Plus className="w-5 h-5 text-green-600" />;
      case "overdue":
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case "due-soon":
        return <Clock className="w-5 h-5 text-orange-600" />;
      default:
        return <CheckSquare className="w-5 h-5 text-blue-600" />;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No due date";
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays === -1) return "Yesterday";
    if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;
    if (diffDays < 7) return `${diffDays} days`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "done":
        return "bg-green-100 text-green-800";
      case "review":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "critical":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-green-100 text-green-800";
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Failed to load tasks
            </h2>
            <p className="text-gray-600 mb-4">
              There was an error loading your tasks. Please try again.
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
              <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
              <p className="text-gray-600">
                Manage and track all your tasks across projects
              </p>
            </div>
            <Button
              onClick={() => handleAddTask()}
              icon={<Plus className="w-5 h-5" />}
              className="bg-gradient-to-r from-blue-600 to-purple-600"
            >
              New Task
            </Button>
          </div>

          {taskStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center">
                  <CheckSquare className="w-8 h-8 text-blue-600" />
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-600">
                      Total Tasks
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {isLoadingStats ? "..." : taskStats.totalTasks}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center">
                  <Clock className="w-8 h-8 text-orange-600" />
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-600">
                      In Progress
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {isLoadingStats ? "..." : taskStats.inProgressTasks}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center">
                  <CheckSquare className="w-8 h-8 text-green-600" />
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-600">
                      Completed
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {isLoadingStats ? "..." : taskStats.completedTasks}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-600">
                      Overdue
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {isLoadingStats ? "..." : taskStats.overdueTasks}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: "assigned", label: "Assigned to Me", icon: User },
                { id: "created", label: "Created by Me", icon: Plus },
                { id: "overdue", label: "Overdue", icon: AlertTriangle },
                { id: "due-soon", label: "Due Soon", icon: Clock },
              ].map((view) => (
                <button
                  key={view.id}
                  onClick={() => {
                    setActiveView(view.id as any);
                    setCurrentPage(0);
                  }}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    activeView === view.id
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <view.icon className="w-4 h-4" />
                  <span>{view.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="REVIEW">Review</option>
                <option value="DONE">Completed</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="dueDate">Due Date</option>
                <option value="priority">Priority</option>
                <option value="status">Status</option>
                <option value="updated">Recently Updated</option>
                <option value="created">Recently Created</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getViewIcon()}
                  <h2 className="text-lg font-semibold text-gray-900">
                    {getViewTitle()}
                  </h2>
                </div>
                <div className="text-sm text-gray-600">
                  {isLoading
                    ? "Loading..."
                    : `${tasks.length} of ${totalTasks} tasks`}
                </div>
              </div>
            </div>

            <div className="p-6">
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="animate-pulse">
                      <div className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                        <div className="w-1 h-12 bg-gray-200 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : tasks.length > 0 ? (
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <Link
                      key={task.id}
                      to={`/tasks/${task.id}`}
                      className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <div className="w-1 h-12 bg-blue-500 rounded-full"></div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-gray-900 truncate">
                            {task.title}
                          </h3>
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                task.status
                              )}`}
                            >
                              {task.status.replace("_", " ")}
                            </span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                                task.priority
                              )}`}
                            >
                              {task.priority}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-1">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: task.project.color }}
                              ></div>
                              <span>{task.project.name}</span>
                            </div>

                            {task.assignee && (
                              <div className="flex items-center space-x-1">
                                {task.assignee.avatar ? (
                                  <img
                                    src={task.assignee.avatar}
                                    alt={`${task.assignee.firstName} ${task.assignee.lastName}`}
                                    className="w-5 h-5 rounded-full"
                                  />
                                ) : (
                                  <div className="w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center text-xs font-medium">
                                    {task.assignee.firstName[0]}
                                    {task.assignee.lastName[0]}
                                  </div>
                                )}
                                <span>
                                  {task.assignee.firstName}{" "}
                                  {task.assignee.lastName}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            {task.isOverdue && (
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                            )}
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span
                              className={
                                task.isOverdue
                                  ? "text-red-600"
                                  : "text-gray-500"
                              }
                            >
                              {formatDate(task.dueDate)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-500">
                    {getViewIcon()}
                    <div className="w-16 h-16 mx-auto mb-4 opacity-50"></div>
                    <p className="text-lg font-medium mb-2">No tasks found</p>
                    <p className="text-sm mb-4">
                      {activeView === "assigned" &&
                        "No tasks have been assigned to you yet"}
                      {activeView === "created" &&
                        "You haven't created any tasks yet"}
                      {activeView === "overdue" &&
                        "No overdue tasks - great job!"}
                      {activeView === "due-soon" && "No tasks due soon"}
                    </p>
                    <Button
                      onClick={() => handleAddTask()}
                      icon={<Plus className="w-4 h-4" />}
                    >
                      Create Your First Task
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {currentTaskData && currentTaskData.totalElements > 20 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {currentPage * 20 + 1} to{" "}
                    {Math.min(
                      (currentPage + 1) * 20,
                      currentTaskData.totalElements
                    )}{" "}
                    of {currentTaskData.totalElements} tasks
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
                        (currentPage + 1) * 20 >= currentTaskData.totalElements
                      }
                      onClick={() => setCurrentPage(currentPage + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <TaskFormModal
        isOpen={isTaskModalOpen}
        onClose={handleCloseTaskModal}
        projectId={selectedProjectForNewTask || projects[0]?.id || 1}
        projectMembers={projectMembers || []}
        availableTasks={availableTasks}
      />
    </div>
  );
};
