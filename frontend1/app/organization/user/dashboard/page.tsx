'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, isAuthenticated } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function UserDashboard() {
  const router = useRouter();
  const user = getCurrentUser();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    // If user exists but has an organization role, redirect to appropriate dashboard
    if (user) {
      // Use organization_role if available, otherwise fall back to basic role
      const userRole = user.organization_role || user.role;
      
      // Only redirect if the current path doesn't match the user's role
      const currentPath = window.location.pathname;
      const rolePath = `/organization/${userRole}/dashboard`;
      
      if (userRole !== 'user' && !currentPath.includes(rolePath)) {
        router.push(rolePath);
      }
    }
  }, [router, user]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          {user.organization_role === 'project_manager' 
            ? 'Project Manager Dashboard' 
            : user.organization_role 
              ? `${user.organization_role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Dashboard`
              : 'User Dashboard'
          }
        </h1>
        <p className="text-gray-600">Welcome back, {user.name || 'User'}!</p>
      </div>

      {/* User Info Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="mb-4 md:mb-0">
            <h2 className="text-2xl font-semibold text-gray-800">{user.name || 'User'}</h2>
            <div className="flex items-center mt-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {user.organization_role 
                  ? user.organization_role.split('_').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')
                  : (user.role || 'user').charAt(0).toUpperCase() + (user.role || 'user').slice(1)
                }
              </span>
              {user.organization && (
                <span className="ml-2 text-sm text-gray-600">
                  at {typeof user.organization === 'string' ? user.organization : user.organization.name}
                </span>
              )}
            </div>
          </div>
          <div className="text-sm text-gray-600">
            <p>Email: {user.email}</p>
            <p>Member since: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Dashboard Cards */}
        <Card>
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">View and update your profile information</p>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Role:</span> 
                {user.organization_role 
                  ? user.organization_role.split('_').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')
                  : (user.role || 'user').charAt(0).toUpperCase() + (user.role || 'user').slice(1)
                }
              </p>
              {user.organization && (
                <p><span className="font-medium">Organization:</span> {typeof user.organization === 'string' ? user.organization : user.organization.name}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">View your recent activities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Check your notifications</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
