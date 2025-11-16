'use client';

import { Card, CardContent } from '@/components/ui/card';
import BaseDashboardLayout from '@/components/dashboard/BaseDashboardLayout';
import { StatCard, StatCardSkeleton } from '@/components/dashboard/StatCard';
import { useAuth } from '@/hooks/useAuth';
import { ROLES } from '@/lib/roles';
import { FolderOpen, CheckSquare, Users, BarChart2, Clock, Calendar } from 'lucide-react';

export default function DashboardPage() {
  const { user, isLoading } = useAuth(ROLES.PROJECT_MANAGER, '/login');

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  // Sample data - replace with actual API calls in a real application
  const stats = [
    {
      title: 'Active Projects',
      value: '12',
      icon: <FolderOpen className="h-4 w-4" />,
      trend: { value: '+2 from last month', isPositive: true },
    },
    {
      title: 'Tasks Completed',
      value: '128',
      icon: <CheckSquare className="h-4 w-4" />,
      description: 'This month',
    },
    {
      title: 'Team Members',
      value: '24',
      icon: <Users className="h-4 w-4" />,
      description: 'Active',
    },
    {
      title: 'On Schedule',
      value: '85%',
      icon: <BarChart2 className="h-4 w-4" />,
      trend: { value: '+5% from last month', isPositive: true },
    },
  ];

  const recentActivities = [
    { id: 1, title: 'Project kickoff meeting', time: '2 hours ago', status: 'completed' },
    { id: 2, title: 'Review design mockups', time: '1 day ago', status: 'in-progress' },
    { id: 3, title: 'Update project timeline', time: '2 days ago', status: 'pending' },
  ];

  const upcomingDeadlines = [
    { id: 1, title: 'Project Milestone 1', dueIn: 1 },
    { id: 2, title: 'Client Review', dueIn: 3 },
    { id: 3, title: 'Sprint Planning', dueIn: 5 },
  ];

  return (
    <BaseDashboardLayout
      title="Project Manager Dashboard"
      description={`Welcome back, ${user.name || 'Project Manager'}`}
      user={user}
      isLoading={isLoading}
      showSidebar={false} // Hide sidebar since it's already in the organization layout
    >
      {/* Dashboard Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {isLoading ? (
          // Show skeleton loaders while loading
          Array(4).fill(0).map((_, i) => (
            <StatCardSkeleton key={`stat-skeleton-${i}`} />
          ))
        ) : (
          // Show actual stats when loaded
          stats.map((stat, index) => (
            <StatCard
              key={`stat-${index}`}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              description={stat.description}
              trend={stat.trend}
            />
          ))
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start">
                  <div className="flex-shrink-0 mr-3 mt-0.5">
                    <div className={`h-2.5 w-2.5 rounded-full ${
                      activity.status === 'completed' ? 'bg-green-500' : 
                      activity.status === 'in-progress' ? 'bg-yellow-500' : 'bg-gray-300'
                    }`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.title}
                    </p>
                    <p className="text-sm text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Upcoming Deadlines</h3>
              <button className="text-sm text-blue-600 hover:text-blue-800">View All</button>
            </div>
            <div className="space-y-4">
              {upcomingDeadlines.map((item) => (
                <div key={item.id} className="flex items-center p-3 border rounded-lg hover:bg-gray-50">
                  <div className="p-2 rounded-full bg-blue-100 text-blue-600 mr-3">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{item.title}</h4>
                    <p className="text-sm text-gray-500">
                      Due in {item.dueIn} day{item.dueIn !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button className="text-sm text-blue-600 hover:text-blue-800">View</button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </BaseDashboardLayout>
  );
}