'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import LoginForm from "@/components/auth/LoginForm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [showSessionExpired, setShowSessionExpired] = useState(false);

  useEffect(() => {
    // Check for session_expired query parameter
    if (searchParams.get('session_expired') === '1') {
      setShowSessionExpired(true);
      // Clear the query parameter from the URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('session_expired');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [searchParams]);

  return (
    <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <h2 className="mb-6 text-center text-2xl font-bold text-gray-900">
          Sign in to your account
        </h2>
        
        {showSessionExpired && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Session Expired</AlertTitle>
            <AlertDescription>
              Your session has expired. Please log in again to continue.
            </AlertDescription>
          </Alert>
        )}
        
        <LoginForm />
      </div>
    </div>
  );
}
