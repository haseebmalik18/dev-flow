export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  initials: string;
  role: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  progress: number;
  status: "on-track" | "at-risk" | "delayed" | "completed";
  dueDate: string;
  teamSize: number;
  tasksCompleted: number;
  totalTasks: number;
  color: string;
  team: User[];
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  project: string;
  projectId: string;
  assignee: User;
  priority: "low" | "medium" | "high" | "critical";
  status: "todo" | "in-progress" | "review" | "done";
  dueDate: string;
  isOverdue: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ActivityItem {
  id: string;
  type: "commit" | "comment" | "task" | "file" | "user" | "project";
  user: User;
  action: string;
  target: string;
  time: string;
  project?: string;
  projectId?: string;
}

export interface DashboardStats {
  activeProjects: number;
  tasksCompleted: number;
  hoursTracked: string;
  teamMembers: number;
  projectsChange: number;
  tasksChange: number;
  hoursChange: number;
  membersChange: number;
}

// Temporary data for development
export const tempUsers: User[] = [
  {
    id: "1",
    name: "Alex Johnson",
    email: "alex@devflow.com",
    initials: "AJ",
    role: "Frontend Developer",
  },
  {
    id: "2",
    name: "Sarah Chen",
    email: "sarah@devflow.com",
    initials: "SC",
    role: "UI/UX Designer",
  },
  {
    id: "3",
    name: "Mike Rodriguez",
    email: "mike@devflow.com",
    initials: "MR",
    role: "Backend Developer",
  },
  {
    id: "4",
    name: "Emma Wilson",
    email: "emma@devflow.com",
    initials: "EW",
    role: "DevOps Engineer",
  },
  {
    id: "5",
    name: "David Park",
    email: "david@devflow.com",
    initials: "DP",
    role: "Full Stack Developer",
  },
];

export const tempProjects: Project[] = [
  {
    id: "1",
    name: "E-commerce Platform",
    description:
      "Modern React-based shopping platform with microservices architecture",
    progress: 78,
    status: "on-track",
    dueDate: "Dec 15",
    teamSize: 8,
    tasksCompleted: 23,
    totalTasks: 30,
    color: "bg-blue-500",
    team: tempUsers.slice(0, 4),
    createdAt: "2024-10-01",
    updatedAt: "2024-12-08",
  },
  {
    id: "2",
    name: "Mobile App Redesign",
    description: "Complete UI/UX overhaul for iOS and Android applications",
    progress: 45,
    status: "at-risk",
    dueDate: "Jan 8",
    teamSize: 5,
    tasksCompleted: 12,
    totalTasks: 28,
    color: "bg-purple-500",
    team: tempUsers.slice(1, 4),
    createdAt: "2024-11-01",
    updatedAt: "2024-12-08",
  },
  {
    id: "3",
    name: "API Gateway",
    description: "Microservices architecture implementation with GraphQL",
    progress: 92,
    status: "completed",
    dueDate: "Nov 30",
    teamSize: 6,
    tasksCompleted: 18,
    totalTasks: 18,
    color: "bg-green-500",
    team: tempUsers.slice(0, 3),
    createdAt: "2024-09-15",
    updatedAt: "2024-11-30",
  },
  {
    id: "4",
    name: "Marketing Website",
    description: "New company website with headless CMS integration",
    progress: 25,
    status: "delayed",
    dueDate: "Dec 1",
    teamSize: 4,
    tasksCompleted: 5,
    totalTasks: 22,
    color: "bg-red-500",
    team: tempUsers.slice(2, 5),
    createdAt: "2024-10-15",
    updatedAt: "2024-12-08",
  },
];

export const tempTasks: Task[] = [
  {
    id: "1",
    title: "Implement user authentication system",
    description: "Set up JWT-based authentication with refresh tokens",
    project: "E-commerce Platform",
    projectId: "1",
    assignee: tempUsers[0],
    priority: "high",
    status: "in-progress",
    dueDate: "Today",
    isOverdue: false,
    tags: ["backend", "security"],
    createdAt: "2024-12-06",
    updatedAt: "2024-12-08",
  },
  {
    id: "2",
    title: "Design product catalog UI components",
    description: "Create reusable components for product listings",
    project: "Mobile App Redesign",
    projectId: "2",
    assignee: tempUsers[1],
    priority: "medium",
    status: "review",
    dueDate: "Tomorrow",
    isOverdue: false,
    tags: ["design", "components"],
    createdAt: "2024-12-05",
    updatedAt: "2024-12-08",
  },
  {
    id: "3",
    title: "Fix critical payment gateway bug",
    description: "Resolve timeout issues with Stripe integration",
    project: "E-commerce Platform",
    projectId: "1",
    assignee: tempUsers[2],
    priority: "critical",
    status: "todo",
    dueDate: "2 days ago",
    isOverdue: true,
    tags: ["bug", "payment", "urgent"],
    createdAt: "2024-12-03",
    updatedAt: "2024-12-06",
  },
  {
    id: "4",
    title: "Update API documentation",
    description: "Document new endpoints and update examples",
    project: "API Gateway",
    projectId: "3",
    assignee: tempUsers[3],
    priority: "low",
    status: "done",
    dueDate: "Dec 8",
    isOverdue: false,
    tags: ["documentation", "api"],
    createdAt: "2024-12-01",
    updatedAt: "2024-12-08",
  },
  {
    id: "5",
    title: "Optimize database query performance",
    description: "Improve slow queries in user dashboard",
    project: "E-commerce Platform",
    projectId: "1",
    assignee: tempUsers[4],
    priority: "medium",
    status: "in-progress",
    dueDate: "Dec 12",
    isOverdue: false,
    tags: ["database", "optimization"],
    createdAt: "2024-12-04",
    updatedAt: "2024-12-08",
  },
];

export const tempStats: DashboardStats = {
  activeProjects: 12,
  tasksCompleted: 89,
  hoursTracked: "247h",
  teamMembers: 24,
  projectsChange: 8.2,
  tasksChange: 12.5,
  hoursChange: -2.3,
  membersChange: 0,
};
