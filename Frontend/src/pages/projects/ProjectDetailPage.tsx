import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Edit,
  Archive,
  Users,
  DollarSign,
  Target,
  Activity,
  CheckSquare,
  Plus,
  MoreHorizontal,
  FileText,
  MessageSquare,
  Star,
  Share2,
  Download,
  Settings,
} from "lucide-react";
import { DashboardHeader } from "../../components/dashboard/DashboardHeader";
import { Button } from "../../components/ui/Button";
import { tempProjects } from "../../data/tempProjects";
import toast from "react-hot-toast";

// Mock data for project tasks
const projectTasks = [
  {
    id: "1",
    title: "Setup authentication system",
    description: "Implement JWT-based authentication with refresh tokens",
    status: "completed",
    priority: "high",
    assignee: {
      name: "Alex Johnson",
      avatar: null,
      initials: "AJ",
    },
    dueDate: "2024-12-05",
    completedDate: "2024-12-04",
    progress: 100,
  },
  {
    id: "2",
    title: "Design product catalog UI",
    description: "Create responsive product listing components",
    status: "in_progress",
    priority: "medium",
    assignee: {
      name: "Sarah Chen",
      avatar: null,
      initials: "SC",
    },
    dueDate: "2024-12-10",
    completedDate: null,
    progress: 65,
  },
  {
    id: "3",
    title: "Implement payment gateway",
    description: "Integrate Stripe payment processing",
    status: "todo",
    priority: "critical",
    assignee: {
      name: "Mike Rodriguez",
      avatar: null,
      initials: "MR",
    },
    dueDate: "2024-12-12",
    completedDate: null,
    progress: 0,
  },
  {
    id: "4",
    title: "Setup CI/CD pipeline",
    description: "Configure automated testing and deployment",
    status: "in_progress",
    priority: "medium",
    assignee: {
      name: "Emma Wilson",
      avatar: null,
      initials: "EW",
    },
    dueDate: "2024-12-15",
    completedDate: null,
    progress: 30,
  },
];

// Mock data for project team members
const projectTeam = [
  {
    id: "1",
    name: "Sarah Chen",
    email: "sarah@devflow.com",
    role: "Project Manager",
    avatar: null,
    initials: "SC",
    joinedDate: "2024-10-01",
    isOnline: true,
  },
  {
    id: "2",
    name: "Alex Johnson",
    email: "alex@devflow.com",
    role: "Frontend Developer",
    avatar: null,
    initials: "AJ",
    joinedDate: "2024-10-01",
    isOnline: true,
  },
  {
    id: "3",
    name: "Mike Rodriguez",
    email: "mike@devflow.com",
    role: "Backend Developer",
    avatar: null,
    initials: "MR",
    joinedDate: "2024-10-05",
    isOnline: false,
  },
  {
    id: "4",
    name: "Emma Wilson",
    email: "emma@devflow.com",
    role: "UI/UX Designer",
    avatar: null,
    initials: "EW",
    joinedDate: "2024-10-08",
    isOnline: true,
  },
];

