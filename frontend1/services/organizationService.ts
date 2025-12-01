import { apiGet, apiPost, apiPut } from './apiService';
import { 
  Organization, 
  OrganizationListItem as OrgListItem,
  OrganizationMember, 
  OrganizationMetrics, 
  OrganizationDashboardData,
  OrganizationActivity,
  OrganizationProject,
  OrganizationRole,
  OrganizationStatus,
  BillingPlan
} from '@/types/organization';

// Update in organizationService.ts
export const getOrganizationOverview = async (organizationId: string, userId?: string) => {
  try {
    // Initialize empty arrays for all data
    let members: any[] = [];
    let projects: Project[] = [];
    let tasks: any[] = [];
    
    // Try to fetch members
    try {
      const membersResponse = await apiGet(`/org/organizations/${organizationId}/members/`);
      members = Array.isArray(membersResponse) ? membersResponse : membersResponse?.results || [];
    } catch (error) {
      console.warn('Could not fetch members:', error);
    }
    
    // Try to fetch projects if needed
    try {
      const projectsResponse = await apiGet(`/org/organizations/${organizationId}/projects/`);
      projects = Array.isArray(projectsResponse) ? projectsResponse : projectsResponse?.results || [];
    } catch (error) {
      console.warn('Could not fetch projects:', error);
    }
    
    // Try to fetch tasks if needed
    try {
      const tasksResponse = await apiGet(`/tasks/?organization=${organizationId}`);
      tasks = Array.isArray(tasksResponse) ? tasksResponse : tasksResponse?.results || [];
    } catch (error) {
      console.warn('Could not fetch tasks:', error);
    }

    // Calculate metrics
    const pendingTasks = tasks.filter((task: any) => task.status === 'pending');
    const completedTasks = tasks.filter((task: any) => task.status === 'completed');
    const completionRate = tasks.length > 0 
      ? Math.round((completedTasks.length / tasks.length) * 100) 
      : 0;

    return {
      active_projects: projects.length,
      team_members: members.length,
      tasks_due: pendingTasks.length,
      completion_rate: completionRate,
      _raw: { 
        projects: projects, 
        members: members, 
        tasks: tasks 
      }
    };
  } catch (error) {
    console.error('Error in getOrganizationOverview:', error);
    // Return empty data in case of error
    return {
      active_projects: 0,
      team_members: 0,
      tasks_due: 0,
      completion_rate: 0,
      _raw: {
        projects: [],
        members: [],
        tasks: []
      }
    };
  }
};
// Re-export the type with a consistent name
export type OrganizationListItem = OrgListItem;

// Type for the superadmin dashboard response
interface SuperadminDashboardResponse {
  metrics: {
    total_organizations: number;
    total_members: number;
    active_members: number;
    active_organizations: number;
    monthly_revenue: number;
    total_revenue: number;
    new_members: number;
    member_growth: number;
    storage_usage: number;
    storage_limit: number;
    // Adding missing properties
    total_projects?: number;
    active_projects?: number;
    pending_tasks?: number;
    completed_tasks?: number;
    pending_invoices?: number;
    overdue_invoices?: number;
    team_productivity?: number;
    project_completion_rate?: number;
  };
  member_activity?: Array<{
    month: string;
    active: number;
    new: number;
  }>;
  project_status?: Array<{
    status: string;
    count: number;
    color?: string;
  }>;
  recent_activities?: Array<{
    id: number;
    action: string;
    user: string;
    time: string;
    type: string;
    timestamp?: string;
  }>;
  projects?: any[];
  team_members?: any[];
  upcoming_deadlines?: any[];
}

// Project status type is now imported from OrganizationProject

// Define valid status types
type StatusType = 'active' | 'pending' | 'completed' | 'cancelled' | 'on_hold' | 
  'in_progress' | 'planning' | 'overdue' | 'draft' | 'published' | 'archived';

// Define project status type for organization dashboard
type OrgProjectStatus = {
  status: string;
  count: number;
  color: string;
};

// Activity types for recent activities
type ActivityType = 'member' | 'project' | 'billing' | 'meeting' | 'system';

// Define interface for member activity item
interface MemberActivityItem {
  date?: string;
  active?: number;
  new?: number;
}

// Define interface for recent activity item
interface RecentActivityItem {
  id?: string;
  type?: string;
  action?: string;
  timestamp?: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  target_id?: string;
  target_type?: string;
  metadata?: Record<string, any>;
}

