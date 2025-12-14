'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { fetchDashboardData } from '@/services/dashboardService';
import { apiGet } from '@/services/apiService';
import { getCurrentUser } from '@/lib/auth';
import { API_URL } from '@/constant';
import {
  Users,
  Clock,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  BarChart3,
  DollarSign,
  FileText,
  Settings,
  Bell,
  Zap,
  Target,
  Loader2,
  Building2,
  Mail,
  Shield,
  UserCheck,
  Plus
} from 'lucide-react';
import { MetricCard } from '@/components/common/dashboard/MetricCard';
import { ActivityFeed } from '@/components/common/dashboard/ActivityFeed';
import { DashboardSection } from '@/components/common/dashboard/DashboardSection';

interface OrganizationInfo {
  id: string;
  name: string;
  admin: {
    name: string;
    username: string;
    email: string;
  };
}

interface UserOrganization {
  id: string;
  name: string;
  organization_name?: string;
}

interface ProjectItem {
  id: string;
  name: string;
  status: 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  progress: number;
  members_count: number;
  deadline: string;
  start_date: string;
  status_color: string;
  // Additional properties we might need
  description?: string;
  completed_tasks?: number;
  total_tasks?: number;
  due_date?: string;
  created_at?: string;
  updated_at?: string;
}

