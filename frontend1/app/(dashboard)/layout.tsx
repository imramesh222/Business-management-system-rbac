'use client';

import { RoleBasedLayout } from '@/components/dashboard/RoleBasedLayout';
import { getCurrentUserWithFallback, isAuthenticated, UserRole } from '@/lib/auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ToastProvider } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { OrganizationProvider } from '@/contexts/OrganizationContext';

// Debug logging helper
const debug = (message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DashboardLayout] ${message}`, data || '');
  }
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    debug('Checking authentication...');
    
    const checkAuth = async () => {
      try {
        // Check authentication status
        const isAuth = isAuthenticated();
        debug('Authentication check result:', { isAuth });
        
        if (!isAuth) {
          debug('User not authenticated, redirecting to login');
          router.push('/login');
          return;
        }
        
        // Get current user
        const user = getCurrentUserWithFallback();
        debug('Current user from auth:', user);
        
        if (!user) {
          debug('No user data available, redirecting to login');
          router.push('/login');
          return;
        }
        
        // Get user role
        const userRole = user.role.toLowerCase();
        
        debug('Path verification:', { 
          currentPath: pathname,
          userRole,
          isDashboardPath: pathname.startsWith('/dashboard'),
          isOrganizationPath: pathname.startsWith('/organization')
        });
        
        // Define allowed paths based on role
        const allowedPaths: Record<string, string[]> = {
          'superadmin': ['/superadmin', '/organization', '/dashboard', '/clients'],
          'admin': ['/organization', '/dashboard', '/clients'],
          'user': ['/dashboard'],
          // Add other roles with their allowed paths
          'project_manager': ['/organization/projects', '/dashboard', '/clients'],
          'salesperson': ['/organization', '/dashboard', '/clients'],
          'verifier': ['/organization', '/dashboard'],
          'support': ['/organization', '/dashboard'],
          'developer': ['/organization', '/dashboard']
        };
        
        // Get allowed paths for the user's role, default to dashboard if role not found
        const userAllowedPaths = allowedPaths[userRole] || ['/dashboard'];
        
        // Check if current path is allowed
        const isAllowedPath = userAllowedPaths.some(allowedPath => 
          pathname === allowedPath || pathname.startsWith(`${allowedPath}/`)
        );
        
        if (!isAllowedPath) {
          debug(`Access denied: User role ${userRole} cannot access ${pathname}`);
          setError(`You don't have permission to access this page. Redirecting to your dashboard...`);
          
          // Redirect to the first allowed path for the user's role
          const redirectPath = userAllowedPaths[0];
          
          // Small delay to show the error message before redirecting
          setTimeout(() => {
            router.push(redirectPath);
          }, 1500);
          
          return;
        }
        
        debug('User authenticated and authorized:', { 
          userId: user.id, 
          userRole: user.role
        });
        
        setCurrentUser(user);
        setError(null);
      } catch (err) {
        console.error('Error in DashboardLayout:', err);
        setError('An error occurred while loading the dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, pathname]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
          {error && <p className="text-red-500 mt-2">{error}</p>}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Access Denied</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastProvider>
        <OrganizationProvider>
          <RoleBasedLayout userRole={currentUser?.role}>
            {children}
          </RoleBasedLayout>
          <Toaster />
        </OrganizationProvider>
      </ToastProvider>
    </div>
  );
}
