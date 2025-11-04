'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export default function DeveloperDashboard() {
  const router = useRouter();
  const user = getCurrentUser();

  useEffect(() => {
    // Check if user is authenticated
    if (!user) {
      router.push('/login');
      return;
    }

    // Verify user has developer role
    if (!['developer', 'dev'].includes(user.role?.toLowerCase())) {
      router.push('/unauthorized');
      return;
    }
  }, [user, router]);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Developer Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Add your dashboard components here */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Assigned Tasks</h2>
          <p className="text-gray-600">View and manage your assigned tasks</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Active Projects</h2>
          <p className="text-gray-600">Track your active projects</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Recent Activity</h2>
          <p className="text-gray-600">View your recent activity</p>
        </div>
      </div>
    </div>
  );
}
