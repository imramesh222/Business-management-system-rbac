'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUser, isAuthenticated } from '@/lib/auth';
import { Sidebar } from '@/components/sidebar';
import { ProfileContent } from '@/components/profile/ProfileContent';

export default function OrganizationLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  useEffect(() => {
    // This effect runs only on the client
    setIsClient(true);
    
    // Check authentication
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    
    // Get user data
    const currentUser = getCurrentUser();
    setUser(currentUser);
    setIsLoading(false);
  }, [router]);

  // Redirect to overview if at the root organization path
  useEffect(() => {
    if (isClient && !isLoading && pathname === '/organization') {
      router.push('/organization/overview');
    }
  }, [isClient, isLoading, router, pathname]);

  // Show loading state while checking authentication
  if (!isClient || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Check if we're on the profile page
  const isProfilePage = pathname === '/profile';

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} />
      <div className="flex-1 overflow-auto">
        {isProfilePage ? (
          <ProfileContent />
        ) : (
          <main className="p-6">
            {children}
          </main>
        )}
      </div>
    </div>
  );
}
