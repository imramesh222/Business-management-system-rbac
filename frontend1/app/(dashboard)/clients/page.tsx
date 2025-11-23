// app/(dashboard)/clients/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PlusCircle, X } from 'lucide-react';
import { DataTable } from './components/data-table';
import { columns } from './components/columns';
import { apiGet, apiPost } from '@/services/apiService';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Client } from './types';
import { getCurrentUser, getAccessToken } from '@/lib/auth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

// Client form component
const AddClientForm = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => {
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    status: 'lead',
    source: 'website',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'lead', label: 'Lead' },
    { value: 'prospect', label: 'Prospect' },
  ];

  const sourceOptions = [
    { value: 'website', label: 'Website' },
    { value: 'referral', label: 'Referral' },
    { value: 'social_media', label: 'Social Media' },
    { value: 'advertisement', label: 'Advertisement' },
    { value: 'other', label: 'Other' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await apiPost('/clients/', formData);
      
      toast({
        title: 'Success',
        description: 'Client created successfully',
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating client:', error);
      toast({
        title: 'Error',
        description: 'Failed to create client',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Client Name *</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter client name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_person">Contact Person</Label>
            <Input
              id="contact_person"
              name="contact_person"
              value={formData.contact_person}
              onChange={handleChange}
              placeholder="Contact person name"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter email address"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter phone number"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Enter full address"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <select
              id="source"
              name="source"
              value={formData.source}
              onChange={handleChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sourceOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Additional notes about the client"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Client'}
          </Button>
        </div>
      </form>
    </div>
  );
};

const ClientsPage = () => {
  // Debug: Log current user info with more details
  useEffect(() => {
    console.log('=== AUTH DEBUG ===');
    console.log('LocalStorage user:', localStorage.getItem('user'));
    
    const userData = getCurrentUser();
    console.log('Current user from getCurrentUser():', {
      id: userData?.id,
      email: userData?.email,
      role: userData?.role,
      organization_id: userData?.organization_id,
      permissions: userData?.permissions,
      isAdmin: userData?.role === 'admin' || userData?.is_superuser,
      isSalesperson: userData?.role === 'salesperson',
      isProjectManager: userData?.role === 'project_manager'
    });
    
    // Check token
    const token = localStorage.getItem('token');
    console.log('Auth token exists:', !!token);
    console.log('Token prefix:', token?.substring(0, 20) + '...');
    console.log('========================');
  }, []);

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchClients = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet('/clients/');
      setClients(data);
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError('Failed to load clients. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to load clients',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
    
    const userData = getCurrentUser();
    console.log('Current user data:', userData); // Debug log
    setUser(userData);
  }, []);

  useEffect(() => {
    if (!user) {
      console.log('User not loaded yet, waiting...');
      return;
    }

    const fetchClients = async () => {
      try {
        setLoading(true);
        console.log('Fetching clients for org:', user.organization_id);
        
        // Use the correct clients endpoint with organization_id as a query parameter
        const endpoint = `/clients/?organization_id=${user.organization_id}`;
        console.log('Fetching clients from endpoint:', endpoint);
        
        const data = await apiGet<Client[]>(endpoint);
        console.log('Clients data:', data);

        setClients(Array.isArray(data) ? data : []);
        
      } catch (error: any) {
        console.error('Error in fetchClients:', error);
        setError('Failed to load clients. Please check your permissions.');
        
        if (error?.response?.status === 403) {
          toast({
            title: 'Access Denied',
            description: 'You do not have permission to view clients. Please contact your administrator.',
            variant: 'destructive',
            duration: 5000,
          });
          // Add a small delay before redirecting to show the toast
          setTimeout(() => {
            router.push('/organization/dashboard');
          }, 2000);
          return; // Stop further execution
        } else {
          toast({
            title: 'Error',
            description: error.message || 'Failed to load clients',
            variant: 'destructive',
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, [user, router, toast]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 p-4">
        <div className="text-destructive">{error}</div>
        <Button 
          variant="outline" 
          onClick={() => window.location.reload()}
          className="mt-2"
        >
          Retry
        </Button>
      </div>
    );
  }

  const handleClientAdded = () => {
    // Refresh the clients list
    fetchClients();
    toast({
      title: 'Success',
      description: 'Client added successfully',
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Clients</h2>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Client
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              {/* <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
                onClick={() => setIsFormOpen(false)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button> */}
            </DialogHeader>
            <AddClientForm 
              onClose={() => setIsFormOpen(false)} 
              onSuccess={handleClientAdded} 
            />
          </DialogContent>
        </Dialog>
      </div>
      <DataTable columns={columns} data={clients} />
    </div>
  );
};

export default ClientsPage;