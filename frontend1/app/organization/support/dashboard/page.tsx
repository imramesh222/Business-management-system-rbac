'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export default function SupportDashboard() {
  const router = useRouter();
  const user = getCurrentUser();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!['support', 'support_agent'].includes(user.role?.toLowerCase())) {
      router.push('/unauthorized');
      return;
    }
  }, [user, router]);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Support Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Open Tickets</h2>
          <p className="text-gray-600">Manage support requests</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Resolved Tickets</h2>
          <p className="text-gray-600">View closed support cases</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Knowledge Base</h2>
          <p className="text-gray-600">Access support resources</p>
        </div>
      </div>
    </div>
  );
}
