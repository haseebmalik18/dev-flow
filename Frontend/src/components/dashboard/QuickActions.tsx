import React from "react";
import { Plus, Users, BarChart3, Zap, Folder } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface QuickActionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  color: string;
}

const QuickAction: React.FC<QuickActionProps> = ({
  icon,
  title,
  description,
  onClick,
  color,
}) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center space-x-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 text-left group cursor-pointer"
    >
      <div
        className={`p-3 rounded-lg ${color} group-hover:scale-110 transition-transform`}
      >
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
          {title}
        </h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      <Plus className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
    </button>
  );
};

export const QuickActions: React.FC = () => {
  const navigate = useNavigate();

  const actions = [
    {
      icon: <Folder className="w-6 h-6 text-blue-600" />,
      title: "New Project",
      description: "Create a new project workspace",
      onClick: () => navigate("/projects/new"),
      color: "bg-blue-100",
    },
    {
      icon: <Plus className="w-6 h-6 text-green-600" />,
      title: "Add Task",
      description: "Create a new task or milestone",
      onClick: () => navigate("/tasks"),
      color: "bg-green-100",
    },
    {
      icon: <Users className="w-6 h-6 text-purple-600" />,
      title: "Invite Team",
      description: "Add new members to projects",
      onClick: () => navigate("/projects"),
      color: "bg-purple-100",
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-orange-600" />,
      title: "View Reports",
      description: "Analyze project performance",
      onClick: () => navigate("/projects"),
      color: "bg-orange-100",
    },
  ];

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
      <div className="flex items-center space-x-2 mb-6">
        <Zap className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action, index) => (
          <QuickAction key={index} {...action} />
        ))}
      </div>
    </div>
  );
};
