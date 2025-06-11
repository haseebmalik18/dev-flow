import React, { useState } from "react";
import {
  GitMerge,
  Link,
  Unlink,
  Plus,
  X,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
} from "lucide-react";
import { Button } from "../ui/Button";
import { useAddDependency, useRemoveDependency } from "../../hooks/useTasks";
import { taskService } from "../../services/taskService";
import { useQuery } from "@tanstack/react-query";
import type { TaskResponse } from "../../services/taskService";

interface DependencySectionProps {
  task: TaskResponse;
  onUpdate: () => void;
}

export const DependencySection: React.FC<DependencySectionProps> = ({
  task,
  onUpdate,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const addDependencyMutation = useAddDependency();
  const removeDependencyMutation = useRemoveDependency();

  const { data: searchResults } = useQuery({
    queryKey: ["tasks", "search", searchTerm, task.project.id],
    queryFn: () => taskService.searchTasks(searchTerm, 0, 20, task.project.id),
    select: (data) => data.data,
    enabled: !!searchTerm.trim() && searchTerm.length >= 2,
    staleTime: 30 * 1000,
  });

  const availableTasks = React.useMemo(() => {
    if (!searchResults?.content || !searchTerm.trim()) return [];

    const existingDependencyIds = task.dependencies?.map((dep) => dep.id) || [];
    const dependentTaskIds = task.dependentTasks?.map((dep) => dep.id) || [];

    return searchResults.content
      .filter((availableTask) => {
        if (availableTask.id === task.id) return false;

        if (existingDependencyIds.includes(availableTask.id)) return false;

        if (dependentTaskIds.includes(availableTask.id)) return false;

        if (
          availableTask.status === "DONE" ||
          availableTask.status === "CANCELLED"
        )
          return false;

        return true;
      })
      .map((availableTask) => ({
        id: availableTask.id,
        title: availableTask.title,
        status: availableTask.status,
        priority: availableTask.priority,
        project: availableTask.project,
        assignee: availableTask.assignee
          ? {
              firstName: availableTask.assignee.firstName,
              lastName: availableTask.assignee.lastName,
              avatar: availableTask.assignee.avatar,
            }
          : undefined,
      }));
  }, [
    searchResults,
    searchTerm,
    task.id,
    task.dependencies,
    task.dependentTasks,
  ]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "DONE":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "IN_PROGRESS":
        return <Clock className="w-4 h-4 text-blue-500" />;
      case "REVIEW":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DONE":
        return "bg-green-100 text-green-800";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800";
      case "REVIEW":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "CRITICAL":
        return "bg-red-100 text-red-800";
      case "HIGH":
        return "bg-orange-100 text-orange-800";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-green-100 text-green-800";
    }
  };

  const handleAddDependency = async () => {
    if (!selectedTaskId) return;

    try {
      await addDependencyMutation.mutateAsync({
        id: task.id,
        dependencyTaskId: selectedTaskId,
      });
      setShowAddForm(false);
      setSelectedTaskId(null);
      setSearchTerm("");
      onUpdate();
    } catch (error) {
      // Error handled by mutation hook
    }
  };

  const handleRemoveDependency = async (dependencyId: number) => {
    try {
      await removeDependencyMutation.mutateAsync({
        id: task.id,
        dependencyId,
      });
      onUpdate();
    } catch (error) {
      // Error handled by mutation hook
    }
  };

  const isBlocked =
    task.dependencies?.some((dep) => dep.status !== "DONE") || false;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <GitMerge className="w-5 h-5 mr-2" />
          Dependencies
          {isBlocked && (
            <div className="ml-2 flex items-center space-x-1">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-orange-600 font-medium">
                Blocked
              </span>
            </div>
          )}
        </h3>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddForm(true)}
          icon={<Plus className="w-4 h-4" />}
        >
          Add Dependency
        </Button>
      </div>

      {showAddForm && (
        <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search for tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {searchTerm && (
              <div className="max-h-48 overflow-y-auto space-y-2">
                {availableTasks.length > 0 ? (
                  availableTasks.map((availableTask) => (
                    <div
                      key={availableTask.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedTaskId === availableTask.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setSelectedTaskId(availableTask.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-gray-900 truncate">
                              {availableTask.title}
                            </span>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(availableTask.status)}
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                  availableTask.status
                                )}`}
                              >
                                {availableTask.status.replace("_", " ")}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{
                                  backgroundColor: availableTask.project.color,
                                }}
                              ></div>
                              <span>{availableTask.project.name}</span>
                            </div>
                            {availableTask.assignee && (
                              <div className="flex items-center space-x-1">
                                <span>
                                  {availableTask.assignee.firstName}{" "}
                                  {availableTask.assignee.lastName}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                            availableTask.priority
                          )}`}
                        >
                          {availableTask.priority}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    {searchTerm.length < 2
                      ? "Type at least 2 characters to search for tasks"
                      : `No available tasks found matching "${searchTerm}"`}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center space-x-3">
              <Button
                onClick={handleAddDependency}
                disabled={!selectedTaskId}
                loading={addDependencyMutation.isPending}
                icon={<Link className="w-4 h-4" />}
              >
                Add Dependency
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setSelectedTaskId(null);
                  setSearchTerm("");
                }}
                icon={<X className="w-4 h-4" />}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-gray-900 mb-3">
            Blocked by ({task.dependencies?.length || 0})
          </h4>
          {task.dependencies && task.dependencies.length > 0 ? (
            <div className="space-y-3">
              {task.dependencies.map((dependency) => (
                <div
                  key={dependency.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(dependency.status)}
                      <div>
                        <div className="font-medium text-gray-900">
                          {dependency.title}
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              dependency.status
                            )}`}
                          >
                            {dependency.status.replace("_", " ")}
                          </span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                              dependency.priority
                            )}`}
                          >
                            {dependency.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveDependency(dependency.id)}
                    disabled={removeDependencyMutation.isPending}
                    className="p-1 hover:bg-gray-200 rounded transition-colors text-gray-400 hover:text-red-600"
                  >
                    <Unlink className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <GitMerge className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No dependencies</p>
              <p className="text-sm">This task is not blocked by other tasks</p>
            </div>
          )}
        </div>

        {task.dependentTasks && task.dependentTasks.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">
              Blocking ({task.dependentTasks.length})
            </h4>
            <div className="space-y-3">
              {task.dependentTasks.map((dependentTask) => (
                <div
                  key={dependentTask.id}
                  className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200"
                >
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {dependentTask.title}
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          dependentTask.status
                        )}`}
                      >
                        {dependentTask.status.replace("_", " ")}
                      </span>
                      <span className="text-yellow-700">
                        Waiting for this task to complete
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {((task.dependencies && task.dependencies.length > 0) ||
          (task.dependentTasks && task.dependentTasks.length > 0)) && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start space-x-2">
              <GitMerge className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Dependency Chain</p>
                <p>
                  This task{" "}
                  {task.dependencies &&
                    task.dependencies.length > 0 &&
                    "depends on"}
                  {task.dependencies &&
                    task.dependencies.length > 0 &&
                    task.dependentTasks &&
                    task.dependentTasks.length > 0 &&
                    " and "}
                  {task.dependentTasks &&
                    task.dependentTasks.length > 0 &&
                    "blocks"}{" "}
                  other tasks.
                  {isBlocked &&
                    " Complete the dependencies above to unblock this task."}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
