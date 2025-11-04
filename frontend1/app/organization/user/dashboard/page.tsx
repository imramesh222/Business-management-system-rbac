'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, isAuthenticated } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function UserDashboard() {
  const router = useRouter();
  const user = getCurrentUser();

  useEffect(() => {
    console.log('=== DASHBOARD DEBUG - INITIAL RENDER ===');
    console.log('User object from getCurrentUser():', user);
    console.log('Is authenticated:', isAuthenticated());
    console.log('Current path:', window.location.pathname);
    
    // Check authentication
    if (!isAuthenticated()) {
      console.log('User not authenticated, redirecting to login');
      router.push('/login');
      return;
    }

    if (user) {
      // Debug JWT token
      const token = localStorage.getItem('access_token');
      console.log('JWT Token:', token);
      
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          console.log('JWT Payload:', payload);
          console.log('JWT Role:', payload.role);
          console.log('JWT Organization Role:', payload.organization_role);
          console.log('JWT Organization ID:', payload.organization_id);
          console.log('JWT Organization Name:', payload.organization_name);
        } catch (e) {
          console.error('Error parsing JWT:', e);
        }
      }
      
      // Determine user role with fallbacks
      const userRole = (user.organization_role || user.role || 'user').toLowerCase();
      console.log('=== ROLE DEBUG ===');
      console.log('User role (computed):', userRole);
      console.log('User object keys:', Object.keys(user));
      console.log('User object values:', {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization_role: user.organization_role,
        organization: user.organization
      });
      
      // Define role-specific paths for all roles
      const rolePaths: Record<string, string> = {
        'superadmin': '/superadmin',
        'admin': '/organization/admin/dashboard',
        'project_manager': '/organization/project/dashboard',
        'developer': '/organization/developer/dashboard',
        'verifier': '/organization/verifier/dashboard',
        'salesperson': '/organization/sales/dashboard',
        'support': '/organization/support/dashboard',
        'user': '/organization/user/dashboard'
      };
      
      // Get the target path for the user's role, default to user dashboard
      const rolePath = rolePaths[userRole] || '/organization/user/dashboard';
      const currentPath = window.location.pathname;
      
      console.log('Current path:', currentPath);
      console.log('Computed role path:', rolePath);
      
      // Check if we're already on a valid path for this role
      const rolePathVariations = [
        rolePath,
        rolePath.replace('/dashboard', ''), // Handle paths with or without /dashboard
        `/${userRole}/dashboard` // Handle legacy paths
      ];
      
      const isOnValidPath = rolePathVariations.some(path => currentPath.endsWith(path));
      
      // Only redirect if we're not already on a valid path for this role
      if (!isOnValidPath) {
        console.log(`Redirecting to role-specific dashboard: ${rolePath}`);
        // Use replace to avoid adding to browser history
        window.location.replace(rolePath);
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
