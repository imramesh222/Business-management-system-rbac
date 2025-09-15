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
  // Add these to handle different API response formats
  organization?: OrganizationInfo;
  org?: OrganizationInfo;
}

/**
 * Fetches dashboard data for the organization
 * @param isSuperAdmin Whether the current user is a superadmin
 */
export const fetchDashboardData = async (isSuperAdmin: boolean = false, organizationId?: string): Promise<DashboardData> => {
  try {
    // Use the appropriate endpoint based on user role
    const endpoint = isSuperAdmin 
      ? '/dashboard/metrics/'  // Superadmin dashboard
      : '/dashboard/admin/overview/';  // Organization admin dashboard
    
    console.log('Fetching dashboard data from:', endpoint);
    
    // Define the response type for the member count endpoint
    interface MemberCountResponse {
      organization_id: string;
      organization_name: string;
      member_count: number;
    }
    
    // Log the API URL for debugging
    console.log('API Base URL:', process.env.NEXT_PUBLIC_API_URL);
    
    // Log the member count endpoint for debugging
    const memberCountEndpoint = `org/organizations/${organizationId}/member-count/`;
    console.log('Member count endpoint:', memberCountEndpoint);

    // Get auth token for the request
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : undefined;
    
    // Fetch dashboard data and member count in parallel
    const [dashboardResponse, memberCountResponse] = await Promise.all([
      apiGet<DashboardData>(endpoint, { token: token || undefined }),
      // Only fetch member count if we have an organization ID and token
      organizationId && token ? apiGet<MemberCountResponse>(
        `org/organizations/${organizationId}/member-count/`,
        { token }
      ).then(response => {
        console.log('Member count response:', response);
        return response;
      }).catch((error) => {
        console.error('Error fetching member count:', error);
        return { member_count: 0 } as MemberCountResponse;
      }) : Promise.resolve({ member_count: 0 } as MemberCountResponse)
    ]);
    
    console.log('Dashboard API response:', dashboardResponse);
    
    // Merge member count into metrics if available
    if (memberCountResponse?.member_count !== undefined) {
      console.log('Merging member count into metrics:', memberCountResponse.member_count);
      dashboardResponse.metrics = dashboardResponse.metrics || {};
      dashboardResponse.metrics.total_members = memberCountResponse.member_count;
      dashboardResponse.metrics.active_members = memberCountResponse.member_count; // Update active members as well if needed
      console.log('Updated metrics:', dashboardResponse.metrics);
    } else {
      console.log('No member count received from API, using default values');
    }
    
    // Check if organization info is in the response
    const orgInfo = dashboardResponse.organization_info || dashboardResponse.organization || dashboardResponse.org;
    
    // Transform the response to match our interface if needed
    const data: DashboardData = {
      metrics: {
        total_members: dashboardResponse?.metrics?.total_members ?? 0,
        active_members: dashboardResponse?.metrics?.active_members ?? 0,
        monthly_revenue: dashboardResponse?.metrics?.monthly_revenue ?? 0,
        tasks_completed: dashboardResponse?.metrics?.tasks_completed ?? 0,
        team_performance: dashboardResponse?.metrics?.team_performance ?? 0,
        active_projects: dashboardResponse?.metrics?.active_projects ?? 0,
        member_growth: dashboardResponse?.metrics?.member_growth ?? 0,
        revenue_change: dashboardResponse?.metrics?.revenue_change ?? 0,
        task_completion_rate: dashboardResponse?.metrics?.task_completion_rate ?? 0
      },
      recent_activities: ((dashboardResponse as any).recent_activities || []).map((activity: any) => ({
        id: activity.id,
        title: activity.title,
        description: activity.description,
        timestamp: activity.timestamp,
        type: (activity.type as 'info' | 'success' | 'warning' | 'error') || 'info',
        ...(activity.user && {
          user: {
            id: activity.user.id,
            name: activity.user.name,
            ...(activity.user.avatar && { avatar: activity.user.avatar })
          }
        })
      })),
      ...(orgInfo && { organization_info: orgInfo }),
      active_projects: ((dashboardResponse as any).active_projects || []).map((project: any) => ({
        id: project.id,
        name: project.name,
        status: (project.status as 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled') || 'planning',
        progress: project.progress || 0,
        members_count: project.members_count || 0,
        deadline: project.deadline,
        start_date: project.start_date,
        status_color: project.status_color || 'bg-gray-100 text-gray-800'
      })),
      // Include organization_info if available in response
      ...(orgInfo && {
        organization_info: {
          id: orgInfo.id,
          name: orgInfo.name,
          admin: {
            name: orgInfo.admin?.name || '',
            username: orgInfo.admin?.username || '',
            email: orgInfo.admin?.email || ''
          }
        }
      })
    };
    
    return data;
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    // Return empty data structure in case of error
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

/**
 * Fetches chart data for the dashboard
 * @param range Time range for the data (e.g., '7d', '30d', '90d')
 */
export const fetchChartData = async (range: string = '30d') => {
  try {
    // In a real app, this would be an API call like:
    // return await apiGet(`/api/dashboard/charts?range=${range}`);
    
    // Mock data for charts
    const now = new Date();
    const days = parseInt(range);
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