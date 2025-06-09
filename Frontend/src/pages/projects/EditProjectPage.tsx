import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  ArrowLeft,
  Save,
  X,
  Calendar,
  DollarSign,
  Palette,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { DashboardHeader } from "../../components/dashboard/DashboardHeader";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { tempProjects } from "../../data/tempProjects";
import toast from "react-hot-toast";

interface UpdateProjectFormData {
  name: string;
  description: string;
  status: "planning" | "active" | "on_hold" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "critical";
  startDate: string;
  dueDate: string;
  budget: number;
  spent: number;
  color: string;
}

const statusOptions = [
  { value: "planning", label: "Planning", color: "bg-gray-100 text-gray-800" },
  { value: "active", label: "Active", color: "bg-green-100 text-green-800" },
  {
    value: "on_hold",
    label: "On Hold",
    color: "bg-yellow-100 text-yellow-800",
  },
  {
    value: "completed",
    label: "Completed",
    color: "bg-blue-100 text-blue-800",
  },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-800" },
];

const priorityOptions = [
  {
    value: "low",
    label: "Low Priority",
    color: "bg-green-100 text-green-800 border-green-200",
  },
  {
    value: "medium",
    label: "Medium Priority",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  {
    value: "high",
    label: "High Priority",
    color: "bg-orange-100 text-orange-800 border-orange-200",
  },
  {
    value: "critical",
    label: "Critical Priority",
    color: "bg-red-100 text-red-800 border-red-200",
  },
];

const colorOptions = [
  "#3B82F6", // Blue
  "#EF4444", // Red
  "#10B981", // Green
  "#8B5CF6", // Purple
  "#F59E0B", // Amber
  "#EC4899", // Pink
  "#6366F1", // Indigo
  "#14B8A6", // Teal
  "#F97316", // Orange
  "#84CC16", // Lime
];

export const EditProjectPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedColor, setSelectedColor] = useState(colorOptions[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const project = tempProjects.find((p) => p.id === id);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<UpdateProjectFormData>({
    defaultValues: project
      ? {
          name: project.name,
          description: project.description,
          status: project.status as any,
          priority: project.priority as any,
          startDate: project.createdAt.split("T")[0],
          dueDate: project.dueDate?.split("T")[0] || "",
          budget: project.budget || 0,
          spent: project.spent || 0,
          color: project.color,
        }
      : undefined,
  });

  useEffect(() => {
    if (project) {
      setSelectedColor(project.color);
    }
  }, [project]);

  const watchStartDate = watch("startDate");
  const watchPriority = watch("priority");
  const watchStatus = watch("status");

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900">
              Project not found
            </h2>
            <Link
              to="/projects"
              className="text-blue-600 hover:text-blue-700 mt-4 inline-block"
            >
              Back to Projects
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const onSubmit = async (data: UpdateProjectFormData) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const projectData = {
        ...data,
        color: selectedColor,
      };

      console.log("Updating project:", projectData);
      toast.success("Project updated successfully!");
      navigate(`/projects/${id}`);
    } catch (error) {
      toast.error("Failed to update project");
    } finally {
      setIsLoading(false);
    }
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    setValue("color", color, { shouldDirty: true });
  };

  const handleDeleteProject = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.success("Project deleted successfully!");
      navigate("/projects");
    } catch (error) {
      toast.error("Failed to delete project");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const statusOption = statusOptions.find((s) => s.value === status);
    return statusOption?.color || "bg-gray-100 text-gray-800";
  };

  const getPriorityColor = (priority: string) => {
    const priorityOption = priorityOptions.find((p) => p.value === priority);
    return priorityOption?.color || "bg-gray-100 text-gray-800 border-gray-200";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />

      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <div className="flex items-center space-x-4">
            <Link
              to={`/projects/${id}`}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <div
                  className="w-6 h-6 rounded-full mr-3"
                  style={{ backgroundColor: selectedColor }}
                ></div>
                Edit Project
              </h1>
              <p className="text-gray-600">
                Modify project settings and details
              </p>
            </div>
          </div>

          {isDirty && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                <span className="text-yellow-800 font-medium">
                  You have unsaved changes
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Basic Information
              </h2>

              <div className="space-y-6">
                <Input
                  {...register("name", {
                    required: "Project name is required",
                    minLength: {
                      value: 2,
                      message: "Name must be at least 2 characters",
                    },
                  })}
                  label="Project Name"
                  placeholder="Enter project name"
                  error={errors.name?.message}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    {...register("description")}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe your project goals and scope..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      {...register("status")}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <div className="mt-2">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                          watchStatus
                        )}`}
                      >
                        {
                          statusOptions.find((s) => s.value === watchStatus)
                            ?.label
                        }
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority Level
                    </label>
                    <select
                      {...register("priority")}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {priorityOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <div className="mt-2">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(
                          watchPriority
                        )}`}
                      >
                        {
                          priorityOptions.find((p) => p.value === watchPriority)
                            ?.label
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Timeline & Budget
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  {...register("startDate")}
                  type="date"
                  label="Start Date"
                  icon={<Calendar className="w-5 h-5" />}
                />

                <Input
                  {...register("dueDate", {
                    validate: (value) => {
                      if (value && watchStartDate && value <= watchStartDate) {
                        return "Due date must be after start date";
                      }
                      return true;
                    },
                  })}
                  type="date"
                  label="Due Date"
                  icon={<Calendar className="w-5 h-5" />}
                  error={errors.dueDate?.message}
                />

                <Input
                  {...register("budget", {
                    min: { value: 0, message: "Budget must be positive" },
                  })}
                  type="number"
                  label="Total Budget"
                  placeholder="0"
                  icon={<DollarSign className="w-5 h-5" />}
                  error={errors.budget?.message}
                />

                <Input
                  {...register("spent", {
                    min: { value: 0, message: "Spent amount must be positive" },
                  })}
                  type="number"
                  label="Amount Spent"
                  placeholder="0"
                  icon={<DollarSign className="w-5 h-5" />}
                  error={errors.spent?.message}
                />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <Palette className="w-5 h-5 mr-2" />
                Appearance
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Project Color
                </label>
                <div className="flex flex-wrap gap-3">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleColorSelect(color)}
                      className={`w-10 h-10 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
                        selectedColor === color
                          ? "border-gray-800 shadow-lg ring-4 ring-gray-200"
                          : "border-gray-300"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  This color will be used throughout the project interface
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-red-600 border-red-600 hover:bg-red-50"
                  icon={<Trash2 className="w-4 h-4" />}
                >
                  Delete Project
                </Button>
              </div>

              <div className="flex space-x-3">
                <Link to={`/projects/${id}`}>
                  <Button
                    type="button"
                    variant="outline"
                    icon={<X className="w-4 h-4" />}
                  >
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  loading={isLoading}
                  icon={<Save className="w-5 h-5" />}
                  className="bg-gradient-to-r from-blue-600 to-purple-600"
                >
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </main>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Delete Project
                </h3>
                <p className="text-gray-600">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-gray-700 mb-6">
              Are you sure you want to delete "{project.name}"? All tasks,
              files, and data associated with this project will be permanently
              removed.
            </p>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteProject}
                loading={isLoading}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {isLoading ? "Deleting..." : "Delete Project"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
