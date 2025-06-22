import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  BarChart3,
  TrendingUp,
  Clock,
  Users,
  Target,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  Activity,
  Zap,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";

const projectPerformanceData = [
  { name: "Week 1", completed: 12, inProgress: 8, planned: 15 },
  { name: "Week 2", completed: 18, inProgress: 6, planned: 20 },
  { name: "Week 3", completed: 15, inProgress: 10, planned: 18 },
  { name: "Week 4", completed: 22, inProgress: 5, planned: 25 },
  { name: "Week 5", completed: 20, inProgress: 8, planned: 22 },
  { name: "Week 6", completed: 25, inProgress: 7, planned: 28 },
];

const teamProductivityData = [
  { name: "Alex Johnson", tasks: 28, hours: 156, efficiency: 92 },
  { name: "Sarah Chen", tasks: 24, hours: 148, efficiency: 88 },
  { name: "Mike Rodriguez", tasks: 32, hours: 162, efficiency: 95 },
  { name: "Emma Wilson", tasks: 20, hours: 140, efficiency: 85 },
  { name: "David Park", tasks: 26, hours: 152, efficiency: 90 },
];

const taskStatusData = [
  { name: "Completed", value: 156, color: "#10B981" },
  { name: "In Progress", value: 42, color: "#F59E0B" },
  { name: "Todo", value: 38, color: "#6B7280" },
  { name: "Review", value: 24, color: "#3B82F6" },
  { name: "Blocked", value: 8, color: "#EF4444" },
];

const projectHealthData = [
  { name: "On Track", value: 8, color: "#10B981" },
  { name: "At Risk", value: 3, color: "#F59E0B" },
  { name: "Delayed", value: 2, color: "#EF4444" },
  { name: "Completed", value: 4, color: "#6366F1" },
];

const burndownData = [
  { day: "Day 1", planned: 100, actual: 100 },
  { day: "Day 3", planned: 85, actual: 88 },
  { day: "Day 5", planned: 70, actual: 75 },
  { day: "Day 7", planned: 55, actual: 58 },
  { day: "Day 9", planned: 40, actual: 42 },
  { day: "Day 11", planned: 25, actual: 28 },
  { day: "Day 13", planned: 10, actual: 15 },
  { day: "Day 14", planned: 0, actual: 8 },
];

const velocityData = [
  { sprint: "Sprint 1", velocity: 23, capacity: 25 },
  { sprint: "Sprint 2", velocity: 28, capacity: 30 },
  { sprint: "Sprint 3", velocity: 22, capacity: 25 },
  { sprint: "Sprint 4", velocity: 31, capacity: 30 },
  { sprint: "Sprint 5", velocity: 27, capacity: 28 },
  { sprint: "Sprint 6", velocity: 33, capacity: 32 },
];

