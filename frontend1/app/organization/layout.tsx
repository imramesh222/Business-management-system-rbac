'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, isAuthenticated } from '@/lib/auth';
import { Sidebar } from '../../components/sidebar';

export default function OrganizationLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const user = getCurrentUser();
  
  // Handle unauthenticated access
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, [router]);

  // Show loading state while checking authentication
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Get organization name safely
  const getOrganizationName = () => {
    if (!user.organization) return 'Organization';
    if (typeof user.organization === 'string') return user.organization;
    return (user.organization as any)?.name || 'Organization';
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar user={user} />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Top Navigation */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-xl font-semibold text-gray-900">
              {getOrganizationName()}
            </h1>
            <div className="flex items-center space-x-4">
              {/* Add any header actions here */}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
