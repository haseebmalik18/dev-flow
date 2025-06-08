import React from "react";
import { Code2 } from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
}) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-lg mb-4">
            <Code2 className="w-6 h-6 text-white" />
          </div>

          <h1 className="text-2xl font-bold text-blue-600 mb-2">DevFlow</h1>

          <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>

          <p className="text-gray-600 text-sm">{subtitle}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8">
          {children}
        </div>

        <div className="text-center">
          <p className="text-gray-500 text-xs">
            Intelligent Project Management Platform
          </p>
        </div>
      </div>
    </div>
  );
};
