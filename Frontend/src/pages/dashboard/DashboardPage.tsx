import React from "react";
import { DashboardStats } from "../../components/dashboard/DashboardStats";
import { RecentActivity } from "../../components/dashboard/RecentActivity";
import { ProjectOverview } from "../../components/dashboard/ProjectOverview";
import { TasksOverview } from "../../components/dashboard/TasksOverview";
import { QuickActions } from "../../components/dashboard/QuickActions";
import { DashboardHeader } from "../../components/dashboard/DashboardHeader";
import { PendingInvitationsComponent } from "../../components/invitations/PendingInvitationsComponent";

export const DashboardPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <DashboardStats />

          <QuickActions />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <ProjectOverview />
              <TasksOverview />
            </div>

            <div className="lg:col-span-1">
              <div className="space-y-6">
                <PendingInvitationsComponent />

                <RecentActivity />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
