// services/projectManagerService.ts
import { getApiUrl } from '@/lib/api';

// Helper function to get auth headers
const getAuthHeaders = async () => {
  // Get token from localStorage or your auth context
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};
export interface Project {
  id: string;
  title: string;
  description?: string;
  status: 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  progress: number;
  start_date?: string | null;
  deadline: string | null;
  cost?: number;
  discount?: number;
  client?: {
    id: string;
    name: string;
  };
  project_manager?: {
    id: string;
    user: {
      id: string;
      name?: string;
      first_name?: string;
      last_name?: string;
    };
  };
  team_members: Array<{
    id: string;
    name: string;
    avatar: string | null;
    user?: {
      name: string;
      first_name?: string;
      last_name?: string;
    };
  }>;
  created_at?: string;
  updated_at?: string;
  is_verified?: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'in_review' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date: string;
  project: {
    id: string;
    name: string;
  };
  assignee: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: 'active' | 'inactive' | 'on_leave';
  avatar: string | null;
  projects: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  joined_date: string;
}

export interface ReportData {
  projectStats: Array<{
    name: string;
    completed: number;
    inProgress: number;
    notStarted: number;
  }>;
  taskStats: Array<{
    name: string;
    completed: number;
    inProgress: number;
    overdue: number;
  }>;
  teamPerformance: Array<{
    name: string;
    completed: number;
    inProgress: number;
    efficiency: number;
  }>;
  taskDistribution: Array<{
    name: string;
    value: number;
  }>;
  overallStats: {
    totalProjects: number;
    tasksCompleted: number;
    teamProductivity: number;
    avgTaskTime: string;
  };
}

// API Response type for paginated endpoints
interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const fetchProjects = async (): Promise<Project[]> => {
  const response = await fetch(getApiUrl('projects/'), {
    headers: await getAuthHeaders()
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      // Handle unauthorized (e.g., redirect to login)
      window.location.href = '/login';
      throw new Error('Authentication required');
    }
    throw new Error('Failed to fetch projects');
  }
  
  const data: PaginatedResponse<Project> = await response.json();
  return data.results || [];
};

export const fetchTasks = async (): Promise<Task[]> => {
  try {
    const url = getApiUrl('tasks/tasks/');
    const headers = await getAuthHeaders();
    
    console.log('Fetching tasks from:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...headers,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        errorMessage = errorData.detail || errorMessage;
      } catch (e) {
        console.error('Could not parse error response', e);
      }
      
      if (response.status === 401) {
        // Clear any invalid auth tokens
        localStorage.removeItem('access_token');
        window.location.href = '/login';
        throw new Error('Authentication required');
      }
      
      throw new Error(`Failed to fetch tasks: ${errorMessage}`);
    }
    
    const data: PaginatedResponse<Task> = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error in fetchTasks:', error);
    
    // For development, return mock data
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Using mock tasks data due to error');
      return [
        {
          id: '1',
          title: 'Task 1',
          description: 'This is a sample task',
          status: 'todo',
          priority: 'medium',
          due_date: new Date(Date.now() + 86400000).toISOString(),
          project: { id: '1', name: 'Sample Project' },
          assignee: { id: '1', name: 'John Doe', avatar: null }
        }
      ];
    }
    
    throw error;
  }
};

export const fetchTeamMembers = async (): Promise<TeamMember[]> => {
  // For team members, we'll use the organization members endpoint
  const response = await fetch(getApiUrl('org/organizations/current/members/'), {
    headers: await getAuthHeaders()
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      window.location.href = '/login';
      throw new Error('Authentication required');
    }
    throw new Error('Failed to fetch team members');
  }
  
  const data: PaginatedResponse<TeamMember> = await response.json();
  return data.results || [];
};

export const fetchReports = async (): Promise<ReportData> => {
  // For demo purposes, we'll generate some sample data
  // In a real app, this would come from your reports API
  const now = new Date();
  const months = [];
  const days = [];
  
  // Generate last 6 months data
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      name: date.toLocaleString('default', { month: 'short' }),
      completed: Math.floor(Math.random() * 10) + 5,
      inProgress: Math.floor(Math.random() * 5) + 1,
      notStarted: Math.floor(Math.random() * 3) + 1
    });
  }
  
  // Generate last 7 days data
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push({
      name: date.toLocaleString('default', { weekday: 'short' }),
      completed: Math.floor(Math.random() * 15) + 5,
      inProgress: Math.floor(Math.random() * 10) + 1,
      overdue: Math.floor(Math.random() * 5)
    });
  }
  
  // Generate team performance data
  const teamMembers = ['John D.', 'Sarah M.', 'Mike T.', 'Alex R.', 'Emma W.'];
  const teamPerformance = teamMembers.map(member => ({
    name: member,
    completed: Math.floor(Math.random() * 30) + 10,
    inProgress: Math.floor(Math.random() * 10) + 1,
    efficiency: Math.floor(Math.random() * 30) + 70 // 70-100%
  }));
  
  // Generate task distribution
  const taskDistribution = [
    { name: 'Completed', value: Math.floor(Math.random() * 50) + 30 },
    { name: 'In Progress', value: Math.floor(Math.random() * 30) + 10 },
    { name: 'Not Started', value: Math.floor(Math.random() * 20) + 5 }
  ];
  
  // Calculate total tasks for percentage
  const totalTasks = taskDistribution.reduce((sum, item) => sum + item.value, 0);
  
  return {
    projectStats: months,
    taskStats: days,
    teamPerformance,
    taskDistribution,
    overallStats: {
      totalProjects: Math.floor(Math.random() * 50) + 20,
      tasksCompleted: Math.floor(totalTasks * 0.7), // 70% of tasks completed
      teamProductivity: Math.floor(Math.random() * 30) + 70, // 70-100%
      avgTaskTime: `${Math.floor(Math.random() * 4) + 1}.${Math.floor(Math.random() * 9)}h`
    }
  };
};

export const fetchProjectManagerDashboard = async () => {
  // For now, return a subset of the reports data
  const reports = await fetchReports();
  return {
    stats: [
      { title: 'Total Projects', value: reports.overallStats.totalProjects, change: '+12%', isPositive: true },
      { title: 'Tasks Completed', value: reports.overallStats.tasksCompleted, change: '+8%', isPositive: true },
      { title: 'Team Productivity', value: `${reports.overallStats.teamProductivity}%`, change: '+5%', isPositive: true },
      { title: 'Avg. Task Time', value: reports.overallStats.avgTaskTime, change: '-0.3h', isPositive: false }
    ],
    recentActivities: [
      { id: 1, title: 'Project kickoff meeting', time: '2 hours ago', status: 'completed' },
      { id: 2, title: 'Review design mockups', time: '1 day ago', status: 'in-progress' },
      { id: 3, title: 'Update project timeline', time: '2 days ago', status: 'pending' }
    ],
    upcomingDeadlines: [
      { id: 1, title: 'Project Milestone 1', dueIn: 1 },
      { id: 2, title: 'Client Review', dueIn: 3 },
      { id: 3, title: 'Sprint Planning', dueIn: 5 }
    ]
  };
};