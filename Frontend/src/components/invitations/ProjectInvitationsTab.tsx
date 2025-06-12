import React, { useState } from "react";
import {
  UserPlus,
  Mail,
  Clock,
  Check,
  X,
  AlertTriangle,
  MoreHorizontal,
  Trash2,
  RefreshCw,
  Send,
  Calendar,
  User,
} from "lucide-react";
import { Button } from "../ui/Button";
import { InviteMembersModal } from "./InviteMembersModal";
import {
  useProjectInvitations,
  useCancelInvitation,
  useInvitationStats,
} from "../../hooks/useInvitations";
import type { InvitationResponse } from "../../services/invitationService";

interface ProjectInvitationsTabProps {
  projectId: number;
  projectName: string;
  canManageInvitations?: boolean;
}

export const ProjectInvitationsTab: React.FC<ProjectInvitationsTabProps> = ({
  projectId,
  projectName,
  canManageInvitations = true,
}) => {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [showActionMenu, setShowActionMenu] = useState<number | null>(null);

  const {
    data: invitationsData,
    isLoading,
    error,
    refetch,
  } = useProjectInvitations(projectId, currentPage, 20);

  const { data: stats, isLoading: isLoadingStats } = useInvitationStats();

  const cancelInvitationMutation = useCancelInvitation();

  const invitations = invitationsData?.content || [];
  const totalInvitations = invitationsData?.totalElements || 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return <Check className="w-4 h-4 text-green-600" />;
      case "DECLINED":
        return <X className="w-4 h-4 text-red-600" />;
      case "EXPIRED":
        return <Clock className="w-4 h-4 text-gray-600" />;
      case "CANCELLED":
        return <Trash2 className="w-4 h-4 text-gray-600" />;
      default:
        return <Clock className="w-4 h-4 text-orange-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return "bg-green-100 text-green-800 border-green-200";
      case "DECLINED":
        return "bg-red-100 text-red-800 border-red-200";
      case "EXPIRED":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "CANCELLED":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-orange-100 text-orange-800 border-orange-200";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `Expired ${Math.abs(diffDays)} days ago`;
    } else if (diffDays === 0) {
      return "Expires today";
    } else if (diffDays === 1) {
      return "Expires tomorrow";
    } else {
      return `Expires in ${diffDays} days`;
    }
  };

  const handleCancelInvitation = async (invitationId: number) => {
    if (window.confirm("Are you sure you want to cancel this invitation?")) {
      try {
        await cancelInvitationMutation.mutateAsync(invitationId);
        setShowActionMenu(null);
      } catch (error) {
        // Error handled by mutation hook
      }
    }
  };

  const InvitationCard: React.FC<{ invitation: InvitationResponse }> = ({
    invitation,
  }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className="relative">
            {invitation.user?.avatar ? (
              <img
                src={invitation.user.avatar}
                alt={`${invitation.user.firstName} ${invitation.user.lastName}`}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                {invitation.invitedName
                  ? invitation.invitedName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                  : invitation.email[0].toUpperCase()}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1">
              {getStatusIcon(invitation.status)}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="font-medium text-gray-900 truncate">
                {invitation.invitedName || invitation.email}
              </h4>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                  invitation.status
                )}`}
              >
                {invitation.status.toLowerCase().replace("_", " ")}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Mail className="w-3 h-3" />
                  <span>{invitation.email}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <User className="w-3 h-3" />
                  <span className="capitalize">
                    {invitation.role.toLowerCase()}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>
                    Invited{" "}
                    {new Date(invitation.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {invitation.status === "PENDING" && (
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(invitation.expiresAt)}</span>
                  </div>
                )}
              </div>

              {invitation.message && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700">
                  "{invitation.message}"
                </div>
              )}

              {invitation.responseMessage && (
                <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
                  <strong>Response:</strong> "{invitation.responseMessage}"
                </div>
              )}
            </div>
          </div>
        </div>

        {canManageInvitations && invitation.status === "PENDING" && (
          <div className="relative">
            <button
              onClick={() =>
                setShowActionMenu(
                  showActionMenu === invitation.id ? null : invitation.id
                )
              }
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <MoreHorizontal className="w-4 h-4 text-gray-400" />
            </button>

            {showActionMenu === invitation.id && (
              <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[160px]">
                <button
                  onClick={() => handleCancelInvitation(invitation.id)}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Cancel Invitation</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-1">
          <span>Invited by:</span>
          <span className="font-medium">
            {invitation.invitedBy.firstName} {invitation.invitedBy.lastName}
          </span>
        </div>
        {invitation.respondedAt && (
          <div className="flex items-center space-x-1">
            <span>Responded:</span>
            <span>{new Date(invitation.respondedAt).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  );

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Failed to load invitations
          </h3>
          <p className="text-gray-600 mb-4">Please try again later.</p>
          <Button
            onClick={() => refetch()}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Team Invitations
          </h3>
          <p className="text-gray-600">
            Manage pending and completed invitations for this project
          </p>
        </div>
        {canManageInvitations && (
          <Button
            onClick={() => setIsInviteModalOpen(true)}
            icon={<UserPlus className="w-4 h-4" />}
            className="bg-gradient-to-r from-blue-600 to-purple-600"
          >
            Invite Members
          </Button>
        )}
      </div>

      {stats && !isLoadingStats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {stats.totalSent}
            </div>
            <div className="text-sm text-gray-600">Total Sent</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {stats.pending}
            </div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {stats.accepted}
            </div>
            <div className="text-sm text-gray-600">Accepted</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {stats.declined}
            </div>
            <div className="text-sm text-gray-600">Declined</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">
              {stats.expired}
            </div>
            <div className="text-sm text-gray-600">Expired</div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">
              All Invitations ({totalInvitations})
            </h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Refresh
            </Button>
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : invitations.length > 0 ? (
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <InvitationCard key={invitation.id} invitation={invitation} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No invitations yet
              </h3>
              <p className="text-gray-600 mb-4">
                Start building your team by inviting new members
              </p>
              {canManageInvitations && (
                <Button
                  onClick={() => setIsInviteModalOpen(true)}
                  icon={<Send className="w-4 h-4" />}
                >
                  Send First Invitation
                </Button>
              )}
            </div>
          )}
        </div>

        {invitationsData && invitationsData.totalElements > 20 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {currentPage * 20 + 1} to{" "}
                {Math.min(
                  (currentPage + 1) * 20,
                  invitationsData.totalElements
                )}{" "}
                of {invitationsData.totalElements} invitations
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Previous
                </Button>

                <Button
                  variant="outline"
                  disabled={
                    (currentPage + 1) * 20 >= invitationsData.totalElements
                  }
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <InviteMembersModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        projectId={projectId}
        projectName={projectName}
      />
    </div>
  );
};
