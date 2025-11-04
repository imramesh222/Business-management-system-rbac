'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCurrentUser, UserRole, isAuthenticated } from '../../lib/auth';
import { getApiUrl, getDefaultHeaders, handleApiResponse } from '../../lib/api';
import { toast } from 'sonner';

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const redirectToDashboard = async () => {
      // Check if user is authenticated
      if (!isAuthenticated()) {
        router.push('/login');
        return;
      }

      // Get the current user from the token
      const user = getCurrentUser();
      if (!user) {
        console.error('User not found in token');
        router.push('/login');
        return;
      }

      console.log('Current user:', user);

      // Map of role to dashboard paths with /organization/ prefix
      const roleToPath: Record<UserRole, string> = {
        'superadmin': '/superadmin',  // Updated to match the actual route
        'admin': '/organization/dashboard', // Organization admin dashboard
        // 'manager': '/organization/project-manager/dashboard',
        'project_manager': '/organization/project-manager/dashboard',
        'developer': '/organization/developer/dashboard',
        // 'sales': '/organization/sales/dashboard',
        'salesperson': '/organization/sales/dashboard',
        'support': '/organization/support/dashboard',
        'verifier': '/organization/verifier/dashboard',
        'user': '/organization/user/dashboard'
      };

      try {
        // Try to get the dashboard URL from the backend
        const response = await fetch(getApiUrl('dashboard/'), {
          method: 'GET',
          headers: getDefaultHeaders(),
          credentials: 'include',
        });

        // If the request is successful, try to parse the response
        if (response.ok) {
          const data = await response.json();
          console.log('Dashboard API response:', data);
          
          // If we have a redirect_url, use it
          if (data.redirect_url) {
            let redirectPath = data.redirect_url;
            // Remove API prefix if present
            if (redirectPath.startsWith('/api/v1')) {
              redirectPath = redirectPath.replace(/^\/api\/v1/, '');
            }
            // Ensure the path starts with a slash
            if (!redirectPath.startsWith('/')) {
              redirectPath = `/${redirectPath}`;
            }
            console.log('Redirecting to:', redirectPath);
            router.push(redirectPath);
            return;
          }
          
          // If we have a role in the response, use it to get the path
          if (data.role) {
            const role = data.role.toLowerCase() as UserRole;
            const path = roleToPath[role] || roleToPath['user'];
            console.log('Using role from API response:', role, '->', path);
            router.push(path);
            return;
          }
        }
        
        // If we get here, either the API call failed or didn't return a valid response
        // Fall back to client-side role-based routing
        const role = user.role || 'user';
        const path = roleToPath[role] || roleToPath['user'];
        console.log('Using client-side role-based routing:', role, '->', path);
        router.push(path);
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        
        // Final fallback to client-side role-based routing
        const role = user.role || 'user';
        const path = roleToPath[role] || roleToPath['user'];
        console.log('Error occurred, falling back to role path:', path);
        router.push(path);
      } finally {
        setIsLoading(false);
      }
    };

    redirectToDashboard();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading your dashboard...</p>
      </div>
    </div>
  );
}