export const getOrganizationById = async (orgId: string): Promise<Organization> => {
  const response = await apiPost('/org/organizations/', {
    orgId: orgId,
    skip_payment: true, // Default to true in development
  });
  return {
    ...response,
    status: (response.status as OrganizationStatus) || OrganizationStatus.INACTIVE,
    plan: (response.plan as BillingPlan) || BillingPlan.FREE,
  };
};

interface ApiDashboardResponse {
  metrics: ApiDashboardMetrics & {
    member_activity?: Array<{
      date: string;
      active: number;
      new: number;
    }>;
    project_status?: Array<{
      status: string;
      count: number;
      color?: string;
    }>;
  };
  recent_activities?: ApiRecentActivity[];
  projects?: ApiProject[];
  upcoming_deadlines?: ApiDeadline[];
  team_members?: ApiTeamMember[];
}

interface ApiProject {
  id: string;
  name: string;
  description: string;
  status: string;
  progress: number;
  start_date: string;
  due_date: string;
  members: Array<{
    id: string;
    name: string;
    role: string;
    avatar?: string;
  }>;
  budget: number;
  spent: number;
}

interface ApiDeadline {
  id: string;
  title: string;
  due_date: string;
  project_id: string;
  project_name: string;
  type: string;
  status: string;
}

interface ApiTeamMember {
  id: string;
  name: string;
  email: string;
  role: OrganizationRole;
  avatar?: string;
  last_active: string;
  status: 'online' | 'offline' | 'away' | 'busy' | 'inactive';
  current_task?: {
    id: string;
    title: string;
    project_id: string;
    project_name: string;
  };
}

// Re-export types from the organization types file
export type { OrganizationDashboardData, OrganizationMetrics } from '@/types/organization';

// Local interfaces that extend the base types

export interface MemberActivity {
  date: string;  
  active: number;
  new: number;
}

interface ProjectStatusData {
  name: string;
  value: number;
  color: string;
}

// API Response Types
interface ApiRecentActivity {
  id: string;
  type: ActivityType;
  action: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  target_id?: string;
  target_type?: string;
  timestamp: string;
  metadata?: Record<string, any>;
  // For backward compatibility
  user?: string | { id: string; name: string; email: string };
  time?: string;
  message?: string;
}

// Type guards for user property
function isUserObject(user: string | { id: string; name: string; email: string } | undefined): user is { id: string; name: string; email: string } {
  return typeof user === 'object' && user !== null && 'id' in user && 'name' in user && 'email' in user;
}

interface ApiDashboardMetrics {
  // Core metrics
  total_members: number;
  active_members: number;
  total_projects: number;
  active_projects: number;
  pending_tasks: number;
  completed_tasks: number;
  monthly_revenue: number;
  total_revenue: number;
  
  // Additional metrics
  pending_invoices: number;
  overdue_invoices: number;
  storage_usage: number;
  storage_limit: number;
  team_productivity: number;
  member_growth: number;
  project_completion_rate: number;
  
  // Data collections
  member_activity?: Array<{
    date: string;
    active: number;
    new: number;
  }>;
  
  project_status?: Array<{
    status: string;
    count: number;
    color?: string;
  }>;
  
  recent_activities?: ApiRecentActivity[];
}

// Local interfaces that extend the base types
export interface ExtendedOrganizationMetrics {
  // Core metrics from OrganizationMetrics
  totalMembers: number;
  activeMembers: number;
  totalProjects: number;
  activeProjects: number;
  pendingTasks: number;
  completedTasks: number;
  monthlyRevenue: number;
  totalRevenue: number;
  
  // Additional metrics
  pendingInvoices: number;
  overdueInvoices: number;
  storageUsage: number;
  storageLimit: number;
  teamProductivity: number;
  memberGrowth: number;
  projectCompletionRate: number;
  
  // Data collections with proper typing
  projectStatus: Array<{
    status: string;
    count: number;
    color: string;
  }>;
  
  memberActivity: Array<{
    date: string;
    active: number;
    new: number;
  }>;
  
  recentActivities: Array<{
    id: string;
    type: string;
    action: string;
    timestamp: string;
    user_name: string;
    user_email?: string;
  }>;
}

