'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { apiGet, apiPost, apiPut } from '@/services/apiService';
import { API_URL } from '@/constant';
import { useOrganization } from '@/contexts/OrganizationContext';

// Form validation schema
const projectFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  status: z.enum(['planning', 'in_progress', 'on_hold', 'completed', 'cancelled']),
  cost: z.number().min(0, 'Cost cannot be negative'),
  discount: z.number().min(0, 'Discount cannot be negative').optional(),
  start_date: z.string().optional(),
  deadline: z.string().optional(),
  client_id: z.string().min(1, 'Client is required'),
  project_manager_id: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface ProjectFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: any;
}

export function ProjectForm({ onSuccess, onCancel, initialData }: ProjectFormProps) {
  const { toast } = useToast?.() || { toast: (props: any) => console.log('Toast:', props) };
  const router = useRouter();
  const { currentOrganization } = useOrganization();
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [organizationUsers, setOrganizationUsers] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: initialData || {
      title: '',
      description: '',
      status: 'planning',
      cost: 0,
      discount: 0,
      start_date: '',
      deadline: '',
      client_id: '',
      project_manager_id: '',
    },
  });

  // Fetch clients and organization users when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!currentOrganization?.id) return;
        
        // Fetch clients
        const clientsResponse = await apiGet<any>(`/clients/?organization=${currentOrganization.id}`);
        console.log('Clients API Response:', clientsResponse);
        
        // Handle different response formats
        let clientsData = [];
        if (Array.isArray(clientsResponse)) {
          clientsData = clientsResponse;
        } else if (clientsResponse && typeof clientsResponse === 'object') {
          // If response is an object with a results array
          clientsData = clientsResponse.results || clientsResponse.data || [];
        }
        setClients(clientsData);
        
        // Fetch all organization users
        const usersResponse = await apiGet<any>(`/organization/users/?organization=${currentOrganization.id}`);
        console.log('Organization Users API Response:', usersResponse);
        
        // Handle different response formats
        let usersData = [];
        if (Array.isArray(usersResponse)) {
          usersData = usersResponse;
        } else if (usersResponse && typeof usersResponse === 'object') {
          // If response is an object with a results array
          usersData = usersResponse.results || usersResponse.data || [];
        }
        setOrganizationUsers(usersData);
        
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load required data',
          variant: 'destructive',
        });
      }
    };

    fetchData();
  }, [currentOrganization, toast]);

  const onSubmit = async (data: ProjectFormValues) => {
    const url = initialData ? `/projects/projects/${initialData.id}/` : '/projects/projects/';
    
    try {
      setIsLoading(true);
      
      const payload = {
        ...data,
        cost: Number(data.cost),
        discount: Number(data.discount) || 0,
        // Ensure project_manager_id is sent as a string or null
        project_manager_id: data.project_manager_id || null,
      };

      if (initialData) {
        await apiPut(url, payload);
      } else {
        await apiPost(url, payload);
      }
      
      toast({
        title: 'Success',
        description: `Project ${initialData ? 'updated' : 'created'} successfully`,
      });
      
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('Error saving project:', error);
      const errorMessage = error.response?.data?.message || 'Failed to save project. Please try again.';
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            {...form.register('title')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Project title"
          />
          {form.formState.errors.title && (
            <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">Status</label>
          <select
            {...form.register('status')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="planning">Planning</option>
            <option value="in_progress">In Progress</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">
            Client <span className="text-red-500">*</span>
          </label>
          <select
            {...form.register('client_id')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Select a client</option>
            {Array.isArray(clients) && clients.length > 0 ? (
              clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name || `Client ${client.id}`}
                </option>
              ))
            ) : (
              <option disabled>No clients found</option>
            )}
          </select>
          {form.formState.errors.client_id && (
            <p className="text-sm text-red-500">{form.formState.errors.client_id.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">Project Manager</label>
          <select
            {...form.register('project_manager_id')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
          >
            <option value="">Select a project manager</option>
            {Array.isArray(organizationUsers) && organizationUsers.length > 0 ? (
              organizationUsers.map((user) => (
                <option 
                  key={user.id} 
                  value={user.id}
                  className="flex items-center"
                >
                  {user.user?.name || user.user?.email || `User ${user.id}`}
                  {user.role && ` (${user.role.replace('_', ' ')})`}
                </option>
              ))
            ) : (
              <option disabled>Loading users...</option>
            )}
          </select>
          {form.formState.errors.project_manager_id && (
            <p className="text-sm font-medium text-destructive">
              {form.formState.errors.project_manager_id.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">
            Cost ($) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            {...form.register('cost', { valueAsNumber: true })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="0.00"
          />
          {form.formState.errors.cost && (
            <p className="text-sm text-red-500">{form.formState.errors.cost.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">Discount ($)</label>
          <input
            type="number"
            step="0.01"
            {...form.register('discount', { valueAsNumber: true })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="0.00"
          />
          {form.formState.errors.discount && (
            <p className="text-sm text-red-500">{form.formState.errors.discount.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">Start Date</label>
          <input
            type="date"
            {...form.register('start_date')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">Deadline</label>
          <input
            type="date"
            {...form.register('deadline')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium leading-none">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          {...form.register('description')}
          rows={4}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Project description"
        />
        {form.formState.errors.description && (
          <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>
        )}
      </div>

      <div className="flex justify-end space-x-4 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
        >
          Cancel
        </button>
        <button 
          type="submit" 
          disabled={isLoading}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {initialData ? 'Updating...' : 'Creating...'}
            </>
          ) : initialData ? (
            'Update Project'
          ) : (
            'Create Project'
          )}
        </button>
      </div>
    </form>
  );
}
