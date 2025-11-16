'use client';

import { ReactNode } from 'react';
import { Sidebar } from '@/components/sidebar';

interface BaseDashboardLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
  headerActions?: ReactNode;
  isLoading?: boolean;
  user: any; // User object from authentication
  showSidebar?: boolean; // Make sidebar optional
}

export function BaseDashboardLayout({
  children,
  title,
  description,
  headerActions,
  isLoading = false,
  user,
  showSidebar = true, 
}: BaseDashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {showSidebar && <Sidebar user={user} />}
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="bg-white shadow-sm">
          <div className="px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
              {description && (
                <p className="mt-1 text-sm text-gray-500">{description}</p>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {headerActions}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}

export default BaseDashboardLayout;
