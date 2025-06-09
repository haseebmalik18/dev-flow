import React from "react";
import { Search, Filter, SortAsc, Grid, List } from "lucide-react";

interface ProjectFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (priority: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
}

export const ProjectFilters: React.FC<ProjectFiltersProps> = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Status</option>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <select
          value={priorityFilter}
          onChange={(e) => onPriorityFilterChange(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>

        <div className="flex items-center space-x-2">
          <SortAsc className="w-4 h-4 text-gray-400" />
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="name">Name</option>
            <option value="updated">Recently Updated</option>
            <option value="created">Recently Created</option>
            <option value="dueDate">Due Date</option>
            <option value="progress">Progress</option>
          </select>
        </div>

        <div className="flex items-center space-x-1 ml-auto">
          <button
            onClick={() => onViewModeChange("grid")}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === "grid"
                ? "bg-blue-100 text-blue-600"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Grid className="w-5 h-5" />
          </button>
          <button
            onClick={() => onViewModeChange("list")}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === "list"
                ? "bg-blue-100 text-blue-600"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