// Mock data for recent activity
const recentActivity = [
  {
    id: "1",
    type: "task_completed",
    user: "Alex Johnson",
    action: "completed task",
    target: "Setup authentication system",
    time: "2 hours ago",
    avatar: null,
    initials: "AJ",
  },
  {
    id: "2",
    type: "comment",
    user: "Sarah Chen",
    action: "commented on",
    target: "Design product catalog UI",
    time: "4 hours ago",
    avatar: null,
    initials: "SC",
  },
  {
    id: "3",
    type: "task_created",
    user: "Mike Rodriguez",
    action: "created task",
    target: "Implement payment gateway",
    time: "1 day ago",
    avatar: null,
    initials: "MR",
  },
  {
    id: "4",
    type: "member_added",
    user: "Sarah Chen",
    action: "added",
    target: "Emma Wilson to the project",
    time: "2 days ago",
    avatar: null,
    initials: "SC",
  },
  {
    id: "5",
    type: "file_uploaded",
    user: "Emma Wilson",
    action: "uploaded",
    target: "Design mockups v2.0",
    time: "3 days ago",
    avatar: null,
    initials: "EW",
  },
];

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    "overview" | "tasks" | "team" | "activity"
  >("overview");

  const project = tempProjects.find((p) => p.id === id);

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
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

  const getStatusColor = () => {
    switch (project.healthStatus) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "at_risk":
        return "bg-yellow-100 text-yellow-800";
      case "delayed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const getPriorityColor = () => {
    switch (project.priority) {
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const handleArchiveProject = () => {
    toast.success("Project archived successfully");
    navigate("/projects");
  };

  const TaskItem: React.FC<{ task: any }> = ({ task }) => {
    const getTaskStatusColor = () => {
      switch (task.status) {
        case "completed":
          return "bg-green-100 text-green-800";
        case "in_progress":
          return "bg-blue-100 text-blue-800";
        default:
          return "bg-gray-100 text-gray-800";
      }
    };

    const getTaskPriorityColor = () => {
      switch (task.priority) {
        case "critical":
          return "border-l-red-500";
        case "high":
          return "border-l-orange-500";
        case "medium":
          return "border-l-yellow-500";
        default:
          return "border-l-green-500";
      }
    };

    return (
      <div
        className={`bg-white rounded-lg border-l-4 ${getTaskPriorityColor()} border-r border-t border-b border-gray-200 p-4 hover:shadow-md transition-shadow`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">{task.title}</h4>
            <p className="text-sm text-gray-600 mt-1">{task.description}</p>

            <div className="mt-3 mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700">
                  Progress
                </span>
                <span className="text-xs text-gray-600">{task.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${task.progress}%` }}
                ></div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${getTaskStatusColor()}`}
              >
                {task.status.replace("_", " ").toUpperCase()}
              </span>
              <span className="text-sm text-gray-500">
                Due: {formatDate(task.dueDate)}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {task.assignee.avatar ? (
              <img
                src={task.assignee.avatar}
                alt={task.assignee.name}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {task.assignee.initials}
              </div>
            )}
            <button className="p-1 hover:bg-gray-100 rounded transition-colors">
              <MoreHorizontal className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const TeamMember: React.FC<{ member: any }> = ({ member }) => (
    <div className="flex items-center space-x-4 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div className="relative">
        {member.avatar ? (
          <img
            src={member.avatar}
            alt={member.name}
            className="w-12 h-12 rounded-full"
          />
        ) : (
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
            {member.initials}
          </div>
        )}

        <div
          className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${
            member.isOnline ? "bg-green-500" : "bg-gray-400"
          }`}
        ></div>
      </div>
      <div className="flex-1">
        <h4 className="font-medium text-gray-900">{member.name}</h4>
        <p className="text-sm text-gray-600">{member.role}</p>
        <p className="text-xs text-gray-500">
          Joined {formatDate(member.joinedDate)}
        </p>
      </div>
      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
        <MoreHorizontal className="w-5 h-5 text-gray-400" />
      </button>
    </div>
  );

  const ActivityItem: React.FC<{ activity: any }> = ({ activity }) => {
    const getActivityIcon = () => {
      switch (activity.type) {
        case "task_completed":
          return <CheckSquare className="w-4 h-4 text-green-600" />;
        case "comment":
          return <MessageSquare className="w-4 h-4 text-blue-600" />;
        case "task_created":
          return <Plus className="w-4 h-4 text-purple-600" />;
        case "member_added":
          return <Users className="w-4 h-4 text-indigo-600" />;
        case "file_uploaded":
          return <FileText className="w-4 h-4 text-orange-600" />;
        default:
          return <Activity className="w-4 h-4 text-gray-600" />;
      }
    };

    return (
      <div className="flex items-start space-x-3 p-4 hover:bg-gray-50 rounded-lg transition-colors">
        <div className="relative">
          {activity.avatar ? (
            <img
              src={activity.avatar}
              alt={activity.user}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
              {activity.initials}
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center border-2 border-white">
            {getActivityIcon()}
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-900">
            <span className="font-medium">{activity.user}</span>{" "}
            {activity.action}{" "}
            <span className="font-medium">{activity.target}</span>
          </p>
          <p className="text-xs text-gray-500">{activity.time}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                to="/projects"
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: project.color }}
                  ></div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {project.name}
                  </h1>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}
                  >
                    {project.healthStatus.replace("_", " ").toUpperCase()}
                  </span>
                </div>
                <p className="text-gray-600 mt-1">{project.description}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button variant="outline" icon={<Star className="w-4 h-4" />}>
                Star
              </Button>
              <Button variant="outline" icon={<Share2 className="w-4 h-4" />}>
                Share
              </Button>
              <Link to={`/projects/${id}/edit`}>
                <Button variant="outline" icon={<Edit className="w-4 h-4" />}>
                  Edit
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={handleArchiveProject}
                icon={<Archive className="w-4 h-4" />}
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                Archive
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center">
                <Target className="w-8 h-8 text-blue-600" />
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-600">
                    Progress
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {project.progress}%
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${project.progress}%`,
                      backgroundColor: project.color,
                    }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center">
                <CheckSquare className="w-8 h-8 text-green-600" />
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-600">Tasks</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {project.tasksCompleted}/{project.totalTasks}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-purple-600" />
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-600">
                    Team Size
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {project.teamSize}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center">
                <DollarSign className="w-8 h-8 text-orange-600" />
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-600">
                    Budget
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {project.budget ? formatCurrency(project.budget) : "N/A"}
                  </div>
                </div>
              </div>
              {project.budget && project.spent && (
                <div className="mt-2">
                  <div className="text-sm text-gray-600">
                    Spent: {formatCurrency(project.spent)} (
                    {Math.round((project.spent / project.budget) * 100)}%)
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: "overview", label: "Overview", icon: FileText },
                { id: "tasks", label: "Tasks", icon: CheckSquare },
                { id: "team", label: "Team", icon: Users },
                { id: "activity", label: "Activity", icon: Activity },
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
                </button>
              ))}
            </nav>
          </div>

          <div className="space-y-6">
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Project Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium text-gray-600">
                              Priority
                            </label>
                            <div className="mt-1">
                              <span
                                className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor()}`}
                              >
                                {project.priority.charAt(0).toUpperCase() +
                                  project.priority.slice(1)}{" "}
                                Priority
                              </span>
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">
                              Status
                            </label>
                            <div className="mt-1">
                              <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                {project.status.charAt(0).toUpperCase() +
                                  project.status.slice(1)}
                              </span>
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">
                              Created
                            </label>
                            <div className="mt-1 text-gray-900">
                              {formatDate(project.createdAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium text-gray-600">
                              Start Date
                            </label>
                            <div className="mt-1 text-gray-900">
                              {formatDate(project.startDate || null)}
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">
                              Due Date
                            </label>
                            <div className="mt-1 text-gray-900">
                              {formatDate(project.dueDate)}
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">
                              Last Updated
                            </label>
                            <div className="mt-1 text-gray-900">
                              {formatDate(project.updatedAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Recent Tasks
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTab("tasks")}
                      >
                        View All
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {projectTasks.slice(0, 3).map((task) => (
                        <TaskItem key={task.id} task={task} />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Team Members
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTab("team")}
                      >
                        View All
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {projectTeam.slice(0, 4).map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center space-x-3"
                        >
                          <div className="relative">
                            {member.avatar ? (
                              <img
                                src={member.avatar}
                                alt={member.name}
                                className="w-10 h-10 rounded-full"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                {member.initials}
                              </div>
                            )}
                            <div
                              className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${
                                member.isOnline ? "bg-green-500" : "bg-gray-400"
                              }`}
                            ></div>
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {member.name}
                            </div>
                            <div className="text-sm text-gray-600">
                              {member.role}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Quick Actions
                    </h3>
                    <div className="space-y-3">
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        icon={<Plus className="w-4 h-4" />}
                      >
                        Add New Task
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        icon={<Users className="w-4 h-4" />}
                      >
                        Invite Member
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        icon={<Download className="w-4 h-4" />}
                      >
                        Export Report
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        icon={<Settings className="w-4 h-4" />}
                      >
                        Project Settings
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "tasks" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Project Tasks
                  </h3>
                  <Button icon={<Plus className="w-4 h-4" />}>Add Task</Button>
                </div>
                <div className="space-y-4">
                  {projectTasks.map((task) => (
                    <TaskItem key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )}

            {activeTab === "team" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Team Members
                  </h3>
                  <Button icon={<Users className="w-4 h-4" />}>
                    Invite Member
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projectTeam.map((member) => (
                    <TeamMember key={member.id} member={member} />
                  ))}
                </div>
              </div>
            )}

            {activeTab === "activity" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Recent Activity
                </h3>
                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                  {recentActivity.map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
