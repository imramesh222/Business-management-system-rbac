'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ClientForm } from '../_components/client-form';

export default function NewClientPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/clients');
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center space-x-4 mb-6">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>
        <h1 className="text-2xl font-bold">Add New Client</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <ClientForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
}
