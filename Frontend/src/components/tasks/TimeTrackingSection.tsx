import React, { useState } from "react";
import {
  Timer,
  Clock,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  Save,
  X,
  TrendingUp,
  TrendingDown,
  Calendar,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { useTrackTime } from "../../hooks/useTasks";

interface TimeTrackingSectionProps {
  taskId: number;
  estimatedHours?: number | null;
  actualHours?: number | null;
}

interface TimeEntry {
  id: number;
  hours: number;
  description: string;
  date: string;
  user: {
    firstName: string;
    lastName: string;
    avatar: string | null;
  };
}

export const TimeTrackingSection: React.FC<TimeTrackingSectionProps> = ({
  taskId,
  estimatedHours,
  actualHours,
}) => {
  const [isTracking, setIsTracking] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [trackingStartTime, setTrackingStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [formData, setFormData] = useState({
    hours: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });

  const trackTimeMutation = useTrackTime();

  // Mock time entries - this would come from an API
  const timeEntries: TimeEntry[] = [
    {
      id: 1,
      hours: 2.5,
      description: "Initial implementation",
      date: "2024-12-08",
      user: {
        firstName: "John",
        lastName: "Doe",
        avatar: null,
      },
    },
    {
      id: 2,
      hours: 1.5,
      description: "Bug fixes and testing",
      date: "2024-12-07",
      user: {
        firstName: "Jane",
        lastName: "Smith",
        avatar: null,
      },
    },
  ];

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTracking && trackingStartTime) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - trackingStartTime.getTime());
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking, trackingStartTime]);

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const formatHours = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    }
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return minutes > 0 ? `${wholeHours}h ${minutes}m` : `${wholeHours}h`;
  };

  const startTracking = () => {
    setIsTracking(true);
    setTrackingStartTime(new Date());
    setElapsedTime(0);
  };

  const stopTracking = () => {
    if (trackingStartTime) {
      const hours = elapsedTime / (1000 * 60 * 60);
      setFormData({
        hours: hours.toFixed(2),
        description: "",
        date: new Date().toISOString().split("T")[0],
      });
      setShowAddForm(true);
    }
    setIsTracking(false);
    setTrackingStartTime(null);
    setElapsedTime(0);
  };

  const handleSubmitTimeEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.hours || parseFloat(formData.hours) <= 0) return;

    try {
      await trackTimeMutation.mutateAsync({
        id: taskId,
        data: {
          hours: Math.round(parseFloat(formData.hours)),
          description: formData.description || undefined,
          date: formData.date,
        },
      });

      setFormData({
        hours: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
      });
      setShowAddForm(false);
    } catch (error) {
      // Error handled by mutation hook
    }
  };

  const getProgressColor = () => {
    if (!estimatedHours || !actualHours) return "bg-blue-600";
    const percentage = (actualHours / estimatedHours) * 100;
    if (percentage > 120) return "bg-red-600";
    if (percentage > 100) return "bg-orange-600";
    if (percentage > 80) return "bg-yellow-600";
    return "bg-green-600";
  };

  const getVarianceIcon = () => {
    if (!estimatedHours || !actualHours) return null;
    const percentage = (actualHours / estimatedHours) * 100;
    if (percentage > 100) {
      return <TrendingUp className="w-4 h-4 text-red-500" />;
    }
    if (percentage < 90) {
      return <TrendingDown className="w-4 h-4 text-green-500" />;
    }
    return null;
  };

  const getVarianceText = () => {
    if (!estimatedHours || !actualHours) return null;
    const difference = actualHours - estimatedHours;
    const percentage = Math.abs((difference / estimatedHours) * 100);

    if (difference > 0) {
      return (
        <span className="text-red-600">
          +{formatHours(difference)} ({percentage.toFixed(1)}% over)
        </span>
      );
    }
    if (difference < 0) {
      return (
        <span className="text-green-600">
          {formatHours(Math.abs(difference))} under ({percentage.toFixed(1)}%
          under)
        </span>
      );
    }
    return <span className="text-green-600">On track</span>;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Timer className="w-5 h-5 mr-2" />
          Time Tracking
        </h3>

        <div className="flex items-center space-x-3">
          {isTracking ? (
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 bg-red-50 px-3 py-2 rounded-lg">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-red-700 font-mono text-sm">
                  {formatTime(elapsedTime)}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={stopTracking}
                icon={<Pause className="w-4 h-4" />}
              >
                Stop
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={startTracking}
                icon={<Play className="w-4 h-4" />}
              >
                Start Timer
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm(true)}
                icon={<Plus className="w-4 h-4" />}
              >
                Log Time
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Estimated</span>
            <Clock className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {estimatedHours ? formatHours(estimatedHours) : "Not set"}
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Actual</span>
            <Timer className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {actualHours ? formatHours(actualHours) : "0h"}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Variance</span>
            {getVarianceIcon()}
          </div>
          <div className="text-sm font-medium">
            {getVarianceText() || (
              <span className="text-gray-500">No estimate</span>
            )}
          </div>
        </div>
      </div>

      {estimatedHours && actualHours && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm text-gray-600">
              {Math.round((actualHours / estimatedHours) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
              style={{
                width: `${Math.min(
                  (actualHours / estimatedHours) * 100,
                  100
                )}%`,
              }}
            ></div>
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <form onSubmit={handleSubmitTimeEntry} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="number"
                step="0.25"
                min="0.25"
                label="Hours"
                value={formData.hours}
                onChange={(e) =>
                  setFormData({ ...formData, hours: e.target.value })
                }
                placeholder="0.00"
                required
                icon={<Clock className="w-5 h-5" />}
              />
              <Input
                type="date"
                label="Date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                required
                icon={<Calendar className="w-5 h-5" />}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={2}
                placeholder="What did you work on?"
              />
            </div>
            <div className="flex items-center space-x-3">
              <Button
                type="submit"
                loading={trackTimeMutation.isPending}
                icon={<Save className="w-4 h-4" />}
              >
                Log Time
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setFormData({
                    hours: "",
                    description: "",
                    date: new Date().toISOString().split("T")[0],
                  });
                }}
                icon={<X className="w-4 h-4" />}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      <div>
        <h4 className="font-medium text-gray-900 mb-4">Time Log</h4>
        {timeEntries.length > 0 ? (
          <div className="space-y-3">
            {timeEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    {entry.user.avatar ? (
                      <img
                        src={entry.user.avatar}
                        alt={`${entry.user.firstName} ${entry.user.lastName}`}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {entry.user.firstName[0]}
                        {entry.user.lastName[0]}
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-gray-900">
                        {formatHours(entry.hours)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {entry.user.firstName} {entry.user.lastName}
                      </div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-900">
                      {entry.description}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(entry.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                    <Edit className="w-4 h-4 text-gray-400" />
                  </button>
                  <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                    <Trash2 className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Timer className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No time entries yet</p>
            <p className="text-sm text-gray-400">
              Start tracking time or log your work hours
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
