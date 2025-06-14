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
  Star,
  Share2,
  Download,
  Settings,
  AlertTriangle,
  Loader2,
  UserPlus,
  Mail,
} from "lucide-react";
import { DashboardHeader } from "../../components/dashboard/DashboardHeader";
import { Button } from "../../components/ui/Button";
import { EnhancedTaskManagement } from "../../components/projects/TaskManagement";
import { TaskFormModal } from "../../components/projects/TaskFormModal";
import { ProjectInvitationsTab } from "../../components/invitations/ProjectInvitationsTab";
import { InviteMembersModal } from "../../components/invitations/InviteMembersModal";
import {
  useProject,
  useProjectMembers,
  useProjectHealth,
  useArchiveProject,
} from "../../hooks/useProjects";
import { useProjectTasks, useTaskStats } from "../../hooks/useTasks";
import { useAuthStore } from "../../hooks/useAuthStore";

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();

  const [activeTab, setActiveTab] = useState<
    "overview" | "tasks" | "team" | "invitations" | "activity"
  >("overview");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | undefined>();
  const [parentTaskId, setParentTaskId] = useState<number | undefined>();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const {
    data: project,
    isLoading: isLoadingProject,
    error: projectError,
  } = useProject(id!);

  const { data: members, isLoading: isLoadingMembers } = useProjectMembers(id!);

  const { data: healthData, isLoading: isLoadingHealth } = useProjectHealth(
    id!
  );

  const { data: taskStats, isLoading: isLoadingTaskStats } = useTaskStats(
    parseInt(id!)
  );

  const archiveProjectMutation = useArchiveProject();

  const { data: availableTasksData } = useProjectTasks(parseInt(id!), 0, 100, {
    status: undefined,
  });

  const availableTasks =
    availableTasksData?.content?.map((task) => ({
      id: task.id,
      title: task.title,
    })) || [];

  const canUserManageMembers = (user: any, project: any) => {
    if (!user || !project) return false;

    if (project.owner?.id === user.id) return true;

    const userMember = members?.find((member) => member.user.id === user.id);
    if (userMember) {
      const canManageRoles = ["OWNER", "ADMIN", "MANAGER"];
      return canManageRoles.includes(userMember.role);
    }

    return user.role === "ADMIN" || user.role === "OWNER";
  };

  if (isLoadingProject) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading project...</span>
          </div>
        </main>
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Project not found
            </h2>
            <p className="text-gray-600 mb-4">
              The project you're looking for doesn't exist or you don't have
              access to it.
            </p>
            <Link to="/projects">
              <Button>Back to Projects</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const getStatusColor = () => {
    switch (project.healthStatus) {
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "AT_RISK":
        return "bg-yellow-100 text-yellow-800";
      case "DELAYED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const getPriorityColor = () => {
    switch (project.priority) {
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const handleArchiveProject = async () => {
    try {
      await archiveProjectMutation.mutateAsync(project.id);
      navigate("/projects");
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  const getStatusText = (status: string) => {
    return status.replace("_", " ").toUpperCase();
  };

  const getPriorityText = (priority: string) => {
    return priority.charAt(0) + priority.slice(1).toLowerCase() + " Priority";
  };

  const handleAddTask = () => {
    setEditingTaskId(undefined);
    setParentTaskId(undefined);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (taskId: number) => {
    setEditingTaskId(taskId);
    setParentTaskId(undefined);
    setIsTaskModalOpen(true);
  };

  const handleAddSubtask = (parentTaskId: number) => {
    setEditingTaskId(undefined);
    setParentTaskId(parentTaskId);
    setIsTaskModalOpen(true);
  };

  const canManageInvitations = canUserManageMembers(currentUser, project);

  const TeamMember: React.FC<{ member: any }> = ({ member }) => (
    <div className="flex items-center space-x-4 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div className="relative">
        {member.user.avatar ? (
          <img
            src={member.user.avatar}
            alt={member.user.firstName + " " + member.user.lastName}
            className="w-12 h-12 rounded-full"
          />
        ) : (
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
            {member.user.firstName[0]}
            {member.user.lastName[0]}
          </div>
        )}
      </div>
      <div className="flex-1">
        <h4 className="font-medium text-gray-900">
          {member.user.firstName} {member.user.lastName}
        </h4>
        <p className="text-sm text-gray-600">{member.role.replace("_", " ")}</p>
        <p className="text-xs text-gray-500">
          Joined {formatDate(member.joinedAt)}
        </p>
      </div>
      {canManageInvitations && (
        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <MoreHorizontal className="w-5 h-5 text-gray-400" />
        </button>
      )}
    </div>
  );

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
                    {getStatusText(project.healthStatus)}
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
              {canManageInvitations && (
                <Link to={`/projects/${id}/edit`}>
                  <Button variant="outline" icon={<Edit className="w-4 h-4" />}>
                    Edit
                  </Button>
                </Link>
              )}
              {canManageInvitations && (
                <Button
                  variant="outline"
                  onClick={handleArchiveProject}
                  loading={archiveProjectMutation.isPending}
                  icon={<Archive className="w-4 h-4" />}
                  className="text-red-600 border-red-600 hover:bg-red-50"
                >
                  Archive
                </Button>
              )}
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
                    {isLoadingTaskStats
                      ? "..."
                      : `${taskStats?.completedTasks || 0}/${
                          taskStats?.totalTasks || 0
                        }`}
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
                    {formatCurrency(project.budget)}
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
                { id: "invitations", label: "Invitations", icon: UserPlus },
                { id: "activity", label: "Activity", icon: Activity },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
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
                                {getPriorityText(project.priority)}
                              </span>
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">
                              Status
                            </label>
                            <div className="mt-1">
                              <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                {project.status.replace("_", " ")}
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
                              {formatDate(project.startDate)}
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

                  {taskStats && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Task Overview
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-gray-900">
                            {taskStats.totalTasks}
                          </div>
                          <div className="text-sm text-gray-600">Total</div>
                        </div>
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {taskStats.inProgressTasks}
                          </div>
                          <div className="text-sm text-gray-600">
                            In Progress
                          </div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {taskStats.completedTasks}
                          </div>
                          <div className="text-sm text-gray-600">Completed</div>
                        </div>
                        <div className="text-center p-3 bg-red-50 rounded-lg">
                          <div className="text-2xl font-bold text-red-600">
                            {taskStats.overdueTasks}
                          </div>
                          <div className="text-sm text-gray-600">Overdue</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {healthData && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Project Health
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-600">
                            Risk Score
                          </span>
                          <span className="text-2xl font-bold text-gray-900">
                            {Math.round(healthData.riskScore)}%
                          </span>
                        </div>
                        <p className="text-gray-700">{healthData.message}</p>
                        {healthData.suggestions.length > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">
                              Suggestions:
                            </h4>
                            <ul className="space-y-1">
                              {healthData.suggestions.map(
                                (suggestion, index) => (
                                  <li
                                    key={index}
                                    className="text-sm text-gray-600"
                                  >
                                    • {suggestion}
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
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
                      {isLoadingMembers ? (
                        <div className="text-center py-4">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" />
                        </div>
                      ) : members && members.length > 0 ? (
                        members.slice(0, 4).map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center space-x-3"
                          >
                            <div className="relative">
                              {member.user.avatar ? (
                                <img
                                  src={member.user.avatar}
                                  alt={
                                    member.user.firstName +
                                    " " +
                                    member.user.lastName
                                  }
                                  className="w-10 h-10 rounded-full"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                  {member.user.firstName[0]}
                                  {member.user.lastName[0]}
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">
                                {member.user.firstName} {member.user.lastName}
                              </div>
                              <div className="text-sm text-gray-600">
                                {member.role.replace("_", " ")}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-sm">
                          No team members yet
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Quick Actions
                    </h3>
                    <div className="space-y-3">
                      <Button
                        variant="outline"
                        className="w-full justify-start cursor-pointer"
                        icon={<Plus className="w-4 h-4" />}
                        onClick={handleAddTask}
                      >
                        Add New Task
                      </Button>
                      {canManageInvitations && (
                        <Button
                          variant="outline"
                          className="w-full justify-start cursor-pointer"
                          icon={<UserPlus className="w-4 h-4" />}
                          onClick={() => setIsInviteModalOpen(true)}
                        >
                          Invite Member
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        className="w-full justify-start cursor-pointer"
                        icon={<Download className="w-4 h-4" />}
                      >
                        Export Report
                      </Button>
                      {canManageInvitations && (
                        <Button
                          variant="outline"
                          className="w-full justify-start cursor-pointer"
                          icon={<Settings className="w-4 h-4" />}
                        >
                          Project Settings
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "tasks" && (
              <EnhancedTaskManagement
                projectId={parseInt(id!)}
                projectMembers={members}
                onAddTask={handleAddTask}
                onEditTask={handleEditTask}
                onAddSubtask={handleAddSubtask}
              />
            )}

            {activeTab === "team" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Team Members
                  </h3>
                  {canManageInvitations && (
                    <Button
                      icon={<UserPlus className="w-4 h-4" />}
                      onClick={() => setIsInviteModalOpen(true)}
                    >
                      Invite Member
                    </Button>
                  )}
                </div>
                {isLoadingMembers ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="text-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                      <p className="text-gray-500">Loading team members...</p>
                    </div>
                  </div>
                ) : members && members.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {members.map((member) => (
                      <TeamMember key={member.id} member={member} />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 mb-4">No team members yet</p>
                      {canManageInvitations && (
                        <Button
                          icon={<Plus className="w-4 h-4" />}
                          onClick={() => setIsInviteModalOpen(true)}
                        >
                          Invite First Member
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "invitations" && (
              <ProjectInvitationsTab
                projectId={parseInt(id!)}
                projectName={project.name}
                canManageInvitations={canManageInvitations}
              />
            )}

            {activeTab === "activity" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Recent Activity
                </h3>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">
                      Activity feed will be implemented in the next phase
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <TaskFormModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTaskId(undefined);
          setParentTaskId(undefined);
        }}
        projectId={parseInt(id!)}
        taskId={editingTaskId}
        parentTaskId={parentTaskId}
        projectMembers={members}
        availableTasks={availableTasks}
      />

      {canManageInvitations && (
        <InviteMembersModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          projectId={parseInt(id!)}
          projectName={project.name}
        />
      )}
    </div>
  );
};
