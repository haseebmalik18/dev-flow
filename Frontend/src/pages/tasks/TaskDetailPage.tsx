import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Clock,
  User,
  Tag,
  MessageCircle,
  Play,
  Pause,
  CheckCircle,
  AlertTriangle,
  GitMerge,
  Archive,
  MoreHorizontal,
  Hash,
  Loader2,
} from "lucide-react";
import { DashboardHeader } from "../../components/dashboard/DashboardHeader";
import { Button } from "../../components/ui/Button";
import { TaskFormModal } from "../../components/projects/TaskFormModal";
import { CommentSection } from "../../components/tasks/CommentSection";

import { DependencySection } from "../../components/tasks/DependencySection";
import { SubtaskSection } from "../../components/tasks/SubtaskSection";
import {
  useTask,
  useUpdateTask,
  useDeleteTask,
  useCompleteTask,
  useReopenTask,
  useAssignTask,
  useUnassignTask,
  useArchiveTask,
  useSubtasks,
  useProjectTasks,
} from "../../hooks/useTasks";
import { useProjectMembers } from "../../hooks/useProjects";

export const TaskDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "comments" | "subtasks" | "activity"
  >("overview");
  const [showActions, setShowActions] = useState(false);

  const {
    data: task,
    isLoading: isLoadingTask,
    error: taskError,
  } = useTask(parseInt(id!));

  const { data: projectMembers } = useProjectMembers(task?.project.id || 0);

  const { data: subtasks } = useSubtasks(parseInt(id!));

  const { data: availableTasksData } = useProjectTasks(
    task?.project.id || 0,
    0,
    100,
    {
      status: undefined,
    }
  );

  const availableTasks = React.useMemo(() => {
    if (!availableTasksData?.content || !task) return [];

    return availableTasksData.content
      .filter((availableTask) => {
        if (availableTask.id === task.id) return false;

        if (
          availableTask.status === "DONE" ||
          availableTask.status === "CANCELLED"
        )
          return false;

        const existingDependencyIds =
          task.dependencies?.map((dep) => dep.id) || [];
        if (existingDependencyIds.includes(availableTask.id)) return false;

        const dependentTaskIds =
          task.dependentTasks?.map((dep) => dep.id) || [];
        if (dependentTaskIds.includes(availableTask.id)) return false;

        return true;
      })
      .map((availableTask) => ({
        id: availableTask.id,
        title: availableTask.title,
        status: availableTask.status,
        priority: availableTask.priority,
        assignee: availableTask.assignee,
        project: availableTask.project,
      }));
  }, [availableTasksData, task]);

  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  const completeTaskMutation = useCompleteTask();
  const reopenTaskMutation = useReopenTask();
  const assignTaskMutation = useAssignTask();
  const unassignTaskMutation = useUnassignTask();
  const archiveTaskMutation = useArchiveTask();

  if (isLoadingTask) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading task...</span>
          </div>
        </main>
      </div>
    );
  }

  if (taskError || !task) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Task not found
            </h2>
            <p className="text-gray-600 mb-4">
              The task you're looking for doesn't exist or you don't have access
              to it.
            </p>
            <Button onClick={() => navigate(-1)}>Go Back</Button>
          </div>
        </main>
      </div>
    );
  }

  const getStatusColor = () => {
    switch (task.status) {
      case "DONE":
        return "bg-green-100 text-green-800 border-green-200";
      case "REVIEW":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "IN_PROGRESS":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPriorityColor = () => {
    switch (task.priority) {
      case "CRITICAL":
        return "bg-red-100 text-red-800 border-red-200";
      case "HIGH":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-green-100 text-green-800 border-green-200";
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateShort = (dateString: string | null) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      if (newStatus === "DONE") {
        await completeTaskMutation.mutateAsync(task.id);
      } else if (task.status === "DONE" && newStatus !== "DONE") {
        await reopenTaskMutation.mutateAsync(task.id);
        if (newStatus !== "TODO") {
          await updateTaskMutation.mutateAsync({
            id: task.id,
            data: { status: newStatus as any },
          });
        }
      } else {
        await updateTaskMutation.mutateAsync({
          id: task.id,
          data: { status: newStatus as any },
        });
      }
      setShowActions(false);
    } catch (error) {
      // Error handled by mutation hooks
    }
  };

  const handleAssigneeChange = async (assigneeId: number | null) => {
    try {
      if (assigneeId) {
        await assignTaskMutation.mutateAsync({ id: task.id, assigneeId });
      } else {
        await unassignTaskMutation.mutateAsync(task.id);
      }
      setShowActions(false);
    } catch (error) {
      // Error handled by mutation hooks
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      try {
        await deleteTaskMutation.mutateAsync(task.id);
        navigate(`/projects/${task.project.id}`);
      } catch (error) {
        // Error handled by mutation hook
      }
    }
  };

  const handleArchive = async () => {
    try {
      await archiveTaskMutation.mutateAsync(task.id);
      setShowActions(false);
    } catch (error) {
      // Error handled by mutation hook
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                to={`/projects/${task.project.id}`}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <div className="flex items-center space-x-3">
                  <div
                    className="w-1 h-8 rounded-full"
                    style={{ backgroundColor: task.project.color }}
                  ></div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {task.title}
                    </h1>
                    <div className="flex items-center space-x-2 mt-1">
                      <Link
                        to={`/projects/${task.project.id}`}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        {task.project.name}
                      </Link>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-600 text-sm">
                        Created {formatDateShort(task.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsEditModalOpen(true)}
                icon={<Edit className="w-4 h-4" />}
              >
                Edit
              </Button>

              <div className="relative">
                <Button
                  variant="outline"
                  onClick={() => setShowActions(!showActions)}
                  icon={<MoreHorizontal className="w-4 h-4" />}
                >
                  Actions
                </Button>

                {showActions && (
                  <div className="absolute right-0 top-12 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[180px]">
                    <div className="px-3 py-1">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Status
                      </span>
                    </div>
                    {["TODO", "IN_PROGRESS", "REVIEW", "DONE"].map((status) => (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(status)}
                        className={`w-full flex items-center space-x-2 px-3 py-2 text-sm hover:bg-gray-50 ${
                          task.status === status
                            ? "bg-blue-50 text-blue-700"
                            : "text-gray-700"
                        }`}
                      >
                        {status === "DONE" && (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        {status === "IN_PROGRESS" && (
                          <Play className="w-4 h-4" />
                        )}
                        {status === "REVIEW" && <Clock className="w-4 h-4" />}
                        {status === "TODO" && <Pause className="w-4 h-4" />}
                        <span>{status.replace("_", " ")}</span>
                      </button>
                    ))}

                    <div className="border-t border-gray-100 my-1" />

                    <div className="px-3 py-1">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Assignee
                      </span>
                    </div>
                    <button
                      onClick={() => handleAssigneeChange(null)}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <User className="w-4 h-4" />
                      <span>Unassigned</span>
                    </button>
                    {projectMembers?.map((member) => (
                      <button
                        key={member.id}
                        onClick={() => handleAssigneeChange(member.user.id)}
                        className={`w-full flex items-center space-x-2 px-3 py-2 text-sm hover:bg-gray-50 ${
                          task.assignee?.id === member.user.id
                            ? "bg-blue-50 text-blue-700"
                            : "text-gray-700"
                        }`}
                      >
                        {member.user.avatar ? (
                          <img
                            src={member.user.avatar}
                            alt={`${member.user.firstName} ${member.user.lastName}`}
                            className="w-4 h-4 rounded-full"
                          />
                        ) : (
                          <div className="w-4 h-4 bg-gray-300 rounded-full flex items-center justify-center text-xs">
                            {member.user.firstName[0]}
                          </div>
                        )}
                        <span>
                          {member.user.firstName} {member.user.lastName}
                        </span>
                      </button>
                    ))}

                    <div className="border-t border-gray-100 my-1" />

                    <button
                      onClick={handleArchive}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Archive className="w-4 h-4" />
                      <span>Archive</span>
                    </button>

                    <button
                      onClick={handleDelete}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">
                  Status
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor()}`}
                >
                  {task.status.replace("_", " ")}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">
                  Priority
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor()}`}
                >
                  {task.priority}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">
                  Progress
                </span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${task.progress}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {task.progress}%
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">
                  Due Date
                </span>
                <div className="flex items-center space-x-1">
                  {task.isOverdue && (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  )}
                  <span
                    className={`text-sm ${
                      task.isOverdue ? "text-red-600" : "text-gray-900"
                    }`}
                  >
                    {formatDateShort(task.dueDate)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: "overview", label: "Overview", icon: Clock },
                {
                  id: "comments",
                  label: "Comments",
                  icon: MessageCircle,
                  count: task.commentsCount,
                },
                {
                  id: "subtasks",
                  label: "Subtasks",
                  icon: CheckCircle,
                  count: subtasks?.length,
                },
                { id: "activity", label: "Activity", icon: Clock },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {activeTab === "overview" && (
                <div className="space-y-6">
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Description
                    </h3>
                    <div className="prose prose-sm max-w-none">
                      <p className="text-gray-700">
                        {task.description || "No description provided."}
                      </p>
                    </div>
                  </div>

                  <DependencySection
                    task={task}
                    onUpdate={() => {
                      queryClient.invalidateQueries({
                        queryKey: ["task", task.id],
                      });

                      queryClient.invalidateQueries({
                        queryKey: ["tasks", "project", task.project.id],
                      });
                    }}
                  />
                </div>
              )}

              {activeTab === "comments" && <CommentSection taskId={task.id} />}

              {activeTab === "subtasks" && (
                <SubtaskSection
                  taskId={task.id}
                  projectId={task.project.id}
                  projectMembers={projectMembers}
                />
              )}

              {activeTab === "activity" && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Activity Feed
                  </h3>
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">
                      Activity tracking will be implemented in the next phase
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Assignee
                    </label>
                    <div className="mt-1">
                      {task.assignee ? (
                        <div className="flex items-center space-x-2">
                          {task.assignee.avatar ? (
                            <img
                              src={task.assignee.avatar}
                              alt={`${task.assignee.firstName} ${task.assignee.lastName}`}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                              {task.assignee.firstName[0]}
                              {task.assignee.lastName[0]}
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900">
                              {task.assignee.firstName} {task.assignee.lastName}
                            </div>
                            {task.assignee.jobTitle && (
                              <div className="text-sm text-gray-600">
                                {task.assignee.jobTitle}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500">Unassigned</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Creator
                    </label>
                    <div className="mt-1">
                      <div className="flex items-center space-x-2">
                        {task.creator.avatar ? (
                          <img
                            src={task.creator.avatar}
                            alt={`${task.creator.firstName} ${task.creator.lastName}`}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {task.creator.firstName[0]}
                            {task.creator.lastName[0]}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">
                            {task.creator.firstName} {task.creator.lastName}
                          </div>
                          {task.creator.jobTitle && (
                            <div className="text-sm text-gray-600">
                              {task.creator.jobTitle}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {task.storyPoints && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        Story Points
                      </label>
                      <div className="mt-1 flex items-center space-x-1">
                        <Hash className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900">
                          {task.storyPoints}
                        </span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Created
                    </label>
                    <div className="mt-1">
                      <span className="text-gray-900">
                        {formatDate(task.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Last Updated
                    </label>
                    <div className="mt-1">
                      <span className="text-gray-900">
                        {formatDate(task.updatedAt)}
                      </span>
                    </div>
                  </div>

                  {task.completedDate && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        Completed
                      </label>
                      <div className="mt-1">
                        <span className="text-gray-900">
                          {formatDate(task.completedDate)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {task.tagList && task.tagList.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Tag className="w-5 h-5 mr-2" />
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {task.tagList.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Status Flags
                </h3>
                <div className="space-y-3">
                  {task.isOverdue && (
                    <div className="flex items-center space-x-2 text-red-600">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-medium">Overdue</span>
                    </div>
                  )}
                  {task.isBlocked && (
                    <div className="flex items-center space-x-2 text-orange-600">
                      <GitMerge className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        Blocked by dependencies
                      </span>
                    </div>
                  )}
                  {task.isArchived && (
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Archive className="w-4 h-4" />
                      <span className="text-sm font-medium">Archived</span>
                    </div>
                  )}
                  {!task.isOverdue && !task.isBlocked && !task.isArchived && (
                    <div className="text-center py-4">
                      <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <span className="text-sm text-gray-500">
                        No issues detected
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <TaskFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        projectId={task.project.id}
        taskId={task.id}
        projectMembers={projectMembers}
        availableTasks={availableTasks}
      />
    </div>
  );
};
