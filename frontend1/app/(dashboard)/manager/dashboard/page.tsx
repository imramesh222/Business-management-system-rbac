'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ManagerOverview from '@/components/dashboard/manager/ManagerOverview';
import { Loader2 } from 'lucide-react';

export default function ManagerDashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!loading && !user) {
      router.push('/login');
    }
    // Redirect to appropriate dashboard if user doesn't have access
    else if (!loading && user && user.role !== 'project_manager') {
      // This is a fallback in case the route is accessed directly
      if (user.role === 'admin' || user.role === 'superadmin') {
        router.push('/admin/dashboard');
      } else if (user.organization_role === 'admin') {
        // Handle organization admin role from organization_role field
        router.push('/organization/dashboard');
      } else {
        // Default dashboard for other roles
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null; // Will be redirected by the effect
  }

  return (
    <div className="flex flex-col
     min-h-screen">
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight">Project Manager Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user.name || 'Project Manager'}!
            </p>
          </div>
          
          <ManagerOverview />
        </div>
      </main>
    </div>
  );
}