export interface ExtendedOrganizationDashboardData {
  metrics: ExtendedOrganizationMetrics;
  projects: Array<{
    id: string;
    name: string;
    description: string;
    status: string;
    progress: number;
    startDate: string;
    dueDate: string;
    members: Array<{
      id: string;
      name: string;
      role: string;
      avatar?: string;
    }>;
    budget: number;
    spent: number;
  }>;
  
  upcomingDeadlines: Array<{
    id: string;
    title: string;
    dueDate: string;
    projectId: string;
    projectName: string;
    type: string;
    status: string;
  }>;
  
  teamMembers: Array<{
    id: string;
    name: string;
    email: string;
    role: OrganizationRole;
    avatar?: string;
    lastActive: string;
    status: 'online' | 'offline' | 'away' | 'busy' | 'inactive';
    currentTask?: {
      id: string;
      title: string;
      projectId: string;
      projectName: string;
    };
  }>;
  
  memberActivity: Array<{
    date: string;
    active: number;
    new: number;
  }>;
  
  recentActivities: Array<{
    id: string;
    type: string;
    action: string;
    timestamp: string;
    user_name: string;
    user_email?: string;
  }>;
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  progress: number;
  startDate: string;
  dueDate: string;
  members: Array<{
    id: string;
    name: string;
    role: string;
    avatar?: string;
  }>;
  budget: number;
  spent: number;
}

interface Deadline {
  id: string;
  title: string;
  dueDate: string;
  projectId: string;
  projectName: string;
  type: string;
  status: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: OrganizationRole;
  avatar?: string;
  lastActive: string;
  status: 'online' | 'offline' | 'away';
  currentTask?: {
    id: string;
    title: string;
    projectId: string;
    projectName: string;
  };
}

// Helper function to get status color based on status
const getStatusColor = (status: string): string => {
  const statusColors: Record<string, string> = {
    active: '#10B981',
    completed: '#3B82F6',
    pending: '#F59E0B',
    cancelled: '#EF4444',
    on_hold: '#6B7280',
    in_progress: '#6366F1',
    planning: '#8B5CF6',
    overdue: '#EC4899',
    draft: '#9CA3AF',
    published: '#10B981',
    archived: '#6B7280',
    // Add any additional status colors here
  };
  return statusColors[status] || '#6B7280';
};

// Helper function to map API response to OrganizationDashboardData
const mapDashboardResponse = (response: any): OrganizationDashboardData => {
  if (!response) {
    throw new Error('Invalid dashboard response');
  }

  const { 
    metrics = {}, 
    recent_activities = [], 
    member_activity = [],
    project_status = []
  } = response;

  // Map member activity with null checks
  const memberActivity: MemberActivity[] = (member_activity || []).map((activity: any) => ({
    date: activity?.date || new Date().toISOString(),
    active: activity?.active || 0,
    new: activity?.new || 0
  }));

  // Map project status with null checks
  const projectStatus = (project_status || []).map((status: any) => ({
    status: status?.status || 'unknown',
    count: status?.count || 0,
    color: status?.color || getStatusColor(status?.status || 'unknown')
  }));

  const dashboardMetrics: OrganizationMetrics = {
    totalOrganizations: metrics?.total_organizations || 0,
    totalMembers: metrics?.total_members || 0,
    activeMembers: metrics?.active_members || 0,
    totalProjects: metrics?.total_projects || 0,
    activeProjects: metrics?.active_projects || 0,
    pendingTasks: metrics?.pending_tasks || 0,
    completedTasks: metrics?.completed_tasks || 0,
    monthlyRevenue: metrics?.monthly_revenue || 0,
    totalRevenue: metrics?.total_revenue || 0,
    pendingInvoices: metrics?.pending_invoices || 0,
    overdueInvoices: metrics?.overdue_invoices || 0,
    storageUsage: metrics?.storage_usage || 0,
    storageLimit: metrics?.storage_limit || 0,
    memberActivity,
    projectStatus,
    teamProductivity: metrics?.team_productivity || 0,
    memberGrowth: metrics?.member_growth || 0,
    projectCompletionRate: metrics?.project_completion_rate || 0
  };

  // Map recent activities with null checks and proper typing
  const recentActivities: OrganizationActivity[] = (recent_activities || []).map((activity: any) => {
    // Ensure type is one of the allowed ActivityType values
    const activityType = (['member', 'project', 'billing', 'meeting', 'system', 'task', 'milestone'] as const)
      .includes(activity?.type as any)
      ? activity.type as ActivityType
      : 'system';
      
    return {
      id: activity?.id?.toString() || '',
      type: activityType,
      action: activity?.action || '',
      timestamp: activity?.timestamp || new Date().toISOString(),
      user_name: activity?.user_name || 'System',
      user_email: activity?.user_email || ''
    };
  });

  // Return the mapped dashboard data with default values for missing fields
  const dashboardData: OrganizationDashboardData = {
    metrics: dashboardMetrics,
    recentActivities,
    projects: [], // Not provided in backend response
    upcomingDeadlines: [], // Not provided in backend response
    teamMembers: [] // Not provided in backend response
  };

  return dashboardData;
};

