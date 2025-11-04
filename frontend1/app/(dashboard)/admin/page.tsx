'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, hasRequiredRole, UserRole } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AdminDashboard() {
  const router = useRouter();
  const user = getCurrentUser();

  useEffect(() => {
    // Check if user is authenticated
    if (!user) {
      router.push('/login');
      return;
    }

    // Superadmins can access everything
    if (user.is_superuser) {
      // Superadmin is already in the right place
      return;
    }

    // Check if user has the required admin role
    if (!hasRequiredRole('admin' as UserRole)) {
      // Redirect to appropriate dashboard based on user role
      if (user.organization_role) {
        router.push(`/organization/${user.organization_role}/dashboard`);
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, router]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            Logged in as: <span className="font-medium">{user.name || user.email}</span>
          </span>
          <span className={`px-2 py-1 text-xs rounded-full ${
            user.is_superuser 
              ? 'bg-purple-100 text-purple-800' 
              : 'bg-blue-100 text-blue-800'
          }`}>
            {user.is_superuser ? 'Super Admin' : user.role}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Organization Management */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Manage your organization's settings, members, and permissions.
            </p>
            <Button onClick={() => router.push('/admin/organization')}>
              Manage Organization
            </Button>
          </CardContent>
        </Card>

        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              View and manage user accounts and permissions.
            </p>
            <Button onClick={() => router.push('/admin/users')}>
              Manage Users
            </Button>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle>System Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Configure system-wide settings and preferences.
            </p>
            <Button onClick={() => router.push('/admin/settings')}>
              System Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
