'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCurrentUser, isAuthenticated } from '@/lib/auth';
import { UserRole, ROLES, hasRequiredRole } from '@/lib/roles';

export function useAuth(requiredRole?: UserRole, redirectPath = '/login') {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // Check if running on client-side
      if (typeof window === 'undefined') return;

      // Check if user is authenticated
      if (!isAuthenticated()) {
        router.push(redirectPath);
        return;
      }

      // Get current user data
      const currentUser = getCurrentUser();
      setUser(currentUser);

      // If a specific role is required, verify it
      if (requiredRole && !hasRequiredRole(currentUser?.organization_role || 'user', requiredRole)) {
        router.push('/organization/unauthorized');
        return;
      }

      setIsLoading(false);
    };

    checkAuth();
  }, [requiredRole, redirectPath, router]);

  return { user, isLoading };
}