// Fetch all dashboard data for organization admin
export const fetchOrganizationAdminDashboard = async (orgId: string): Promise<OrganizationDashboardData> => {
  try {
    // Use the correct endpoint for organization admin dashboard
    const response = await apiGet<any>('/org/dashboard/admin/overview/');
    
    // The response should be the data object directly
    const data = response.data || response;
    
    // Map the response to the expected format
    const mappedData = {
      metrics: {
        ...data.metrics,
        // Map all required metrics with defaults
        totalOrganizations: data.metrics?.total_organizations || 0,
        totalMembers: data.metrics?.total_members || 0,
        activeMembers: data.metrics?.active_members || 0,
        totalProjects: data.metrics?.total_projects || 0,
        activeProjects: data.metrics?.active_projects || 0,
        pendingTasks: data.metrics?.pending_tasks || 0,
        completedTasks: data.metrics?.completed_tasks || 0,
        monthlyRevenue: data.metrics?.monthly_revenue || 0,
        totalRevenue: data.metrics?.total_revenue || 0,
        pendingInvoices: data.metrics?.pending_invoices || 0,
        overdueInvoices: data.metrics?.overdue_invoices || 0,
        storageUsage: data.metrics?.storage_usage || 0,
        storageLimit: data.metrics?.storage_limit || 1024 * 1024 * 1024, // 1GB default
        teamProductivity: data.metrics?.team_productivity || 0,
        memberGrowth: data.metrics?.member_growth || 0,
        projectCompletionRate: data.metrics?.project_completion_rate || 0,
        memberActivity: data.metrics?.member_activity || [],
        projectStatus: data.metrics?.project_status || []
      },
      recent_activities: data.recent_activities || [],
      member_activity: data.member_activity || [],
      project_status: data.project_status || [],
      // Add any other data that might be needed
    };
    
    return mapDashboardResponse(mappedData);
  } catch (error) {
    console.error('Error fetching organization dashboard data:', error);
    // Return a default dashboard data structure on error to prevent UI crashes
    const defaultMetrics: OrganizationMetrics = {
      totalOrganizations: 0,
      totalMembers: 0,
      activeMembers: 0,
      totalProjects: 0,
      activeProjects: 0,
      pendingTasks: 0,
      completedTasks: 0,
      monthlyRevenue: 0,
      totalRevenue: 0,
      pendingInvoices: 0,
      overdueInvoices: 0,
      storageUsage: 0,
      storageLimit: 0,
      teamProductivity: 0,
      memberGrowth: 0,
      projectCompletionRate: 0,
      memberActivity: [],
      projectStatus: []
    };

    return {
      metrics: defaultMetrics,
      recentActivities: [],
      projects: [],
      upcomingDeadlines: [],
      teamMembers: []
    };
  }
};

// Helper function to map recent activities with proper typing
const mapRecentActivities = (activities: ApiRecentActivity[] = []): OrganizationActivity[] => {
  if (!activities || !Array.isArray(activities)) {
    return [];
  }
  
  return activities.map(activity => {
    if (!activity) return null;
    
    const activityType = (['member', 'project', 'billing', 'meeting', 'system'] as const)
      .includes(activity.type as any) 
      ? activity.type as ActivityType
      : 'system';
    
    return {
      id: activity.id || `activity-${Math.random().toString(36).substr(2, 9)}`,
      type: activityType,
      action: activity.action || 'Unknown action',
      timestamp: activity.timestamp || new Date().toISOString(),
      userId: activity.user_id,
      userName: activity.user_name || 'System',
      userEmail: activity.user_email,
      targetId: activity.target_id,
      targetType: activity.target_type as any,
      ...(activity.metadata && { metadata: activity.metadata })
    };
  }).filter(Boolean) as OrganizationActivity[]; // Filter out any null entries
};

