import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  X,
  Calendar,
  Tag,
  Link as LinkIcon,
  Save,
  AlertCircle,
  Hash,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { useCreateTask, useUpdateTask, useTask } from "../../hooks/useTasks";
import type {
  CreateTaskRequest,
  UpdateTaskRequest,
} from "../../services/taskService";

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  taskId?: number;
  parentTaskId?: number;
  projectMembers?: Array<{
    id: number;
    user: {
      id: number;
      username: string;
      firstName: string;
      lastName: string;
      avatar: string | null;
    };
  }>;
  availableTasks?: Array<{
    id: number;
    title: string;
  }>;
}

interface TaskFormData {
  title: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  assigneeId?: number;
  dueDate?: string;
  storyPoints?: number;
  tags: string;
  dependencyIds: number[];
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  projectId,
  taskId,
  parentTaskId,
  projectMembers = [],
  availableTasks = [],
}) => {
  const [selectedDependencies, setSelectedDependencies] = useState<number[]>(
    []
  );
  const [tagInput, setTagInput] = useState("");

  const isEditing = !!taskId;
  const isSubtask = !!parentTaskId;

  const { data: existingTask, isLoading: isLoadingTask } = useTask(taskId || 0);

  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<TaskFormData>({
    defaultValues: {
      priority: "MEDIUM",
      tags: "",
      dependencyIds: [],
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (isEditing && existingTask) {
        reset({
          title: existingTask.title,
          description: existingTask.description || "",
          priority: existingTask.priority,
          assigneeId: existingTask.assignee?.id,
          dueDate: existingTask.dueDate?.split("T")[0] || "",
          storyPoints: existingTask.storyPoints || undefined,
          tags: existingTask.tagList?.join(", ") || "",
          dependencyIds: existingTask.dependencies?.map((d) => d.id) || [],
        });
        setSelectedDependencies(
          existingTask.dependencies?.map((d) => d.id) || []
        );
        setTagInput(existingTask.tagList?.join(", ") || "");
      } else {
        reset({
          title: "",
          description: "",
          priority: "MEDIUM",
          assigneeId: undefined,
          dueDate: "",
          storyPoints: undefined,
          tags: "",
          dependencyIds: [],
        });
        setSelectedDependencies([]);
        setTagInput("");
      }
    }
  }, [isOpen, isEditing, existingTask, reset]);

  const watchPriority = watch("priority");

  const formatDateForBackend = (
    dateString: string | undefined
  ): string | undefined => {
    if (!dateString) return undefined;

    if (dateString.includes("T")) {
      return dateString;
    }

    return `${dateString}T23:59:59`;
  };

  const onSubmit = async (data: TaskFormData) => {
    try {
      const taskData = {
        title: data.title,
        description: data.description || undefined,
        priority: data.priority,
        assigneeId: data.assigneeId || undefined,
        dueDate: formatDateForBackend(data.dueDate),
        storyPoints: data.storyPoints || undefined,
        tags: tagInput.trim() || undefined,
        parentTaskId: parentTaskId || undefined,
        dependencyIds:
          selectedDependencies.length > 0 ? selectedDependencies : undefined,
      };

      if (isEditing && taskId) {
        await updateTaskMutation.mutateAsync({
          id: taskId,
          data: taskData as UpdateTaskRequest,
        });
      } else {
        await createTaskMutation.mutateAsync({
          projectId,
          data: taskData as CreateTaskRequest,
        });
      }

      onClose();
    } catch (error) {
      // Error handled by mutation hooks
    }
  };

  const handleTagKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const newTag = e.currentTarget.value.trim();
      if (
        newTag &&
        !tagInput
          .split(",")
          .map((t) => t.trim())
          .includes(newTag)
      ) {
        const updatedTags = tagInput ? `${tagInput}, ${newTag}` : newTag;
        setTagInput(updatedTags);
        setValue("tags", updatedTags);
        e.currentTarget.value = "";
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    const tags = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t !== tagToRemove);
    const updatedTags = tags.join(", ");
    setTagInput(updatedTags);
    setValue("tags", updatedTags);
  };

  const handleDependencyChange = (taskId: number, checked: boolean) => {
    const newDependencies = checked
      ? [...selectedDependencies, taskId]
      : selectedDependencies.filter((id) => id !== taskId);

    setSelectedDependencies(newDependencies);
    setValue("dependencyIds", newDependencies);
  };

  const getPriorityColor = () => {
    switch (watchPriority) {
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

  const getCurrentTags = () => {
    return tagInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing
                ? "Edit Task"
                : isSubtask
                ? "Create Subtask"
                : "Create New Task"}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {isLoadingTask && isEditing ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading task...</p>
            </div>
          ) : (
            <>
              <Input
                {...register("title", {
                  required: "Task title is required",
                  minLength: {
                    value: 2,
                    message: "Title must be at least 2 characters",
                  },
                })}
                label="Task Title"
                placeholder="Enter task title"
                error={errors.title?.message}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  {...register("description")}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe the task in detail..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    {...register("priority")}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="LOW">Low Priority</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="HIGH">High Priority</option>
                    <option value="CRITICAL">Critical Priority</option>
                  </select>
                  <div className="mt-2">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor()}`}
                    >
                      {watchPriority} Priority
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assignee
                  </label>
                  <select
                    {...register("assigneeId", { valueAsNumber: true })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Unassigned</option>
                    {projectMembers.map((member) => (
                      <option key={member.id} value={member.user.id}>
                        {member.user.firstName} {member.user.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  {...register("dueDate")}
                  type="date"
                  label="Due Date"
                  icon={<Calendar className="w-5 h-5" />}
                />

                <Input
                  {...register("storyPoints", {
                    min: { value: 0, message: "Story points must be positive" },
                    valueAsNumber: true,
                  })}
                  type="number"
                  label="Story Points"
                  placeholder="0"
                  icon={<Hash className="w-5 h-5" />}
                  error={errors.storyPoints?.message}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Type a tag and press Enter or comma"
                    onKeyDown={handleTagKeyPress}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {getCurrentTags().length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {getCurrentTags().map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          <Tag className="w-3 h-3" />
                          <span>{tag}</span>
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="hover:text-blue-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {availableTasks.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Dependencies
                  </label>
                  <div className="border border-gray-300 rounded-lg p-4 max-h-40 overflow-y-auto">
                    {availableTasks
                      .filter((task) => task.id !== taskId)
                      .map((task) => (
                        <label
                          key={task.id}
                          className="flex items-center space-x-2 py-2 hover:bg-gray-50 rounded px-2"
                        >
                          <input
                            type="checkbox"
                            checked={selectedDependencies.includes(task.id)}
                            onChange={(e) =>
                              handleDependencyChange(task.id, e.target.checked)
                            }
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">
                            {task.title}
                          </span>
                        </label>
                      ))}
                    {availableTasks.filter((task) => task.id !== taskId)
                      .length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No available tasks for dependencies
                      </p>
                    )}
                  </div>
                  {selectedDependencies.length > 0 && (
                    <p className="text-sm text-gray-600 mt-2">
                      {selectedDependencies.length} dependencies selected
                    </p>
                  )}
                </div>
              )}

              {isSubtask && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-blue-600" />
                    <p className="text-blue-800 font-medium">
                      This task will be created as a subtask
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>

            <Button
              type="submit"
              loading={
                createTaskMutation.isPending || updateTaskMutation.isPending
              }
              disabled={!isDirty && isEditing}
              icon={<Save className="w-4 h-4" />}
            >
              {createTaskMutation.isPending || updateTaskMutation.isPending
                ? isEditing
                  ? "Updating..."
                  : "Creating..."
                : isEditing
                ? "Update Task"
                : "Create Task"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
