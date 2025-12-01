// app/organization/overview/page.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getOrganizationOverview } from '@/services/organizationService';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';

interface Member {
  id: string;
  user: {
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    is_active: boolean;
  };
  role: string;
  role_display: string;
  is_active: boolean;
}

interface Project {
  id: string;
  name: string;
  status: string;
  description?: string;
}

interface OverviewData {
  active_projects: number;
  team_members: number;
  tasks_due: number;
  completion_rate: number;
  _raw: {
    projects: Project[];
    members: Member[];
    tasks: any[];
  };
}

export default function OverviewPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OverviewData | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const orgId = user?.organization_id;
        if (orgId) {
          const response = await getOrganizationOverview(orgId, user?.id?.toString());
          setData(response);
        }
      } catch (error) {
        console.error('Error fetching overview data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return <div>No data available</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome back, {user?.name || 'User'}</h1>
        <p className="text-muted-foreground">
          Here's what's happening with your organization today.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Active Projects Card */}
        <Card>
          <CardHeader>
            <CardTitle>Active Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data._raw.projects.map((project) => (
                <div key={project.id} className="border rounded-lg p-3">
                  <div className="font-medium">{project.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Status: {project.status.split('_').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </div>
                  {project.description && (
                    <p className="text-sm mt-1 text-gray-600 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                </div>
              ))}
              {!data._raw.projects.length && (
                <div className="text-sm text-muted-foreground">No active projects</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Team Members Card */}
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data._raw.members.map((member) => (
                <div key={member.id} className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                    {member.user.first_name?.[0]?.toUpperCase() || 
                     member.user.username?.[0]?.toUpperCase() || 
                     'U'}
                  </div>
                  <div>
                    <div className="font-medium">
                      {member.user.first_name && member.user.last_name
                        ? `${member.user.first_name} ${member.user.last_name}`
                        : member.user.username}
                    </div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {member.role_display || member.role?.replace(/_/g, ' ').toLowerCase() || 'member'}
                    </div>
                  </div>
                </div>
              ))}
              {!data._raw.members.length && (
                <div className="text-sm text-muted-foreground">No team members</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tasks Due Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Due</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.tasks_due}</div>
            <p className="text-xs text-muted-foreground">+2 from last week</p>
          </CardContent>
        </Card>

        {/* Completion Rate Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.completion_rate}%</div>
            <p className="text-xs text-muted-foreground">+5% from last month</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}