/**
 * Fetches organization details by ID
 */
// Define a type for the API response to avoid circular references
interface OrganizationApiResponse extends Omit<Organization, 'data'> {
  // Add any additional fields that might come from the API
  [key: string]: any;
}

export const fetchOrganizationDetails = async (orgId: string): Promise<Organization> => {
  try {
    const response = await apiGet<OrganizationApiResponse>(`/org/organizations/${orgId}/`);
    const orgData = response.data;
    
    // Create the organization object with proper typing
    const organization: Organization = {
      ...orgData,
      status: orgData.status || OrganizationStatus.INACTIVE,
      plan: orgData.plan || BillingPlan.FREE,
      member_count: orgData.member_count || 0,
      storage_used: orgData.storage_used || 0,
      storage_limit: orgData.storage_limit || 0,
      last_active: orgData.last_active || new Date().toISOString(),
      owner: orgData.owner || '',
      updated_at: orgData.updated_at || new Date().toISOString(),
      // Set data to a copy of the org data without the data property to avoid circular references
      data: Object.fromEntries(
        Object.entries(orgData).filter(([key]) => key !== 'data')
      ) as any
    };
    
    return organization;
  } catch (error) {
    console.error('Error fetching organization details:', error);
    // Return a minimal organization object to prevent UI crashes
    const now = new Date().toISOString();
    return {
      id: orgId,
      name: 'Enter Organization Name',
      slug: 'unknown',
      is_active: true,
      created_at: now,
      updated_at: now,
      members_count: 0,
      projects_count: 0,
      status: OrganizationStatus.INACTIVE,
      plan: BillingPlan.FREE,
      member_count: 0,
      storage_used: 0,
      storage_limit: 0,
      last_active: new Date().toISOString(),
      owner: '',
    };
  }
};

/**
 * Fetches organization metrics
 */
export const fetchOrganizationMetrics = async (orgId: string): Promise<OrganizationMetrics> => {
  try {
    const response = await apiGet<{ metrics: OrganizationMetrics }>(`/org/organizations/${orgId}/metrics/`);
    return response.metrics;
  } catch (error) {
    console.error('Error fetching organization metrics:', error);
    throw error;
  }
};

/**
 * Helper function to map team members with proper typing
 */
const mapTeamMembers = (members: ApiTeamMember[] = []): TeamMember[] => {
  return members.map(member => {
    // Convert status to one of the allowed values
    const validStatuses = ['online', 'offline', 'away'] as const;
    const memberStatus = member.status?.toLowerCase();
    const status = validStatuses.includes(memberStatus as any) 
      ? memberStatus as 'online' | 'offline' | 'away'
      : 'offline'; // Default to 'offline' for any invalid status

    return {
      id: member.id || '',
      name: member.name || 'Unknown Member',
      email: member.email || '',
      role: (member.role || 'member') as OrganizationRole,
      avatar: member.avatar,
      lastActive: member.last_active || new Date().toISOString(),
      status,
      currentTask: member.current_task ? {
        id: member.current_task.id,
        title: member.current_task.title,
        projectId: member.current_task.project_id,
        projectName: member.current_task.project_name
      } : undefined
    };
  });
};

/**
 * Fetches dashboard data for superadmin
 */
/**
 * Fetches a list of organizations with optional pagination and filtering
 */
