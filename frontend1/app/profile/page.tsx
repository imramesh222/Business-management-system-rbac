'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUserWithFallback } from '../../lib/auth';
import { getApiUrl, getDefaultHeaders, handleApiResponse } from '../../lib/api';
import { toast } from 'sonner';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const currentUser = getCurrentUserWithFallback();
      
      if (!currentUser) {
        router.push('/login');
        return;
      }

      try {
        // Fetch user profile data
        const response = await fetch(getApiUrl('users/me/'), {
          method: 'GET',
          headers: getDefaultHeaders(),
          credentials: 'include',
        });

        const data = await handleApiResponse<any>(response);
        setUser(data);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        toast.error('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">User Profile</h1>
      {user && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Personal Information</h2>
            <div className="mt-4 space-y-2">
              <p><span className="font-medium">Name:</span> {user.name || 'Not provided'}</p>
              <p><span className="font-medium">Email:</span> {user.email}</p>
              <p><span className="font-medium">Role:</span> {user.role}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
