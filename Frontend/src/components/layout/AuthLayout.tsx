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
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50/80 to-purple-50/60">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-80 h-80 bg-purple-400/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/4 left-3/4 w-64 h-64 bg-indigo-400/10 rounded-full blur-3xl animate-pulse delay-2000"></div>

        <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:32px_32px]"></div>

        <div className="absolute inset-0 opacity-[0.015] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxmaWx0ZXIgaWQ9Im5vaXNlIj4KICAgICAgPGZlVHVyYnVsZW5jZSBiYXNlRnJlcXVlbmN5PSIwLjkiIG51bU9jdGF2ZXM9IjEiIHNlZWQ9IjEiLz4KICAgIDwvZmlsdGVyPgogIDwvZGVmcz4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbm9pc2UpIiBvcGFjaXR5PSIwLjEiLz4KPC9zdmc+')]"></div>
      </div>

      <div className="relative z-10 w-full max-w-md space-y-8 animate-in slide-in-from-bottom-4 duration-700">
        <div className="text-center group">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-6 shadow-2xl shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
            <Code2 className="w-8 h-8 text-white group-hover:scale-110 transition-transform duration-300" />
          </div>

          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-3 group-hover:from-blue-700 group-hover:via-purple-700 group-hover:to-indigo-700 transition-all duration-500">
            DevFlow
          </h1>

          <h2 className="text-2xl font-semibold text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-600 text-sm">{subtitle}</p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 hover:bg-white/90 hover:shadow-3xl transition-all duration-500">
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