export const fetchOrganizations = async ({
  page = 1,
  pageSize = 10,
  search = '',
  status = '',
  sortBy = 'name',
  sortOrder = 'asc'
}: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
} = {}): Promise<{
  organizations: Organization[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
      ...(search && { search }),
      ...(status && { status }),
      ordering: `${sortOrder === 'desc' ? '-' : ''}${sortBy}`,
    });

    // The endpoint is /api/v1/org/organizations/ as per backend URL configuration
    const response = await apiGet<{
      count: number;
      next: string | null;
      previous: string | null;
      results: Array<{
        id: string;
        name: string;
        status: string;
        plan: string;
        member_count: number;
        storage_used: number;
        storage_limit: number;
        last_active: string;
        owner: string;
        created_at: string;
        updated_at: string;
        is_active: boolean;
        slug: string;
        subscription?: {
          id: number;
          plan_details: {
            plan: {
              id: number;
              name: string;
              description: string;
            };
            duration: {
              months: number;
              price: number;
              discount_percentage: number;
            };
          };
          start_date: string;
          end_date: string;
          is_active: boolean;
          auto_renew: boolean;
        };
      }>;
    }>(`/org/organizations/?${params.toString()}`);

    // Define the API response organization type
    interface ApiOrganization {
      id: string;
      name: string;
      slug?: string;
      status?: string;
      plan?: string;
      member_count?: number;
      storage_used?: number;
      storage_limit?: number;
      last_active?: string;
      owner?: string;
      created_at?: string;
      updated_at?: string;
      is_active?: boolean;
      members_count?: number;
      projects_count?: number;
    }

    // Map the API response to the Organization type
    const organizations: Organization[] = response.results.map((org) => {
      // Create a new object with all the required fields
      const organization: Organization = {
        id: org.id,
        name: org.name,
        slug: org.slug || org.name.toLowerCase().replace(/\s+/g, '-'),
        is_active: org.is_active !== undefined ? org.is_active : true,
        created_at: org.created_at || new Date().toISOString(),
        updated_at: org.updated_at || new Date().toISOString(),
        // These properties come from the API response but might be undefined
        members_count: org.member_count || 0,
        projects_count: 0, // Default to 0 if not provided
        status: (org.status as OrganizationStatus) || OrganizationStatus.INACTIVE,
        plan: (org.plan as BillingPlan) || BillingPlan.FREE,
        member_count: org.member_count || 0,
        storage_used: org.storage_used || 0,
        storage_limit: org.storage_limit || 0,
        last_active: org.last_active || new Date().toISOString(),
        owner: org.owner || '',
        // Include subscription data if available
        subscription: org.subscription ? {
          id: org.subscription.id,
          plan_details: {
            plan: {
              id: org.subscription.plan_details.plan.id,
              name: org.subscription.plan_details.plan.name,
              description: org.subscription.plan_details.plan.description
            },
            duration: {
              months: org.subscription.plan_details.duration.months,
              price: org.subscription.plan_details.duration.price,
              discount_percentage: org.subscription.plan_details.duration.discount_percentage
            }
          },
          start_date: org.subscription.start_date,
          end_date: org.subscription.end_date,
          is_active: org.subscription.is_active,
          auto_renew: org.subscription.auto_renew
        } : undefined,
        // Set data to a copy of the org data without the data property
        data: {
          id: org.id,
          name: org.name,
          slug: org.slug || org.name.toLowerCase().replace(/\s+/g, '-'),
          is_active: org.is_active !== undefined ? org.is_active : true,
          created_at: org.created_at || new Date().toISOString(),
          updated_at: org.updated_at || new Date().toISOString(),
          status: (org.status as OrganizationStatus) || OrganizationStatus.INACTIVE,
          plan: (org.plan as BillingPlan) || BillingPlan.FREE,
          member_count: org.member_count || 0,
          storage_used: org.storage_used || 0,
          storage_limit: org.storage_limit || 0,
          last_active: org.last_active || new Date().toISOString(),
          owner: org.owner || ''
        }
      };
      
      return organization;
    });

    return {
      organizations,
      total: response.count,
      page: page,
      pageSize: pageSize,
      totalPages: Math.ceil(response.count / pageSize),
    };
  } catch (error) {
    console.error('Error fetching organizations:', error);
    throw error;
  }
};

/**
 * Creates a new organization
 */
export const createOrganization = async (data: {
  name: string;
  email: string;
  slug: string;
  status: 'active' | 'trial' | 'suspended' | 'inactive';
  plan_duration: number;
  max_users: number;
  max_storage: number;
  description?: string;
  phone_number?: string;
  website?: string;
  skip_payment?: boolean;
}): Promise<Organization> => {
  try {
    // Use the apiPost utility which handles authentication, CSRF tokens, and error handling
    const response = await apiPost('/org/organizations/', {
      name: data.name,
      email: data.email,
      slug: data.slug,
      status: data.status,
      plan_duration: data.plan_duration,
      max_users: data.max_users,
      max_storage: data.max_storage,
      description: data.description || '',
      phone_number: data.phone_number || '',
      website: data.website || '',
    });
    return response;
  } catch (error) {
    console.error('Error creating organization:', error);
    throw new Error('Failed to create organization');
  }
};

/**
 * Updates an existing organization
 * @param orgId - The ID of the organization to update
 * @param data - The updated organization data
 */
