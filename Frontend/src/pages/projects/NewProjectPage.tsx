import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  ArrowLeft,
  FolderPlus,
  Calendar,
  DollarSign,
  Target,
  Palette,
  Save,
  X,
} from "lucide-react";
import { DashboardHeader } from "../../components/dashboard/DashboardHeader";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useCreateProject } from "../../hooks/useProjects";
import type { CreateProjectRequest } from "../../services/projectService";

interface CreateProjectFormData extends CreateProjectRequest {
  templateId?: string;
}

const projectTemplates = [
  {
    id: "software-dev",
    name: "Software Development",
    description: "Full-stack web application development",
    color: "#3B82F6",
    estimatedDuration: "3-6 months",
    suggestedTasks: [
      "Requirements Analysis",
      "System Design",
      "Frontend Development",
      "Backend Development",
      "Testing & QA",
      "Deployment",
    ],
  },
  {
    id: "marketing",
    name: "Marketing Campaign",
    description: "Digital marketing and brand awareness campaign",
    color: "#EF4444",
    estimatedDuration: "2-4 months",
    suggestedTasks: [
      "Market Research",
      "Strategy Planning",
      "Content Creation",
      "Campaign Launch",
      "Performance Analysis",
    ],
  },
  {
    id: "research",
    name: "Research Project",
    description: "Data analysis and research study",
    color: "#8B5CF6",
    estimatedDuration: "4-8 months",
    suggestedTasks: [
      "Literature Review",
      "Data Collection",
      "Analysis",
      "Report Writing",
      "Presentation",
    ],
  },
  {
    id: "custom",
    name: "Custom Project",
    description: "Start from scratch with your own structure",
    color: "#10B981",
    estimatedDuration: "Flexible",
    suggestedTasks: [],
  },
];

const priorityColors = {
  LOW: "bg-green-100 text-green-800 border-green-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200",
  HIGH: "bg-orange-100 text-orange-800 border-orange-200",
  CRITICAL: "bg-red-100 text-red-800 border-red-200",
};

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

export const NewProjectPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState(colorOptions[0]);

  const createProjectMutation = useCreateProject();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateProjectFormData>({
    defaultValues: {
      priority: "MEDIUM",
      color: colorOptions[0],
    },
  });

  const watchStartDate = watch("startDate");
  const watchPriority = watch("priority");

  const onSubmit = async (data: CreateProjectFormData) => {
    try {
      const projectData: CreateProjectRequest = {
        name: data.name,
        description: data.description || undefined,
        priority: data.priority,
        startDate: data.startDate || undefined,
        dueDate: data.dueDate || undefined,
        color: selectedColor,
        budget: data.budget || undefined,
      };

      await createProjectMutation.mutateAsync(projectData);
      navigate("/projects");
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = projectTemplates.find((t) => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setSelectedColor(template.color);
      setValue("color", template.color);

      if (templateId !== "custom") {
        setValue("name", template.name + " Project");
        setValue("description", template.description);
      }
    }
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    setValue("color", color);
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "LOW":
        return "Low Priority";
      case "MEDIUM":
        return "Medium Priority";
      case "HIGH":
        return "High Priority";
      case "CRITICAL":
        return "Critical Priority";
      default:
        return "Medium Priority";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />

      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <div className="flex items-center space-x-4">
            <Link
              to="/projects"
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <FolderPlus className="w-8 h-8 text-blue-600 mr-3" />
                Create New Project
              </h1>
              <p className="text-gray-600">
                Set up your project with templates and customizable options
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Target className="w-5 h-5 text-blue-600 mr-2" />
                Choose a Template
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {projectTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleTemplateSelect(template.id)}
                    className={`p-4 rounded-lg border-2 text-left transition-all duration-200 hover:shadow-md ${
                      selectedTemplate === template.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div
                      className="w-4 h-4 rounded-full mb-3"
                      style={{ backgroundColor: template.color }}
                    ></div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {template.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {template.description}
                    </p>
                    <div className="text-xs text-gray-500">
                      {template.estimatedDuration}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Project Details
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority Level
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
                        className={`inline-flex px-3 py-1 rounded-full text-sm font-medium border ${
                          priorityColors[watchPriority || "MEDIUM"]
                        }`}
                      >
                        {getPriorityLabel(watchPriority || "MEDIUM")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <Input
                    {...register("startDate")}
                    type="date"
                    label="Start Date"
                    icon={<Calendar className="w-5 h-5" />}
                  />

                  <Input
                    {...register("dueDate", {
                      validate: (value) => {
                        if (
                          value &&
                          watchStartDate &&
                          value <= watchStartDate
                        ) {
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
                      valueAsNumber: true,
                    })}
                    type="number"
                    label="Budget (Optional)"
                    placeholder="0"
                    icon={<DollarSign className="w-5 h-5" />}
                    error={errors.budget?.message}
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center">
                      <Palette className="w-4 h-4 mr-2" />
                      Project Color
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {colorOptions.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => handleColorSelect(color)}
                          className={`w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
                            selectedColor === color
                              ? "border-gray-800 shadow-lg"
                              : "border-gray-300"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {selectedTemplate && selectedTemplate !== "custom" && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Template Preview
                </h2>
                {(() => {
                  const template = projectTemplates.find(
                    (t) => t.id === selectedTemplate
                  );
                  return (
                    template && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-2">
                          Suggested Tasks:
                        </h3>
                        <div className="space-y-2">
                          {template.suggestedTasks.map((task, index) => (
                            <div
                              key={index}
                              className="flex items-center space-x-2"
                            >
                              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                              <span className="text-sm text-gray-700">
                                {task}
                              </span>
                            </div>
                          ))}
                        </div>
                        <p className="text-sm text-gray-600 mt-3">
                          These tasks will be automatically created when you set
                          up your project.
                        </p>
                      </div>
                    )
                  );
                })()}
              </div>
            )}

            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <Link
                to="/projects"
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </Link>

              <div className="flex space-x-3">
                <Button
                  type="submit"
                  loading={createProjectMutation.isPending}
                  icon={<Save className="w-5 h-5" />}
                  className="bg-gradient-to-r from-blue-600 to-purple-600"
                >
                  {createProjectMutation.isPending
                    ? "Creating Project..."
                    : "Create Project"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};