interface DashboardMetrics {
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

export default function OrganizationDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    total_members: 0,
    active_members: 0,
    monthly_revenue: 0,
    tasks_completed: 0,
    team_performance: 0,
    active_projects: 0,
    member_growth: 0,
    revenue_change: 0,
    task_completion_rate: 0
  });
  const [activities, setActivities] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [organizationInfo, setOrganizationInfo] = useState<OrganizationInfo | null>(null);

  const fetchUserOrganization = useCallback(async (userId: string): Promise<UserOrganization | null> => {
    try {
      console.log('Fetching user organization data for user:', userId);

      // First, try to get the user's organization from the user endpoint
      try {
        const userResponse = await apiGet(`${API_URL}/users/me/`);
        console.log('User response:', userResponse);

        if (userResponse?.organization) {
          console.log('Using organization from user profile:', userResponse.organization);
          return {
            id: userResponse.organization.id.toString(),
            name: userResponse.organization.name || 'My Organization'
          };
        }
      } catch (userError) {
        console.log('Error fetching user profile:', userError);
      }

      // Try to get the user's organization from the dashboard data
      try {
        const dashboardData = await fetchDashboardData();
        console.log('Dashboard data:', dashboardData);

        // Check all possible organization fields in the response
        const orgInfo = dashboardData.organization_info || dashboardData.organization || dashboardData.org;

        if (orgInfo?.id) {
          console.log('Using organization from dashboard data:', orgInfo);
          return {
            id: orgInfo.id.toString(),
            name: orgInfo.name || 'My Organization'
          };
        }
      } catch (dashboardError) {
        console.log('Error fetching dashboard data:', dashboardError);
      }

      // Fallback to organization memberships
      console.log('Trying to fetch organization memberships...');
      try {
        const membershipsResponse = await apiGet(`${API_URL}/org/users/${userId}/organization-memberships/`);
        console.log('Memberships response:', membershipsResponse);

        // Handle different response formats
        const memberships = Array.isArray(membershipsResponse)
          ? membershipsResponse
          : membershipsResponse?.data;

        if (memberships?.length > 0) {
          // Get the first active membership or the first one if none are active
          const activeMembership = memberships.find(
            (m: any) => m.is_active
          ) || memberships[0];

          console.log('Active membership:', activeMembership);

          // Check different possible structures for the organization data
          const org = activeMembership.organization || activeMembership.organization_info;

          if (org) {
            console.log('Using organization from memberships:', org);
            return {
              id: org.id.toString(),
              name: org.name || org.organization_name || 'My Organization'
            };
          }
        }
      } catch (membershipError) {
        console.log('Error fetching memberships:', membershipError);
      }

      // Final fallback: get the first organization
      console.log('Trying to fetch organizations list...');
      try {
        const orgsResponse = await apiGet(`${API_URL}/org/organizations/`);
        console.log('Organizations response:', orgsResponse);

        // Handle both direct array and paginated response
        const organizations = Array.isArray(orgsResponse)
          ? orgsResponse
          : orgsResponse?.data?.results || orgsResponse?.data;

        if (organizations?.length > 0) {
          const org = organizations[0];
          console.log('Using first organization from list:', org);
          return {
            id: org.id.toString(),
            name: org.name || org.organization_name || 'My Organization'
          };
        }
      } catch (orgsError) {
        console.log('Error fetching organizations list:', orgsError);
      }

      return null;
    } catch (error) {
      console.error('Error fetching user organization:', error);
      return null;
    }
  }, []);

  // First effect: Load user and organization info
  useEffect(() => {
    const loadUserAndOrg = async () => {
      try {
        setLoading(true);
        setError(null);

        const user = await getCurrentUser();
        if (!user) {
          throw new Error('User not authenticated');
        }

        // Only fetch organization if we don't have it yet
        if (!organizationInfo?.id) {
          console.log('Fetching organization for user:', user.id);
          const userOrg = await fetchUserOrganization(user.id.toString());
          if (userOrg) {
            console.log('Setting organization info:', userOrg);
            setOrganizationInfo({
              id: userOrg.id.toString(),
              name: userOrg.name || userOrg.organization_name || 'My Organization',
              admin: {
                name: user.name || user.email.split('@')[0],
                username: user.email.split('@')[0],
                email: user.email
              }
            });
          } else {
            console.error('No organization found for user');
            setError('No organization found. Please check your organization settings.');

            // Fallback to user's email domain as organization name
            const emailDomain = user.email.split('@')[1]?.split('.')[0] || 'organization';
            setOrganizationInfo({
              id: user.id.toString(),
              name: `My ${emailDomain.charAt(0).toUpperCase() + emailDomain.slice(1)}`,
              admin: {
                name: user.name || user.email.split('@')[0],
                username: user.email.split('@')[0],
                email: user.email
              }
            });
          }
        }
      } catch (error) {
        console.error('Error loading user and organization:', error);
        setError(error instanceof Error ? error.message : 'Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    loadUserAndOrg();
  }, [fetchUserOrganization, organizationInfo?.id]);

  // Second effect: Load dashboard data when organization info is available
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!organizationInfo?.id) {
        console.log('No organization ID yet, skipping dashboard data load');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const user = await getCurrentUser();
        if (!user) {
          throw new Error('User not authenticated');
        }

        const isSuperAdmin = user.role === 'superadmin';

        console.log('Organization info:', organizationInfo);
        console.log('Fetching dashboard data with org ID:', organizationInfo.id);
        console.log('Is superadmin:', isSuperAdmin);

        // Fetch dashboard data with the correct parameters
        const data = await fetchDashboardData(isSuperAdmin, organizationInfo.id);
        console.log('Dashboard data in loadData:', data);

        // Log the raw metrics data from API
        console.log('Raw metrics from API:', data.metrics);

        // Debug: Log the member count specifically
        if (data.metrics) {
          console.log('Total members in metrics:', data.metrics.total_members);
          console.log('Active members in metrics:', data.metrics.active_members);
        }

        // Ensure we have valid metrics data
        const metricsData = {
          total_members: Number(data.metrics?.total_members) || 0,
          active_members: Number(data.metrics?.active_members) || 0,
          monthly_revenue: Number(data.metrics?.monthly_revenue) || 0,
          tasks_completed: Number(data.metrics?.tasks_completed) || 0,
          team_performance: Number(data.metrics?.team_performance) || 0,
          active_projects: Number(data.metrics?.active_projects) || 0,
          member_growth: Number(data.metrics?.member_growth) || 0,
          revenue_change: Number(data.metrics?.revenue_change) || 0,
          task_completion_rate: Number(data.metrics?.task_completion_rate) || 0
        };

        console.log('Processed metrics:', metricsData);
        setMetrics(metricsData);

        // Set activities and projects if available
        if (data.recent_activities) {
          setActivities(Array.isArray(data.recent_activities) ? data.recent_activities : []);
        }

        // Format and set projects data with proper defaults
        console.log('Raw dashboard data:', data);

        // Define the type for the project data we're looking for
        type ProjectData = {
          id?: string;
          name?: string;
          description?: string;
          status?: string;
          progress?: number;
          members_count?: number;
          member_count?: number;
          deadline?: string;
          due_date?: string;
          start_date?: string;
          status_color?: string;
          completed_tasks?: number;
          total_tasks?: number;
          created_at?: string;
          updated_at?: string;
        };

        // Check for projects in various possible locations with proper type checking
        let foundProjects: ProjectData[] = [];

        // Check each possible field for projects with proper type checking
        if (data.active_projects && Array.isArray(data.active_projects)) {
          foundProjects = data.active_projects as ProjectData[];
          console.log('Found projects in active_projects:', foundProjects);
        } else if ('projects' in data && Array.isArray(data.projects)) {
          foundProjects = data.projects as ProjectData[];
          console.log('Found projects in projects:', foundProjects);
        } else if ('organization_projects' in data && Array.isArray(data.organization_projects)) {
          foundProjects = data.organization_projects as ProjectData[];
          console.log('Found projects in organization_projects:', foundProjects);
        } else if ('recent_projects' in data && Array.isArray(data.recent_projects)) {
          foundProjects = data.recent_projects as ProjectData[];
          console.log('Found projects in recent_projects:', foundProjects);
        }

        console.log(`Found ${foundProjects.length} projects in total`);

        if (foundProjects.length > 0) {
          console.log('Raw projects from API:', foundProjects);
          console.log('First project sample:', foundProjects[0]);

          const activeProjects = foundProjects;

          // Ensure we have all required fields with defaults
          const formattedProjects = activeProjects.map(project => ({
            id: project.id || '',
            name: project.name || 'Unnamed Project',
            description: project.description || 'No description available',
            status: project.status || 'in_progress',
            progress: project.progress || 0,
            members_count: project.member_count || project.members_count || 0,
            deadline: project.deadline || project.due_date || new Date().toISOString(),
            start_date: project.start_date || new Date().toISOString(),
            status_color: project.status_color ||
              (project.status === 'completed' ? '#10b981' :
                project.status === 'in_progress' ? '#3b82f6' :
                  project.status === 'on_hold' ? '#f59e0b' :
                    project.status === 'cancelled' ? '#ef4444' : '#9ca3af'),
            // Additional properties
            completed_tasks: project.completed_tasks || 0,
            total_tasks: project.total_tasks || 0,
            due_date: project.due_date || project.deadline || null,
            created_at: project.created_at || new Date().toISOString(),
            updated_at: project.updated_at || new Date().toISOString()
          }));

          console.log('Formatted projects:', formattedProjects);
          setProjects(formattedProjects);
        } else {
          console.log('No active_projects found in the response');
          console.log('Available keys in response:', Object.keys(data));
        }

        // Try to get organization from dashboard data first
        if (data.organization_info?.id && data.organization_info.id.toString() !== organizationInfo?.id) {
          console.log('Updating organization from dashboard data:', data.organization_info);
          setOrganizationInfo(prev => ({
            ...prev!,
            id: data.organization_info!.id.toString(),
            name: data.organization_info!.name || 'My Organization',
            admin: {
              name: user.name || user.email.split('@')[0],
              username: user.email.split('@')[0],
              email: user.email
            }
          }));
        } else if (!organizationInfo?.id) {
          // If no org in dashboard data, try to fetch it separately
          console.log('No organization in dashboard data, trying to fetch separately...');
          const userOrg = await fetchUserOrganization(user.id.toString());

          if (userOrg) {
            console.log('Setting organization from user org data:', userOrg);
            setOrganizationInfo({
              id: userOrg.id.toString(),
              name: userOrg.name || 'My Organization',
              admin: {
                name: user.name || user.email.split('@')[0],
                username: user.email.split('@')[0],
                email: user.email
              }
            });
          } else {
            // Fallback to email domain
            console.log('Using email domain as fallback for organization name');
            const emailDomain = user.email.split('@')[1] || 'gmail.com';
            const domain = emailDomain.split('.')[0];
            setOrganizationInfo({
              id: user.id.toString(),
              name: `My ${domain.charAt(0).toUpperCase() + domain.slice(1)} Organization`,
              admin: {
                name: user.name || user.email.split('@')[0],
                username: user.email.split('@')[0],
                email: user.email
              }
            });
          }
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [organizationInfo?.id, fetchUserOrganization]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Organization Header */}
      {organizationInfo && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{organizationInfo.name}</h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {organizationInfo.admin.name}!
              </p>
            </div>
            {/* <div className="flex space-x-3">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </Button>
            </div> */}
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Members"
          value={loading ? '...' : metrics.total_members.toString()}
          icon={<Users className="h-4 w-4 text-blue-500" />}
          change={metrics.member_growth}
          changeLabel={metrics.member_growth ? `${metrics.member_growth}% from last month` : undefined}
        />
        <MetricCard
          title="Active Projects"
          value={loading ? '...' : metrics.active_projects.toString()}
          icon={<Target className="h-4 w-4 text-green-500" />}
          change={metrics.team_performance}
          changeLabel={metrics.team_performance ? `${metrics.team_performance}% of target` : undefined}
        />
        <MetricCard
          title="Tasks Completed"
          value={loading ? '...' : metrics.tasks_completed.toString()}
          icon={<CheckCircle className="h-4 w-4 text-purple-500" />}
          change={metrics.task_completion_rate}
          changeLabel={metrics.task_completion_rate ? `${metrics.task_completion_rate}% completion` : undefined}
        />
        <MetricCard
          title="Monthly Revenue"
          value={loading ? '...' : `$${metrics.monthly_revenue.toLocaleString()}`}
          icon={<DollarSign className="h-4 w-4 text-yellow-500" />}
          change={metrics.revenue_change}
          changeLabel={metrics.revenue_change ? `${metrics.revenue_change}% from last month` : undefined}
        />
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Activity */}
        <DashboardSection title="Recent Activity" description="Latest activities across your organization">
          <div className="space-y-4">
            {activities.length > 0 ? (
              <ActivityFeed activities={activities} />
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No recent activities found</p>
              </div>
            )}
          </div>
        </DashboardSection>

        {/* Active Projects */}
        <DashboardSection
          title="Active Projects"
          description="Projects currently in progress"
          className="h-full"
        >
          <div className="space-y-4 h-full">
            {projects.length > 0 ? (
              <div className="space-y-4">
                {projects.map((project) => {
                  const completionPercentage = project.total_tasks > 0
                    ? Math.round((project.completed_tasks / project.total_tasks) * 100)
                    : 0;

                  return (
                    <div
                      key={project.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-all duration-200 bg-white"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900 text-base">  {project.name || `Project ${project.id?.substring(0, 8) || ''}`}
                            </h4>
                            <span
                              className="px-2.5 py-1 text-xs font-medium rounded-full capitalize"
                              style={{
                                backgroundColor: `${project.status_color}15`,
                                color: project.status_color,
                                border: `1px solid ${project.status_color}40`
                              }}
                            >
                              {project.status.replace('_', ' ')}
                            </span>
                          </div>

                          {project.description && (
                            <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                              {project.description}
                            </p>
                          )}

                          <div className="flex items-center mt-3 text-sm text-gray-600 space-x-4 flex-wrap gap-y-2">
                            <span className="flex items-center">
                              <UserCheck className="h-4 w-4 mr-1.5 text-gray-500" />
                              {project.members_count} {project.members_count === 1 ? 'Member' : 'Members'}
                            </span>

                            <span className="text-gray-300 hidden sm:inline">•</span>

                            <span className="flex items-center">
                              <CheckCircle className="h-4 w-4 mr-1.5 text-green-500" />
                              {project.completed_tasks}/{project.total_tasks} Tasks
                            </span>

                            {project.due_date && (
                              <>
                                <span className="text-gray-300 hidden sm:inline">•</span>
                                <span className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1.5 text-gray-500" />
                                  Due {new Date(project.due_date).toLocaleDateString()}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Progress bar */}
                          {project.total_tasks > 0 && (
                            <div className="mt-3">
                              <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Progress</span>
                                <span>{completionPercentage}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-300"
                                  style={{
                                    width: `${completionPercentage}%`,
                                    backgroundColor: project.status === 'completed'
                                      ? '#10b981'
                                      : project.status === 'in_progress'
                                        ? '#3b82f6'
                                        : project.status === 'on_hold'
                                          ? '#f59e0b'
                                          : project.status === 'cancelled'
                                            ? '#ef4444'
                                            : '#9ca3af'
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button> */}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 bg-white rounded-lg border border-dashed border-gray-200 h-full flex flex-col items-center justify-center">
                <div className="mx-auto w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                  <FileText className="h-6 w-6 text-blue-500" />
                </div>
                <h4 className="text-gray-900 font-medium text-lg">No active projects</h4>
                <p className="text-gray-500 mt-1 max-w-md mx-auto">
                  You don't have any active projects yet. Create your first project to get started.
                </p>
                <Button size="sm" className="mt-4" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </Button>
              </div>
            )}
          </div>
        </DashboardSection>
      </div>
    </div>
  );
}