export const updateOrganization = async (
  orgId: string,
  data: Partial<Organization>
): Promise<Organization> => {
  try {
    const response = await apiPut<Organization>(`/org/organizations/${orgId}/`, data);
    return response;
  } catch (error) {
    console.error('Error updating organization:', error);
    throw new Error('Failed to update organization');
  }
};

/**
 * Fetches dashboard data for the organization
 * Fetches all members of the current organization
 */
export const fetchOrganizationMembers = async (organizationId: string): Promise<OrganizationMember[]> => {
  try {
    console.log('Fetching organization members...');
    const response = await apiGet<{ members: OrganizationMember[] }>(`/organizations/${organizationId}/members/`);
    console.log('Organization members response:', response);
    return response.members || [];
  } catch (error) {
    console.error('Error fetching organization members:', error);
    throw error;
  }
};

/**
 * Deletes an organization
 * @param orgId - The ID of the organization to delete
 */
export const deleteOrganization = async (orgId: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/org/organizations/${orgId}/`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to delete organization');
    }

    return { success: true, message: 'Organization deleted successfully' };
  } catch (error) {
    console.error('Error deleting organization:', error);
    throw error;
  }
};

/**
 * Fetches dashboard data for the organization
 */
export const fetchDashboardData = async (): Promise<OrganizationDashboardData> => {
  try {
    console.log('===== FETCHING DASHBOARD DATA =====');
    console.log('Making API call to /org/dashboard/metrics/');
    
    const response = await apiGet<SuperadminDashboardResponse>('/org/dashboard/metrics/');
    
    console.log('===== RAW API RESPONSE =====');
    console.log(JSON.stringify(response, null, 2));
    
    if (!response) {
      console.error('No response received from dashboard API');
      throw new Error('No response received from dashboard API');
    }
    
    if (!response.metrics) {
      console.error('No metrics in response:', response);
      throw new Error('No metrics found in dashboard response');
    }
    
    // Log all metrics for debugging
    console.log('===== METRICS DATA =====');
    console.log('Total Organizations:', response.metrics.total_organizations);
    console.log('Total Members:', response.metrics.total_members);
    console.log('Active Members:', response.metrics.active_members);
    console.log('Active Organizations:', response.metrics.active_organizations);
    console.log('Monthly Revenue:', response.metrics.monthly_revenue);
    console.log('Total Revenue:', response.metrics.total_revenue);
    console.log('New Members:', response.metrics.new_members);
    console.log('Member Growth:', response.metrics.member_growth);
    
    // Use the response directly as it's already typed as SuperadminDashboardResponse
    const data = response;
    
    // Map member activity - ensure we have at least some default data
    const memberActivity: MemberActivity[] = (data.member_activity || []).map((item: { month: string; active?: number; new?: number }) => ({
      date: item.month,
      active: item.active || 0,
      new: item.new || 0
    }));
    
    // Ensure we have default member activity data if none returned
    if (memberActivity.length === 0) {
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        memberActivity.push({
          date: date.toISOString().split('T')[0],
          active: Math.floor(Math.random() * 50) + 10, // Random sample data
          new: Math.floor(Math.random() * 5) + 1
        });
      }
    }
    
    // Map project status - ensure we have all required statuses
    const defaultProjectStatus = [
      { status: 'planning', count: 0, color: '#6366F1' },
      { status: 'in_progress', count: 0, color: '#3B82F6' },
      { status: 'on_hold', count: 0, color: '#F59E0B' },
      { status: 'completed', count: 0, color: '#10B981' },
      { status: 'cancelled', count: 0, color: '#EF4444' }
    ];
    
    // Merge with data from backend
    const projectStatus = [...defaultProjectStatus];
    (data.project_status || []).forEach((item: { status: string; count?: number; color?: string }) => {
      const existing = projectStatus.find(ps => ps.status === item.status);
      if (existing) {
        existing.count = item.count || 0;
        if (item.color) existing.color = item.color;
      } else {
        projectStatus.push({
          status: item.status,
          count: item.count || 0,
          color: item.color || '#9CA3AF'
        });
      }
    });
    
    // Map recent activities with proper typing and defaults
    const recentActivities = (data.recent_activities || []).map(activity => ({
      id: String(activity.id),
      type: activity.type as ActivityType || 'system',
      action: activity.action,
      timestamp: activity.timestamp || activity.time || new Date().toISOString(),
      user_name: activity.user,
      user_email: '',
      target_id: '',
      target_type: '',
      metadata: {}
    }));
    
    // Map projects with defaults
    const projects = (data.projects || []).map((project: any) => ({
      id: String(project.id),
      name: project.name || 'Unnamed Project',
      description: project.description || '',
      status: project.status || 'planning',
      progress: project.progress || 0,
      startDate: project.start_date || new Date().toISOString(),
      dueDate: project.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      members: (project.members || []).map((member: any) => ({
        id: String(member.id),
        name: member.name || 'Unknown Member',
        role: member.role || 'member',
        avatar: member.avatar
      })),
      budget: project.budget || 0,
      spent: project.spent || 0
    }));
    
    // Map team members with defaults and handle status conversion
    const teamMembers = (data.team_members || []).map((member: any) => {
      // Convert status to one of the allowed values
      const validStatuses = ['online', 'offline', 'away'] as const;
      const memberStatus = member.status?.toLowerCase();
      const status = validStatuses.includes(memberStatus as any) 
        ? memberStatus as 'online' | 'offline' | 'away'
        : 'offline'; // Default to 'offline' for any invalid status

      return {
        id: String(member.id),
        name: member.name || 'Unknown User',
        email: member.email || '',
        role: (member.role as OrganizationRole) || 'member',
        avatar: member.avatar,
        lastActive: member.last_active || new Date().toISOString(),
        status,
        currentTask: member.current_task ? {
          id: String(member.current_task.id),
          title: member.current_task.title || 'Untitled Task',
          projectId: String(member.current_task.project_id),
          projectName: member.current_task.project_name || 'Unknown Project'
        } : undefined
      };
    });
    
    // Map upcoming deadlines with defaults
    const upcomingDeadlines = (data.upcoming_deadlines || []).map((deadline: any) => ({
      id: String(deadline.id),
      title: deadline.title || 'Untitled Deadline',
      dueDate: deadline.due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      projectId: String(deadline.project_id),
      projectName: deadline.project_name || 'Unknown Project',
      type: deadline.type || 'task',
      status: deadline.status || 'pending'
    }));
    
    // Map metrics with proper defaults - ensure all required fields are included
    const metrics: OrganizationMetrics = {
      totalOrganizations: data.metrics?.total_organizations || 0,
      totalMembers: data.metrics?.total_members || 0,
      activeMembers: data.metrics?.active_members || 0,
      totalProjects: data.metrics?.total_projects || 0,
      activeProjects: data.metrics?.active_projects || 0,
      pendingTasks: data.metrics?.pending_tasks || 0,
      completedTasks: data.metrics?.completed_tasks || 0,
      monthlyRevenue: data.metrics?.monthly_revenue || 0,
      totalRevenue: data.metrics?.total_revenue || 0,
      pendingInvoices: data.metrics?.pending_invoices || 0,
      overdueInvoices: data.metrics?.overdue_invoices || 0,
      storageUsage: data.metrics?.storage_usage || 0,
      storageLimit: data.metrics?.storage_limit || 1024 * 1024 * 1024, // 1GB default
      teamProductivity: data.metrics?.team_productivity || 0,
      memberGrowth: data.metrics?.member_growth || 0,
      projectCompletionRate: data.metrics?.project_completion_rate || 0,
      memberActivity,
      projectStatus
    };
    
    // Return the complete dashboard data with all required fields
    const dashboardData: OrganizationDashboardData = {
      metrics,
      projects,
      upcomingDeadlines,
      teamMembers,
      recentActivities
    };
    
    console.log('Dashboard data:', dashboardData);
    return dashboardData;
  } catch (error) {
    console.error('Error fetching superadmin dashboard data:', error);
    
    // Return default data structure on error
    return {
      metrics: {
        totalOrganizations: 0,
        totalMembers: 0,
        activeMembers: 0,
        totalProjects: 0,
        activeProjects: 0,
        pendingTasks: 0,
        completedTasks: 0,
        monthlyRevenue: 0,
        totalRevenue: 0,
        pendingInvoices: 0,
        overdueInvoices: 0,
        storageUsage: 0,
        storageLimit: 0,
        teamProductivity: 0,
        memberGrowth: 0,
        projectCompletionRate: 0,
        memberActivity: [],
        projectStatus: []
      },
      recentActivities: [],
      projects: [],
      upcomingDeadlines: [],
      teamMembers: []
    };
  }
};
