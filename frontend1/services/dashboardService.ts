import { apiGet } from '@/lib/api-client';
import { format, subDays } from 'date-fns';

// Types for dashboard data
export interface DashboardMetrics {
  total_members: number;
  active_members: number;
  monthly_revenue: number;
  tasks_completed: number;
  team_performance: number;
  active_projects: number;
  member_growth: number;
  revenue_change: number;
  task_completion_rate: number;
}

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface ProjectItem {
  due_date: string;
  description: string;
  completed_tasks: number;
  total_tasks: number;
  created_at: string;
  updated_at: string;
  id: string;
  name: string;
  status: 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  progress: number;
  members_count: number;
  deadline: string;
  start_date: string;
  status_color: string;
}

export interface OrganizationInfo {
  id: string;
  name: string;
  admin: {
    name: string;
    username: string;
    email: string;
  };
}

export interface DashboardData {
  metrics: DashboardMetrics;
  recent_activities: ActivityItem[];
  active_projects: ProjectItem[];
  organization_info?: OrganizationInfo;
  organization?: OrganizationInfo;
  org?: OrganizationInfo;
}

/**
 * Process project data to ensure all required fields have values
 */
const processProjects = (projects: any[]): ProjectItem[] => {
  if (!Array.isArray(projects)) return [];

  console.log('Raw projects data from API:', projects); // Add this line

  return projects.map(project => {
    const projectId = project.id || '';
    const defaultName = project.title || // Try title field
      project.project_name || // Try project_name field
      (projectId ? `Project ${projectId.substring(0, 8)}` : 'New Project');


    return {
      id: projectId,
      name: project.name || defaultName,
      description: project.description || 'No description available',
      status: project.status || 'in_progress',
      progress: project.progress || 0,
      members_count: project.members_count || project.member_count || 0,
      deadline: project.deadline || project.due_date || new Date().toISOString(),
      start_date: project.start_date || new Date().toISOString(),
      status_color: project.status_color ||
        (project.status === 'completed' ? '#10b981' :
          project.status === 'in_progress' ? '#3b82f6' :
            project.status === 'on_hold' ? '#f59e0b' :
              project.status === 'cancelled' ? '#ef4444' : '#9ca3af'),
      completed_tasks: project.completed_tasks || 0,
      total_tasks: project.total_tasks || 0,
      due_date: project.due_date || project.deadline || new Date().toISOString(),
      created_at: project.created_at || new Date().toISOString(),
      updated_at: project.updated_at || new Date().toISOString()
    };
  });
};

export const fetchDashboardData = async (isSuperAdmin: boolean = false, organizationId?: string): Promise<DashboardData> => {
  try {
    const endpoint = isSuperAdmin
      ? '/dashboard/metrics/'
      : '/dashboard/admin/overview/';

    console.log('Fetching dashboard data from:', endpoint);

    interface MemberCountResponse {
      organization_id: string;
      organization_name: string;
      member_count: number;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : undefined;

    const [dashboardResponse, memberCountResponse] = await Promise.all([
      apiGet<DashboardData>(endpoint, { token: token || undefined }),
      organizationId && token ? apiGet<MemberCountResponse>(
        `org/organizations/${organizationId}/member-count/`,
        { token }
      ).catch(() => ({ member_count: 0 } as MemberCountResponse))
        : Promise.resolve({ member_count: 0 } as MemberCountResponse)
    ]);

    // Handle projects
    let projects: ProjectItem[] = [];
    if ((!dashboardResponse.active_projects?.length) && organizationId && token) {
      try {
        const endpoints = [
          `org/projects/?organization_id=${organizationId}`,
          `projects/?organization=${organizationId}`,
          `organizations/${organizationId}/projects/`
        ];

        for (const endpoint of endpoints) {
          try {
            const response = await apiGet<any>(endpoint, { token });
            const result = Array.isArray(response) ? response : (response as any).results || response;
            if (Array.isArray(result) && result.length > 0) {
              projects = processProjects(result);
              if (projects.length > 0) break;
            }
          } catch (error) {
            console.warn(`Failed to fetch projects from ${endpoint}:`, error);
          }
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    }

    // Process organization info
    const orgInfo = dashboardResponse.organization_info ||
      dashboardResponse.organization ||
      dashboardResponse.org;

    // Process metrics
    const metrics = {
      total_members: memberCountResponse?.member_count || 0,
      active_members: memberCountResponse?.member_count || 0,
      monthly_revenue: dashboardResponse?.metrics?.monthly_revenue || 0,
      tasks_completed: dashboardResponse?.metrics?.tasks_completed || 0,
      team_performance: dashboardResponse?.metrics?.team_performance || 0,
      active_projects: dashboardResponse?.metrics?.active_projects || 0,
      member_growth: dashboardResponse?.metrics?.member_growth || 0,
      revenue_change: dashboardResponse?.metrics?.revenue_change || 0,
      task_completion_rate: dashboardResponse?.metrics?.task_completion_rate || 0
    };

    // Process activities
    const activities = ((dashboardResponse as any).recent_activities || []).map((activity: any) => ({
      id: activity.id || Math.random().toString(36).substr(2, 9),
      title: activity.title || 'Activity',
      description: activity.description || '',
      timestamp: activity.timestamp || new Date().toISOString(),
      type: (['info', 'success', 'warning', 'error'].includes(activity.type)
        ? activity.type
        : 'info') as 'info' | 'success' | 'warning' | 'error',
      ...(activity.user && {
        user: {
          id: activity.user.id || '',
          name: activity.user.name || 'Unknown User',
          ...(activity.user.avatar && { avatar: activity.user.avatar })
        }
      })
    }));

    return {
      metrics,
      recent_activities: activities,
      active_projects: projects.length ? projects : processProjects(dashboardResponse.active_projects || []),
      ...(orgInfo && { organization_info: orgInfo })
    };

  } catch (error) {
    console.error('Error in fetchDashboardData:', error);
    return {
      metrics: {
        total_members: 0,
        active_members: 0,
        monthly_revenue: 0,
        tasks_completed: 0,
        team_performance: 0,
        active_projects: 0,
        member_growth: 0,
        revenue_change: 0,
        task_completion_rate: 0
      },
      recent_activities: [],
      active_projects: []
    };
  }
};

export const fetchChartData = async (range: string = '30d') => {
  try {
    const now = new Date();
    const days = parseInt(range) || 30;
    const labels = Array.from({ length: days }, (_, i) =>
      format(subDays(now, days - i - 1), 'MMM dd')
    );

    return {
      labels,
      datasets: [
        {
          label: 'Active Users',
          data: Array.from({ length: days }, () => Math.floor(Math.random() * 100) + 50),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
        },
        {
          label: 'Tasks Completed',
          data: Array.from({ length: days }, () => Math.floor(Math.random() * 50) + 20),
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
        },
      ],
    };
  } catch (error) {
    console.error('Error fetching chart data:', error);
    throw error;
  }
};