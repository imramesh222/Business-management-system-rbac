'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export default function VerifierDashboard() {
  const router = useRouter();
  const user = getCurrentUser();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!['verifier'].includes(user.role?.toLowerCase())) {
      router.push('/unauthorized');
      return;
    }
  }, [user, router]);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Verifier Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Pending Verifications</h2>
          <p className="text-gray-600">Review and verify pending items</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Verified Items</h2>
          <p className="text-gray-600">View your verification history</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Verification Stats</h2>
          <p className="text-gray-600">Track your verification metrics</p>
        </div>
      </div>
    </div>
  );
}