const AnalyticsDashboard = () => {
  const [selectedTimeRange, setSelectedTimeRange] = useState("last30days");
  const [selectedProject, setSelectedProject] = useState("all");
  const [isLoading, setIsLoading] = useState(false);

  const StatCard = ({
    icon,
    title,
    value,
    change,
    trend,
    subtitle,
    color = "blue",
  }) => {
    const getTrendIcon = () => {
      if (trend === "up")
        return <ArrowUpRight className="w-4 h-4 text-green-500" />;
      if (trend === "down")
        return <ArrowDownRight className="w-4 h-4 text-red-500" />;
      return <Minus className="w-4 h-4 text-gray-400" />;
    };

    const getTrendColor = () => {
      if (trend === "up") return "text-green-600";
      if (trend === "down") return "text-red-600";
      return "text-gray-500";
    };

    const colorClasses = {
      blue: "bg-blue-100 text-blue-600",
      green: "bg-green-100 text-green-600",
      orange: "bg-orange-100 text-orange-600",
      purple: "bg-purple-100 text-purple-600",
      red: "bg-red-100 text-red-600",
    };

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>{icon}</div>
          <div className="flex items-center space-x-1">
            {getTrendIcon()}
            <span className={`text-sm font-medium ${getTrendColor()}`}>
              {change}
            </span>
          </div>
        </div>
        <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
        <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
    );
  };

  const ChartCard = ({ title, children, actions }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {actions && (
          <div className="flex items-center space-x-2">{actions}</div>
        )}
      </div>
      {children}
    </div>
  );

  const FilterDropdown = ({ value, onChange, options, placeholder }) => (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  );

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  const handleExport = () => {
    console.log("Exporting analytics data...");
  };

  const timeRangeOptions = [
    { value: "last7days", label: "Last 7 days" },
    { value: "last30days", label: "Last 30 days" },
    { value: "last90days", label: "Last 90 days" },
    { value: "last6months", label: "Last 6 months" },
    { value: "lastyear", label: "Last year" },
  ];

  const projectOptions = [
    { value: "all", label: "All Projects" },
    { value: "1", label: "E-commerce Platform" },
    { value: "2", label: "Mobile App Redesign" },
    { value: "3", label: "API Gateway" },
    { value: "4", label: "Marketing Website" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Analytics Dashboard
            </h1>
            <p className="text-gray-600">
              Track project performance and team productivity metrics
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleExport}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4 bg-white rounded-lg p-4 border border-gray-200">
          <Filter className="w-5 h-5 text-gray-400" />
          <FilterDropdown
            value={selectedTimeRange}
            onChange={setSelectedTimeRange}
            options={timeRangeOptions}
            placeholder="Select time range"
          />
          <FilterDropdown
            value={selectedProject}
            onChange={setSelectedProject}
            options={projectOptions}
            placeholder="Select project"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<Target className="w-6 h-6" />}
          title="Project Completion Rate"
          value="87.5%"
          change="+12.3%"
          trend="up"
          subtitle="vs last month"
          color="green"
        />
        <StatCard
          icon={<Clock className="w-6 h-6" />}
          title="Average Task Duration"
          value="3.2 days"
          change="-0.5 days"
          trend="up"
          subtitle="vs last month"
          color="blue"
        />
        <StatCard
          icon={<Users className="w-6 h-6" />}
          title="Team Efficiency"
          value="92%"
          change="+5.2%"
          trend="up"
          subtitle="vs last month"
          color="purple"
        />
        <StatCard
          icon={<Award className="w-6 h-6" />}
          title="Velocity Score"
          value="28.5"
          change="+2.1"
          trend="up"
          subtitle="story points/sprint"
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <ChartCard title="Project Performance Over Time">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={projectPerformanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="completed"
                stackId="1"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.6}
                name="Completed"
              />
              <Area
                type="monotone"
                dataKey="inProgress"
                stackId="1"
                stroke="#f59e0b"
                fill="#f59e0b"
                fillOpacity={0.6}
                name="In Progress"
              />
              <Area
                type="monotone"
                dataKey="planned"
                stackId="1"
                stroke="#6b7280"
                fill="#6b7280"
                fillOpacity={0.6}
                name="Planned"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Task Status Distribution">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={taskStatusData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} (${(percent * 100).toFixed(0)}%)`
                }
              >
                {taskStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Team Productivity">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={teamProductivityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="name"
                stroke="#6b7280"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Bar
                dataKey="tasks"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                name="Tasks Completed"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Sprint Burndown Chart">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={burndownData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="planned"
                stroke="#6b7280"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Planned"
                dot={{ fill: "#6b7280", strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Actual"
                dot={{ fill: "#3b82f6", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <ChartCard title="Project Health Overview">
          <div className="flex items-center justify-between mb-4">
            <ResponsiveContainer width="60%" height={200}>
              <PieChart>
                <Pie
                  data={projectHealthData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  dataKey="value"
                >
                  {projectHealthData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-40 space-y-3">
              {projectHealthData.map((item, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-sm text-gray-600">{item.name}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Team Velocity Trend">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={velocityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="sprint" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Legend />
              <Bar
                dataKey="capacity"
                fill="#e5e7eb"
                name="Capacity"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="velocity"
                fill="#10b981"
                name="Velocity"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Key Insights
            </h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-start space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
              <p className="text-sm text-gray-600">
                Team velocity increased by 15% this quarter
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
              <p className="text-sm text-gray-600">
                3 projects at risk of missing deadlines
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <Activity className="w-4 h-4 text-blue-500 mt-0.5" />
              <p className="text-sm text-gray-600">
                Peak productivity hours: 10AM - 2PM
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Top Performers
            </h3>
          </div>
          <div className="space-y-3">
            {teamProductivityData.slice(0, 3).map((member, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                    {member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {member.name}
                  </span>
                </div>
                <span className="text-sm text-gray-600">
                  {member.efficiency}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Zap className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Quick Actions
            </h3>
          </div>
          <div className="space-y-2">
            <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
              Generate Monthly Report
            </button>
            <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
              Schedule Team Review
            </button>
            <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
              Export Performance Data
            </button>
            <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
              Set Performance Goals
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
