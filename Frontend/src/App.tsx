import React from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { VerifyEmailPage } from "./pages/auth/VerifyEmailPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { useAuthStore } from "./hooks/useAuthStore";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const DashboardPage: React.FC = () => {
  const { user, clearAuth } = useAuthStore();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome to DevFlow
              </h1>
              <p className="text-gray-600 mt-2">
                Hello, {user?.firstName} {user?.lastName}!
              </p>
            </div>
            <button
              onClick={clearAuth}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Sign Out
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-600 p-6 rounded-lg text-white">
              <h3 className="text-lg font-semibold mb-2">Projects</h3>
              <p className="text-blue-100">Manage your projects</p>
            </div>

            <div className="bg-green-600 p-6 rounded-lg text-white">
              <h3 className="text-lg font-semibold mb-2">Tasks</h3>
              <p className="text-green-100">Track your tasks</p>
            </div>

            <div className="bg-purple-600 p-6 rounded-lg text-white">
              <h3 className="text-lg font-semibold mb-2">Analytics</h3>
              <p className="text-purple-100">View insights</p>
            </div>
          </div>

          <div className="mt-8 p-6 bg-gray-50 rounded-lg">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              User Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Username:</span>
                <span className="ml-2 text-gray-600">{user?.username}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Email:</span>
                <span className="ml-2 text-gray-600">{user?.email}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Role:</span>
                <span className="ml-2 text-gray-600">{user?.role}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Verified:</span>
                <span
                  className={`ml-2 ${
                    user?.isVerified ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {user?.isVerified ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

// Public Route Component
const PublicRoute: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

// Root Layout Component with Toaster
const RootLayout: React.FC = () => {
  return (
    <>
      <Outlet />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#fff",
            color: "#374151",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
            border: "1px solid #e5e7eb",
          },
          success: {
            iconTheme: {
              primary: "#10b981",
              secondary: "#fff",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#fff",
            },
          },
        }}
      />
    </>
  );
};

// Router configuration
const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: "login",
        element: <PublicRoute />,
        children: [
          {
            index: true,
            element: <LoginPage />,
          },
        ],
      },
      {
        path: "register",
        element: <PublicRoute />,
        children: [
          {
            index: true,
            element: <RegisterPage />,
          },
        ],
      },
      {
        path: "verify-email",
        element: <PublicRoute />,
        children: [
          {
            index: true,
            element: <VerifyEmailPage />,
          },
        ],
      },
      {
        path: "forgot-password",
        element: <PublicRoute />,
        children: [
          {
            index: true,
            element: <ForgotPasswordPage />,
          },
        ],
      },
      {
        path: "reset-password",
        element: <PublicRoute />,
        children: [
          {
            index: true,
            element: <ResetPasswordPage />,
          },
        ],
      },
      {
        path: "dashboard",
        element: <ProtectedRoute />,
        children: [
          {
            index: true,
            element: <DashboardPage />,
          },
        ],
      },
    ],
  },
]);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export default App;
