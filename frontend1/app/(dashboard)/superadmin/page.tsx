'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SuperAdminOverview from '@/components/dashboard/superadmin/SuperAdminOverview';
import { getCurrentUser } from '@/lib/auth';

export default function SuperAdminDashboard() {
  const router = useRouter();
  const user = getCurrentUser();

  useEffect(() => {
    // Check if user is authenticated
    if (!user) {
      router.push('/login');
      return;
    }

    // Only superadmins can access this page
    if (!user.is_superuser) {
      // Redirect to appropriate dashboard based on user role
      if (user.role === 'admin') {
        router.push('/admin');
      } else if (user.organization_role) {
        router.push(`/organization/${user.organization_role}/dashboard`);
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, router]);

  if (!user || !user.is_superuser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return <SuperAdminOverview />;
}
