import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import {
  X,
  Plus,
  Trash2,
  Mail,
  User,
  Search,
  Check,
  AlertCircle,
  Send,
  UserPlus,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import {
  useSendInvitations,
  useSearchUsers,
  useCheckEmail,
} from "../../hooks/useInvitations";

interface InviteMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  projectName: string;
}

interface InvitationFormData {
  invitations: Array<{
    email: string;
    name: string;
    role: "DEVELOPER" | "DESIGNER" | "TESTER" | "MANAGER" | "ADMIN";
  }>;
  message: string;
}

const roleOptions = [
  {
    value: "DEVELOPER",
    label: "Developer",
    description: "Can view and edit code",
  },
  {
    value: "DESIGNER",
    label: "Designer",
    description: "Can view and edit designs",
  },
  {
    value: "TESTER",
    label: "Tester",
    description: "Can test and report issues",
  },
  {
    value: "MANAGER",
    label: "Manager",
    description: "Can manage project and team",
  },
  { value: "ADMIN", label: "Admin", description: "Full project access" },
];

export const InviteMembersModal: React.FC<InviteMembersModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectName,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserIndex, setSelectedUserIndex] = useState<number | null>(
    null
  );

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<InvitationFormData>({
    defaultValues: {
      invitations: [{ email: "", name: "", role: "DEVELOPER" }],
      message: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "invitations",
  });

  const sendInvitationsMutation = useSendInvitations();

  const { data: searchResults } = useSearchUsers(searchQuery, projectId, 10);

  const watchedInvitations = watch("invitations");

  useEffect(() => {
    if (isOpen) {
      reset({
        invitations: [{ email: "", name: "", role: "DEVELOPER" }],
        message: "",
      });
      setSearchQuery("");
      setSelectedUserIndex(null);
    }
  }, [isOpen, reset]);

  const onSubmit = async (data: InvitationFormData) => {
    const validInvitations = data.invitations.filter(
      (inv) => inv.email.trim() !== ""
    );

    if (validInvitations.length === 0) {
      return;
    }

    try {
      await sendInvitationsMutation.mutateAsync({
        projectId,
        data: {
          invitations: validInvitations.map((inv) => ({
            email: inv.email.trim(),
            name: inv.name.trim() || undefined,
            role: inv.role,
          })),
          message: data.message.trim() || undefined,
        },
      });

      onClose();
    } catch (error) {
      // Error handled by mutation hook
    }
  };

  const addInvitation = () => {
    append({ email: "", name: "", role: "DEVELOPER" });
  };

  const removeInvitation = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const selectUser = (user: any, index: number) => {
    setValue(`invitations.${index}.email`, user.email);
    setValue(`invitations.${index}.name`, user.fullName);
    setSearchQuery("");
    setSelectedUserIndex(null);
  };

  const handleEmailInputFocus = (index: number) => {
    setSelectedUserIndex(index);
  };

  const handleEmailInputBlur = () => {
    setTimeout(() => setSelectedUserIndex(null), 200);
  };

  const EmailField: React.FC<{ index: number }> = ({ index }) => {
    const email = watchedInvitations[index]?.email || "";
    const { data: emailCheck } = useCheckEmail(email);

    return (
      <div className="relative">
        <Input
          {...register(`invitations.${index}.email`, {
            required: "Email is required",
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: "Invalid email address",
            },
          })}
          type="email"
          placeholder="Enter email address"
          icon={<Mail className="w-4 h-4" />}
          error={errors.invitations?.[index]?.email?.message}
          onFocus={() => handleEmailInputFocus(index)}
          onBlur={handleEmailInputBlur}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setValue(`invitations.${index}.email`, e.target.value);
          }}
        />

        {selectedUserIndex === index &&
          searchQuery.length >= 2 &&
          searchResults && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
              {searchResults.length > 0 ? (
                searchResults.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => selectUser(user, index)}
                    className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 text-left"
                  >
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.fullName}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {user.initials}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">
                        {user.fullName}
                      </div>
                      <div className="text-sm text-gray-600">{user.email}</div>
                      {user.jobTitle && (
                        <div className="text-xs text-gray-500">
                          {user.jobTitle}
                        </div>
                      )}
                    </div>
                    {user.isVerified && (
                      <Check className="w-4 h-4 text-green-500" />
                    )}
                  </button>
                ))
              ) : (
                <div className="p-3 text-center text-gray-500">
                  No users found matching "{searchQuery}"
                </div>
              )}
            </div>
          )}

        {email && emailCheck && (
          <div className="mt-1 flex items-center space-x-1">
            {emailCheck.exists ? (
              <>
                <Check className="w-3 h-3 text-green-500" />
                <span className="text-xs text-green-600">
                  {emailCheck.message}
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3 text-orange-500" />
                <span className="text-xs text-orange-600">
                  {emailCheck.message}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <UserPlus className="w-6 h-6 mr-2 text-blue-600" />
                Invite Team Members
              </h2>
              <p className="text-gray-600 mt-1">
                Add new members to{" "}
                <span className="font-medium">{projectName}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Team Members to Invite
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addInvitation}
                icon={<Plus className="w-4 h-4" />}
              >
                Add Another
              </Button>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address *
                      </label>
                      <EmailField index={index} />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name (Optional)
                      </label>
                      <Input
                        {...register(`invitations.${index}.name`)}
                        placeholder="Full name"
                        icon={<User className="w-4 h-4" />}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role
                      </label>
                      <div className="flex items-center space-x-2">
                        <select
                          {...register(`invitations.${index}.role`)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                          {roleOptions.map((role) => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeInvitation(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="mt-1">
                        <span className="text-xs text-gray-500">
                          {
                            roleOptions.find(
                              (r) => r.value === watchedInvitations[index]?.role
                            )?.description
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Personal Message (Optional)
            </label>
            <textarea
              {...register("message")}
              rows={4}
              maxLength={500}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add a personal message to your invitation..."
            />
            <div className="mt-1 text-xs text-gray-500">
              {watch("message")?.length || 0}/500 characters
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Invitation Details:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Invitations expire in 7 days</li>
                  <li>• Users without accounts will be prompted to sign up</li>
                  <li>• Existing users will receive an email notification</li>
                  <li>• You can cancel pending invitations anytime</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>

            <Button
              type="submit"
              loading={sendInvitationsMutation.isPending}
              icon={<Send className="w-4 h-4" />}
              className="bg-gradient-to-r from-blue-600 to-purple-600"
            >
              {sendInvitationsMutation.isPending
                ? "Sending Invitations..."
                : `Send ${
                    fields.filter((_, i) => watchedInvitations[i]?.email.trim())
                      .length
                  } Invitation${
                    fields.filter((_, i) => watchedInvitations[i]?.email.trim())
                      .length !== 1
                      ? "s"
                      : ""
                  }`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
