// app/(dashboard)/clients/page.tsx
'use client';

import { useState, useEffect, useCallback, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { PlusCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { DataTable } from './components/data-table';
import { columns } from './components/columns';
import { apiGet, apiPost } from '@/services/apiService';
import { Skeleton } from '@/components/ui/skeleton';
import { Client } from './types';
import { getCurrentUser, getAccessToken } from '@/lib/auth';
import type { User as AuthUser } from '@/lib/auth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

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
  const router = useRouter();

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
      const payload = {
        ...formData,
        organization: '9cec81f7-eea8-4ac0-8ebe-2f8d6ffe7bc2'
      };
      
      console.log('Sending payload:', JSON.stringify(payload, null, 2));
      
      const response = await apiPost('/clients/', payload);
      console.log('API Response:', response);
      
      toast({
        title: 'Success',
        description: 'Client created successfully',
      });
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating client:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create client',
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
  const { logout } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);

  // Initialize user state and fetch clients when component mounts
  useEffect(() => {
    const initializeUser = async () => {
      try {
        console.log('=== AUTH DEBUG ===');
        
        const userData = getCurrentUser();
        console.log('User data from getCurrentUser():', userData);
        
        if (!userData) {
          throw new Error('No user data found. Please log in again.');
        }

        // If organization_id is not in userData, try to get it from localStorage
        if (!userData.organization_id) {
          const orgId = localStorage.getItem('organization_id');
          if (orgId) {
            console.log('Using organization_id from localStorage');
            userData.organization_id = orgId;
          } else {
            // If still no organization_id, try to fetch it from the API
            try {
              const response = await fetch('http://localhost:8000/api/v1/users/me/', {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`,
                  'Content-Type': 'application/json',
                },
              });
              
              if (response.ok) {
                const userDetails = await response.json();
                console.log('Fetched user details from API:', userDetails);
                if (userDetails.organization_id) {
                  userData.organization_id = userDetails.organization_id;
                  localStorage.setItem('organization_id', userDetails.organization_id);
                }
              }
            } catch (err) {
              console.error('Error fetching user details:', err);
            }
          }
        }

        // Set organization_id in localStorage if it exists
        if (userData.organization_id) {
          localStorage.setItem('organization_id', userData.organization_id);
        }

        console.log('Final user data with organization:', {
          id: userData?.id,
          email: userData?.email,
          organization_id: userData?.organization_id,
          role: userData?.role,
        });
        
        setUser(userData);
        
      } catch (error) {
        console.error('Error initializing user:', error);
        setError('Failed to load user data. Please refresh the page or log in again.');
        setLoading(false);
      }
    };

    initializeUser();
  }, []);

  // Fetch clients when user data is available
  const fetchClients = useCallback(async () => {
    if (!user?.organization_id) {
      console.log('User or organization_id not available yet');
      if (user) {
        console.log('User available but missing organization_id:', user);
        setError('Organization ID is missing. Please contact support.');
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('=== DEBUG: Starting fetchClients ===');
      console.log('Current user:', user);
      console.log('Organization ID:', user.organization_id);

      // Get token from auth context
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        throw new Error('No access token found. Please log in again.');
      }

      const endpoint = `http://localhost:8000/api/v1/clients/?organization_id=${user.organization_id}`;
      console.log('API Endpoint:', endpoint);

      console.log('Making API request...');
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for cookies if using httpOnly tokens
      });
      
      console.log('Response status:', response.status);
      
      if (response.status === 401) {
        // Token might be expired, try to refresh
        console.log('Token might be expired, attempting to refresh...');
        const refreshResponse = await fetch('http://localhost:8000/api/v1/token/refresh/', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            refresh: localStorage.getItem('refresh_token')
          }),
        });

        if (refreshResponse.ok) {
          const { access } = await refreshResponse.json();
          localStorage.setItem('access_token', access);
          // Retry the original request with the new token
          return fetchClients();
        } else {
          // Refresh failed, force logout
          console.error('Token refresh failed, logging out...');
          logout();
          return;
        }
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { detail: errorText };
        }
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const responseData = await response.text();
      console.log('Raw API response:', responseData);
      
      let data;
      try {
        data = JSON.parse(responseData);
      } catch (e) {
        console.error('Failed to parse JSON response:', e);
        throw new Error('Invalid JSON response from server');
      }
      
      console.log('Parsed API Response:', data);
      
      // Handle different response formats
      const clientsList = Array.isArray(data) ? data : 
                        (Array.isArray(data?.results) ? data.results : 
                        (Array.isArray(data?.data) ? data.data : []));
      
      console.log('Processed clients list:', clientsList);
      
      if (clientsList.length === 0) {
        console.log('No clients found in the response');
        setClients([]);
        return;
      }

      const formattedClients: Client[] = clientsList.map((client: any) => ({
        id: client.id || client.client_id || '',
        name: client.name || client.full_name || 'No Name',
        email: client.email || 'No Email',
        phone: client.phone || client.phone_number || 'No Phone',
        status: client.status || 'active',
        createdAt: client.createdAt || client.created_at || new Date().toISOString(),
        updatedAt: client.updatedAt || client.updated_at || new Date().toISOString(),
        organization: client.organization || user.organization_id || '',
        contact_person: client.contact_person,
        address: client.address,
        source: client.source,
        notes: client.notes,
        is_active: client.is_active ?? true,
      }));
      
      console.log('Setting clients state with:', formattedClients);
      setClients(formattedClients);
      
    } catch (error: unknown) {
      console.error('Error in fetchClients:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(`Failed to load clients: ${errorMessage}`);
      toast({
        title: 'Error',
        description: `Failed to load clients: ${errorMessage}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user?.organization_id) {
      fetchClients();
    } else {
      console.log('User or organization_id not available yet');
      if (user) {
        console.log('User available but missing organization_id:', user);
        setError('Organization ID is missing. Please contact support.');
      }
      setLoading(false);
    }
  }, [user, fetchClients]);

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="rounded-md border p-4">
          <Skeleton className="h-10 w-full mb-2" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="text-sm text-muted-foreground flex flex-col space-y-2">
          <div className="flex items-center">
            <span className="inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></span>
            <span>Loading clients...</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {user?.organization_id ? (
              `Fetching clients for organization: ${user.organization_id}`
            ) : (
              'Waiting for user organization...'
            )}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Clients</h2>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4">
          <div className="flex items-center text-destructive">
            <AlertCircle className="h-5 w-5 mr-2" />
            <h3 className="font-medium">Error Loading Clients</h3>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleClientAdded = async () => {
    await fetchClients();
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
            </DialogHeader>
            <AddClientForm
              onClose={() => setIsFormOpen(false)}
              onSuccess={handleClientAdded}
            />
          </DialogContent>
        </Dialog>
      </div>
      <div className="rounded-md border">
        <DataTable 
          columns={columns} 
          data={clients} 
          emptyMessage="No clients found. Add your first client to get started."
        />
      </div>
    </div>
  );
};

export default ClientsPage;