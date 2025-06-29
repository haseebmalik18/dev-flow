import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Search, Settings, LogOut, Code2, X } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useDashboardStats, useUserProfile } from "../../hooks/useDashboard";

export const DashboardHeader: React.FC = () => {
  const { user: authUser, logout } = useAuth();
  const { data: profileData } = useUserProfile();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const user = profileData || authUser;

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const getRoleDisplay = (role: string) => {
    return role.charAt(0) + role.slice(1).toLowerCase();
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const LogoutConfirmationModal = () => {
    if (!showLogoutConfirm) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="absolute inset-0 transition-opacity"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.65)" }}
          onClick={handleCancelLogout}
        />

        <div className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 animate-in fade-in zoom-in duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Confirm Sign Out
            </h3>
            <button
              onClick={handleCancelLogout}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <p className="text-gray-600 mb-6">
            Are you sure you want to sign out? Any unsaved changes will be lost.
          </p>

          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={handleCancelLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmLogout}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center space-x-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                to="/dashboard"
                className="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Code2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">DevFlow</h1>
                  <p className="text-xs text-gray-500 hidden sm:block">
                    Project Management
                  </p>
                </div>
              </Link>
            </div>

            <div className="flex-1 max-w-lg mx-8 hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search projects, tasks, or team members... (WIP)"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Settings className="w-5 h-5" />
              </button>

              <div className="relative flex items-center space-x-3 pl-3 border-l border-gray-200">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">
                    {getGreeting()}, {user?.firstName}!
                  </p>
                  <p className="text-xs text-gray-500">
                    {getRoleDisplay(user?.role || "")}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={`${user.firstName} ${user.lastName}`}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {getInitials(user?.firstName || "", user?.lastName || "")}
                    </div>
                  )}

                  <button
                    onClick={handleLogoutClick}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <LogoutConfirmationModal />
    </>
  );
};
