'use client';

import './globals.css';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import { MessagingProvider } from '@/contexts/MessagingContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider, Toaster } from '@/hooks/use-toast';

// Create a client
const queryClient = new QueryClient();

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>Project K</title>
        <meta name="description" content="Project K - Your Project Management Solution" />
      </head>
      <body className={inter.className}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <MessagingProvider>
              <ToastProvider>
                {children}
                <Toaster />
              </ToastProvider>
            </MessagingProvider>
          </AuthProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}