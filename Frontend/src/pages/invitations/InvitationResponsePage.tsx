import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  Check,
  X,
  Clock,
  Users,
  Calendar,
  AlertTriangle,
  Loader2,
  Mail,
  User,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import {
  useInvitationByToken,
  useRespondToInvitation,
} from "../../hooks/useInvitations";
import { useAuthStore } from "../../hooks/useAuthStore";

interface ResponseFormData {
  message: string;
}

export const InvitationResponsePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [responseAction, setResponseAction] = useState<
    "accept" | "decline" | null
  >(null);

  const {
    data: invitation,
    isLoading,
    error,
  } = useInvitationByToken(token || "");

  const respondToInvitationMutation = useRespondToInvitation();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResponseFormData>({
    defaultValues: {
      message: "",
    },
  });

  useEffect(() => {
    if (invitation && user) {
      if (invitation.email !== user.email) {
        navigate("/login", {
          state: {
            message:
              "Please log in with the invited email address to respond to this invitation.",
          },
        });
      }
    }
  }, [invitation, user, navigate]);

  const handleActionClick = (action: "accept" | "decline") => {
    setResponseAction(action);
    setShowResponseForm(true);
  };

  const onSubmit = async (data: ResponseFormData) => {
    if (!token || !responseAction) return;

    try {
      await respondToInvitationMutation.mutateAsync({
        token,
        data: {
          action: responseAction,
          message: data.message.trim() || undefined,
        },
      });

      if (responseAction === "accept" && invitation) {
        navigate(`/projects/${invitation.project.id}`, {
          state: { message: "Welcome to the project!" },
        });
      } else {
        navigate("/dashboard", {
          state: { message: "Invitation response recorded." },
        });
      }
    } catch (error: any) {
      if (error?.message?.includes("already a member")) {
        navigate(`/projects/${invitation?.project.id}`, {
          state: { message: "You're already a member of this project!" },
        });
      } else {
        setShowResponseForm(false);
        setResponseAction(null);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isExpired = invitation && new Date() > new Date(invitation.expiresAt);
  const isAlreadyResponded = invitation && invitation.status !== "PENDING";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Invitation Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            This invitation link is invalid or has expired. Please contact the
            project owner for a new invitation.
          </p>
          <Button onClick={() => navigate("/dashboard")}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <Mail className="w-16 h-16 text-blue-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Sign In Required
          </h1>
          <p className="text-gray-600 mb-6">
            Please sign in to respond to this project invitation for{" "}
            <span className="font-semibold">{invitation.project.name}</span>.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() =>
                navigate("/login", { state: { invitationToken: token } })
              }
              className="w-full"
            >
              Sign In
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                navigate("/register", {
                  state: { invitationToken: token, email: invitation.email },
                })
              }
              className="w-full"
            >
              Create Account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <Clock className="w-16 h-16 text-orange-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Invitation Expired
          </h1>
          <p className="text-gray-600 mb-6">
            This invitation to join{" "}
            <span className="font-semibold">{invitation.project.name}</span>{" "}
            expired on {formatDate(invitation.expiresAt)}. Please contact the
            project owner for a new invitation.
          </p>
          <Button onClick={() => navigate("/dashboard")}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (isAlreadyResponded) {
    const statusConfig = {
      ACCEPTED: {
        icon: <Check className="w-16 h-16 text-green-500" />,
        title: "Invitation Already Accepted",
        message:
          "You have already accepted this invitation and are now a member of the project.",
        buttonText: "Go to Project",
        buttonAction: () => navigate(`/projects/${invitation.project.id}`),
        variant: "success" as const,
      },
      DECLINED: {
        icon: <X className="w-16 h-16 text-red-500" />,
        title: "Invitation Declined",
        message: "You have already declined this invitation.",
        buttonText: "Go to Dashboard",
        buttonAction: () => navigate("/dashboard"),
        variant: "error" as const,
      },
      CANCELLED: {
        icon: <X className="w-16 h-16 text-gray-500" />,
        title: "Invitation Cancelled",
        message: "This invitation has been cancelled by the project owner.",
        buttonText: "Go to Dashboard",
        buttonAction: () => navigate("/dashboard"),
        variant: "neutral" as const,
      },
    };

    const config = statusConfig[invitation.status as keyof typeof statusConfig];

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          {config.icon}
          <h1 className="text-2xl font-bold text-gray-900 mb-4 mt-6">
            {config.title}
          </h1>
          <p className="text-gray-600 mb-6">{config.message}</p>
          {invitation.responseMessage && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Your response:</span> "
                {invitation.responseMessage}"
              </p>
            </div>
          )}
          <div className="space-y-3">
            <Button
              onClick={config.buttonAction}
              className={
                config.variant === "success"
                  ? "bg-green-600 hover:bg-green-700"
                  : ""
              }
            >
              {config.buttonText}
            </Button>
            {config.variant === "success" && (
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard")}
                className="w-full"
              >
                Go to Dashboard
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white text-center">
          <Users className="w-16 h-16 mx-auto mb-4 opacity-90" />
          <h1 className="text-3xl font-bold mb-2">You're Invited!</h1>
          <p className="text-blue-100">
            Join{" "}
            <span className="font-semibold">{invitation.project.name}</span> and
            start collaborating
          </p>
        </div>

        <div className="p-8">
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <div className="flex items-start space-x-4">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: invitation.project.color }}
              >
                <span className="text-white font-bold text-lg">
                  {invitation.project.name[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {invitation.project.name}
                </h2>
                <p className="text-gray-600 mb-4">
                  {invitation.project.description}
                </p>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">
                      {invitation.project.teamSize} team members
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 capitalize">
                      {invitation.role.toLowerCase()} role
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                {invitation.invitedBy.firstName[0]}
                {invitation.invitedBy.lastName[0]}
              </div>
              <div>
                <p className="text-gray-700">
                  <span className="font-medium">
                    {invitation.invitedBy.firstName}{" "}
                    {invitation.invitedBy.lastName}
                  </span>{" "}
                  invited you to join this project
                </p>
                <div className="flex items-center space-x-1 text-sm text-gray-500">
                  <Calendar className="w-3 h-3" />
                  <span>Invited on {formatDate(invitation.createdAt)}</span>
                </div>
              </div>
            </div>

            {invitation.message && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">
                      Personal Message:
                    </p>
                    <p className="text-blue-700 mt-1">"{invitation.message}"</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-orange-600" />
                <p className="text-sm text-orange-800">
                  This invitation expires on {formatDate(invitation.expiresAt)}
                </p>
              </div>
            </div>
          </div>

          {!showResponseForm ? (
            <div className="flex space-x-4">
              <Button
                onClick={() => handleActionClick("accept")}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                icon={<Check className="w-5 h-5" />}
              >
                Accept Invitation
              </Button>
              <Button
                onClick={() => handleActionClick("decline")}
                variant="outline"
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                icon={<X className="w-5 h-5" />}
              >
                Decline
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {responseAction === "accept"
                    ? "Welcome message (optional)"
                    : "Reason for declining (optional)"}
                </label>
                <textarea
                  {...register("message")}
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={
                    responseAction === "accept"
                      ? "Thank you for the invitation! I'm excited to join the team..."
                      : "Thank you for thinking of me, but..."
                  }
                />
                <div className="mt-1 text-xs text-gray-500">
                  {watch("message")?.length || 0}/500 characters
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  type="submit"
                  loading={respondToInvitationMutation.isPending}
                  className={`flex-1 ${
                    responseAction === "accept"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  } text-white`}
                  icon={
                    responseAction === "accept" ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <X className="w-5 h-5" />
                    )
                  }
                >
                  {respondToInvitationMutation.isPending
                    ? `${
                        responseAction === "accept" ? "Accepting" : "Declining"
                      }...`
                    : `${
                        responseAction === "accept" ? "Accept" : "Decline"
                      } Invitation`}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowResponseForm(false);
                    setResponseAction(null);
                  }}
                  disabled={respondToInvitationMutation.isPending}
                >
                  Back
                </Button>
              </div>

              {responseAction === "accept" && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <ArrowRight className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="text-sm text-green-800">
                      <p className="font-medium mb-1">What happens next:</p>
                      <ul className="space-y-1">
                        <li>• You'll be added to the project team</li>
                        <li>• You'll receive access to project resources</li>
                        <li>• Team members will be notified of your joining</li>
                        <li>• You can start collaborating immediately</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
