import React from "react";
import { DashboardHeader } from "../../components/dashboard/DashboardHeader";
import AnalyticsDashboard from "../../components/analytics/AnalyticsDashboard";

export const AnalyticsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      <AnalyticsDashboard />
    </div>
  );
};
