'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getCurrentUser, isAuthenticated } from '@/lib/auth';
import { Sidebar } from '@/components/sidebar';

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const user = getCurrentUser();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    // Redirect to unauthorized if not a project manager
    if (user?.organization_role?.toLowerCase() !== 'project_manager') {
      router.push('/organization/unauthorized');
      return;
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
    <div className="flex h-screen overflow-hidden">
      {/* <Sidebar user={user} /> */}
      <main className="flex-1 overflow-auto bg-gray-50 p-6">
        {children}
      </main>
    </div>
  );
}
