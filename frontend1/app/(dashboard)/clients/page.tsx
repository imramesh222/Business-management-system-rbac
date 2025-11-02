'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { DataTable } from './_components/data-table';
import { columns } from './_components/columns';
import { apiGet } from '@/services/apiService';
import { useToast } from '@/components/ui/use-toast';
import { Client } from './types';

export default function ClientsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);
        const data = await apiGet('/clients/');
        setClients(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching clients:', err);
        setError('Failed to load clients');
        toast({
          title: 'Error',
          description: 'Failed to load clients. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, [toast]);

  if (loading) {
    return <div>Loading clients...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Clients</h1>
        <Button onClick={() => router.push('/clients/new')}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </div>
      <DataTable columns={columns} data={clients} />
    </div>
  );
}
