'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export default function SalesDashboard() {
  const router = useRouter();
  const user = getCurrentUser();

  useEffect(() => {
    // Check if user is authenticated
    if (!user) {
      router.push('/login');
      return;
    }

    // Verify user has sales role
    if (!['sales', 'salesperson', 'sales_rep'].includes(user.role?.toLowerCase())) {
      router.push('/unauthorized');
      return;
    }
  }, [user, router]);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Sales Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Leads</h2>
          <p className="text-gray-600">Manage your sales leads</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Deals</h2>
          <p className="text-gray-600">Track your sales pipeline</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Performance</h2>
          <p className="text-gray-600">View your sales metrics</p>
        </div>
      </div>
    </div>
  );
}
