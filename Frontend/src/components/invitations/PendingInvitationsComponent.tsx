import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Mail,
  Clock,
  Calendar,
  User,
  ExternalLink,
  Check,
  X,
  MessageSquare,
  AlertTriangle,
  Users,
  Loader2,
} from "lucide-react";
import { Button } from "../ui/Button";
import { usePendingInvitations } from "../../hooks/useInvitations";

export const PendingInvitationsComponent: React.FC = () => {
  const {
    data: invitations,
    isLoading,
    error,
    refetch,
  } = usePendingInvitations();

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

  const formatCreatedDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="text-center py-4">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600 font-medium">Failed to load invitations</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="mt-2"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Mail className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Pending Invitations
          </h3>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg">
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!invitations || invitations.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Mail className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Pending Invitations
          </h3>
        </div>
        <div className="text-center py-6">
          <Mail className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No pending invitations</p>
          <p className="text-sm text-gray-400">
            You'll see project invitations here when you receive them
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Mail className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Pending Invitations
          </h3>
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
            {invitations.length}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          icon={<Loader2 className="w-3 h-3" />}
        >
          Refresh
        </Button>
      </div>

      <div className="space-y-4">
        {invitations.map((invitation) => {
          const isExpired = new Date() > new Date(invitation.expiresAt);

          console.log("Invitation object:", invitation);
          console.log("Invitation token:", invitation.token);
          console.log("Available fields:", Object.keys(invitation));

          return (
            <div
              key={invitation.id}
              className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                isExpired
                  ? "border-red-200 bg-red-50"
                  : "border-gray-200 hover:border-blue-300"
              }`}
            >
              <div className="flex items-start space-x-4">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                  style={{ backgroundColor: invitation.project.color }}
                >
                  {invitation.project.name[0].toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">
                        {invitation.project.name}
                      </h4>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {invitation.project.description}
                      </p>

                      <div className="space-y-2">
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <User className="w-3 h-3" />
                            <span>
                              Invited by {invitation.invitedBy.firstName}{" "}
                              {invitation.invitedBy.lastName}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Users className="w-3 h-3" />
                            <span className="capitalize">
                              {invitation.role.toLowerCase()} role
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>
                              Invited {formatCreatedDate(invitation.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span className={isExpired ? "text-red-600" : ""}>
                              {formatDate(invitation.expiresAt)}
                            </span>
                          </div>
                        </div>

                        {invitation.message && (
                          <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-2">
                            <div className="flex items-start space-x-2">
                              <MessageSquare className="w-3 h-3 text-blue-600 mt-0.5 flex-shrink-0" />
                              <p className="text-sm text-blue-800">
                                "{invitation.message}"
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col space-y-2 ml-4">
                      {!isExpired ? (
                        <Link
                          to={`/invite/${invitation.token}`}
                          className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                        >
                          <span>Respond</span>
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </Link>
                      ) : (
                        <div className="text-center">
                          <div className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-red-100 rounded-lg">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Expired
                          </div>
                          <p className="text-xs text-red-600 mt-1">
                            Contact the project owner for a new invitation
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200 flex items-center space-x-4 text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <Users className="w-3 h-3" />
                  <span>{invitation.project.teamSize} members</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {invitations.length > 3 && (
        <div className="mt-4 text-center">
          <Button variant="outline" size="sm">
            View All Invitations
          </Button>
        </div>
      )}
    </div>
  );
};
