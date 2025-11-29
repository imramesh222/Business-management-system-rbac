'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiGet, apiPost, apiPut } from '@/services/apiService';

// Form validation schema
const projectFormSchema = z.object({
  title: z.string().min(3, 'Project title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  status: z.enum(['planning', 'in_progress', 'on_hold', 'completed', 'cancelled']),
  priority: z.enum(['low', 'medium', 'high']),
  client: z.string().min(1, 'Client is required'),
  cost: z.number().min(0, 'Cost must be a positive number'),
  discount: z.number().min(0).default(0),
  project_manager: z.string().nullable().optional(),
  start_date: z.date({
    required_error: 'Start date is required',
  }),
  end_date: z.date().nullable(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  organization_role?: string;
  organization_id?: string;
  organization_name?: string;
  // Add these lines to support nested user objects
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

interface Client {
  id: string;
  name: string;
  email: string;
  organization?: string;
  organization_id?: string;
  [key: string]: any; // For any additional properties
}

interface ProjectFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: any;
  organizationId: string;
  isSuperAdmin?: boolean;
  isOrgAdmin?: boolean;
  currentUser?: User | null;
}

export function ProjectForm({
  onSuccess,
  onCancel,
  initialData,
  organizationId: propOrganizationId,
  isSuperAdmin: propIsSuperAdmin = false,
  isOrgAdmin: propIsOrgAdmin = false,
  currentUser: propCurrentUser
}: ProjectFormProps) {
  const { toast } = useToast?.() || { toast: (props: any) => console.log('Toast:', props) };
  const router = useRouter();
  const { user: authUser } = useAuth();

  // Use props with fallback to auth context
  const currentUser = propCurrentUser || authUser;
  const organizationId = propOrganizationId || currentUser?.organization_id;
  const isSuperAdmin = propIsSuperAdmin || currentUser?.role === 'superadmin';
  const isOrgAdmin = propIsOrgAdmin || currentUser?.organization_role === 'admin';

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [projectManagers, setProjectManagers] = useState<User[]>([]);

  // Debug mount
  useEffect(() => {
    console.log('ProjectForm mounted with:', {
      propOrganizationId,
      propIsSuperAdmin,
      propIsOrgAdmin,
      propCurrentUser,
      authUser,
      derivedValues: {
        currentUser,
        organizationId,
        isSuperAdmin,
        isOrgAdmin
      }
    });
  }, [propOrganizationId, propIsSuperAdmin, propIsOrgAdmin, propCurrentUser, authUser, currentUser, organizationId, isSuperAdmin, isOrgAdmin]);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      status: initialData?.status || 'planning',
      priority: initialData?.priority || 'medium',
      start_date: initialData?.start_date ? new Date(initialData.start_date) : new Date(),
      end_date: initialData?.end_date ? new Date(initialData.end_date) : null,
      client: initialData?.client?.id || initialData?.client || '',
      cost: initialData?.cost || 0,
      discount: initialData?.discount || 0,
      project_manager: (!isSuperAdmin && !isOrgAdmin && currentUser?.id) 
        ? currentUser.id 
        : (initialData?.project_manager?.id || initialData?.project_manager || null)
    },
  });

  // Debug logs
  useEffect(() => {
    if (organizationId) {
      console.log('ProjectForm debug:', {
        isSuperAdmin,
        isOrgAdmin,
        hasProjectManagers: projectManagers.length > 0,
        organizationId,
        currentUser: {
          id: currentUser?.id,
          role: currentUser?.role,
          organization_role: currentUser?.organization_role,
          organization_id: currentUser?.organization_id
        },
        formValues: form.getValues()
      });
    }
  }, [isSuperAdmin, isOrgAdmin, projectManagers, organizationId, currentUser, form]);

  // Fetch clients and project managers
  useEffect(() => {
    if (!organizationId) {
      console.error('Cannot fetch data: organizationId is not defined');
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        console.log('Fetching data for organization:', organizationId);

        // Debug: Log the organization ID being used
        console.log('Fetching clients for organization ID:', organizationId);

        // Fetch clients for the current organization with organization_id filter
        let clientsResponse;
        try {
          // First try with organization_id in query params
          clientsResponse = await apiGet(`/clients/?organization_id=${organizationId}`);
          console.log('Clients response with organization filter:', clientsResponse);

          // If no results, try with organization in the request body
          if ((Array.isArray(clientsResponse) && clientsResponse.length === 0) ||
            (clientsResponse?.results && clientsResponse.results.length === 0)) {
            console.log('No clients found with query param filter, trying with body filter...');
            clientsResponse = await apiPost('/clients/filter/', { organization_id: organizationId });
          }
        } catch (error) {
          console.error('Error with filtered client fetch, trying unfiltered...', error);
          // Last resort: try getting all clients and filter client-side
          clientsResponse = await apiGet('/clients/');
        }

        // Process the API response
        console.log('Raw clients API response:', JSON.stringify(clientsResponse, null, 2));

        // Extract clients from response, handling different formats
        let clientsData = [];
        if (Array.isArray(clientsResponse)) {
          clientsData = clientsResponse;
        } else if (clientsResponse?.results) {
          clientsData = Array.isArray(clientsResponse.results) ? clientsResponse.results : [];
        } else if (clientsResponse?.data) {
          clientsData = Array.isArray(clientsResponse.data) ? clientsResponse.data : [];
        } else if (clientsResponse && typeof clientsResponse === 'object') {
          // Handle case where response is a single client object
          clientsData = [clientsResponse];
        }

        console.log(`Found ${clientsData.length} clients in response`);

        // Log the organization ID we're filtering by
        console.log(`Filtering clients for organization ID: ${organizationId}`);

        // Filter clients by organization as an additional safety check
        const filteredClients = clientsData.filter((client: any) => {
          if (!client) return false;

          try {
            // Handle different organization field formats
            let orgId = null;

            if (client.organization) {
              if (typeof client.organization === 'object' && client.organization !== null) {
                orgId = client.organization.id || client.organization._id || null;
              } else {
                orgId = client.organization;
              }
            }

            // Fallback to organization_id if organization is not set
            if (!orgId && client.organization_id) {
              orgId = client.organization_id;
            }

            // If we still don't have an org ID, log a warning
            if (!orgId) {
              console.warn(`Client ${client.id || 'unknown'} has no organization set`);
              return false;
            }

            const orgMatch = orgId.toString() === organizationId.toString();

            if (process.env.NODE_ENV === 'development') {
              console.log(`Client ${client.id || 'unknown'} (${client.name || 'unnamed'}) org: ${orgId || 'none'}, matches: ${orgMatch}`);
            }

            return orgMatch;
          } catch (error) {
            console.error('Error processing client:', error, client);
            return false;
          }
        });

        console.log(`Filtered to ${filteredClients.length} clients for organization ${organizationId}`);

        // Update the clients state
        setClients(filteredClients);

        // Auto-select if there's exactly one client
        if (filteredClients.length === 1) {
          console.log('Auto-selecting the only available client');
          form.setValue('client', filteredClients[0].id);
        }

        // If super admin or org admin, fetch project managers
        if (isSuperAdmin || isOrgAdmin) {
          console.log('Fetching project managers for org:', organizationId);
          const pmsResponse = await apiGet(`/org/organizations/${organizationId}/members/?role=project_manager`);
          // Debug logging
          console.log('Project Managers API Response:', pmsResponse);
          // Ensure we have an array, even if the response is an object with a results property
          const pmsData = Array.isArray(pmsResponse) ? pmsResponse : (pmsResponse?.results || []);
          console.log('Processed Project Managers Data:', pmsData);
          setProjectManagers(pmsData);
        }
      } catch (error) {
        console.error('Error fetching form data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load form data',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [organizationId, isSuperAdmin, isOrgAdmin, toast]);

  const startDate = form.watch('start_date');
  const endDate = form.watch('end_date');


  const onSubmit = async (data: ProjectFormValues) => {
    console.log('Form submission started with data:', data);

    // Validate form data
    const isValid = await form.trigger();
    if (!isValid) {
      console.error('Form validation failed:', form.formState.errors);
      return;
    }
    if (!organizationId) {
      toast({
        title: 'Error',
        description: 'Organization ID is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      console.log('Form data:', data);

      // Use a relative URL without the leading slash to prevent duplicate 'projects' in the path
      const url = initialData ? `projects/${initialData.id}/` : 'projects/';
      const payload = {
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        cost: parseFloat(data.cost.toString()),
        discount: parseFloat((data.discount || 0).toString()),
        client: data.client,
        start_date: data.start_date ? new Date(data.start_date).toISOString().split('T')[0] : null,
        end_date: data.end_date ? new Date(data.end_date).toISOString().split('T')[0] : null,
        project_manager: data.project_manager || null,
        organization_id: organizationId,
      };
      
      console.log('Sending payload:', payload);

      console.log('Submitting project with payload:', payload);

      const response = initialData
        ? await apiPut(url, payload)
        : await apiPost(url, payload);

      console.log('API Response:', response);

      toast({
        title: 'Success',
        description: `Project ${initialData ? 'updated' : 'created'} successfully`,
      });

      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('Error saving project:', error);
      const errorMessage = error.response?.data?.message ||
        error.message ||
        'Failed to save project. Please try again.';

      console.error('Error details:', {
        response: error.response,
        data: error.response?.data,
        status: error.response?.status,
        formErrors: form.formState.errors,
        formValues: form.getValues()
      });

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Debug form state changes
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      console.log('Form value changed:', { value, name, type });
    });
    return () => subscription.unsubscribe();
  }, [form]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{initialData ? 'Edit' : 'New'} Project</h2>
      </div>

      <form id="projectForm" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Project Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Project Title</Label>
            <div className="relative">
              <Input
                id="title"
                placeholder="Enter project title"
                {...form.register('title')}
                className={form.formState.errors.title ? 'border-red-500' : ''}
              />
              {form.formState.errors.title && (
                <p className="mt-1 text-sm text-red-500">{form.formState.errors.title.message}</p>
              )}
            </div>
          </div>

          {/* Client Selection */}
          <div className="space-y-2">
            <Label htmlFor="client">Client</Label>
            {isLoading ? (
              <div className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm flex items-center">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2"></div>
                Loading clients...
              </div>
            ) : clients.length === 0 ? (
              <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                No clients found.
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-sm ml-1 text-yellow-800 hover:text-yellow-900"
                  onClick={() => window.open('/clients/new', '_blank')}
                >
                  + Add New Client
                </Button>
              </div>
            ) : (
              <>
                <Select
                  value={form.watch('client')}
                  onValueChange={(value) => form.setValue('client', value)}
                >
                  <SelectTrigger className={form.formState.errors.client ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.client && (
                  <p className="mt-1 text-sm text-red-500">{form.formState.errors.client.message}</p>
                )}
              </>
            )}
          </div>

          {/* Project Manager (for super admins and org admins) */}
          {(isSuperAdmin || isOrgAdmin) && (
            <div className="space-y-2">
              <Label htmlFor="project_manager">
                Project Manager
                {projectManagers.length === 0 && (
                  <span className="ml-2 text-sm text-yellow-600">
                    (No project managers found in this organization)
                  </span>
                )}
              </Label>
              {projectManagers.length > 0 ? (
                <Select
                  value={form.watch('project_manager') || ''}
                  onValueChange={(value) => form.setValue('project_manager', value || null)}
                >
                  <SelectTrigger className={form.formState.errors.project_manager ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select a project manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectManagers.map((pm) => (
                      <SelectItem key={pm.id} value={pm.id}>
                        {pm.user?.name || pm.user?.email || pm.email || `User ${pm.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="rounded-md border border-dashed p-4 text-sm text-gray-500">
                  No project managers available in this organization. Please add project managers first.
                </div>
              )}
              {form.formState.errors.project_manager && (
                <p className="mt-1 text-sm text-red-500">
                  {form.formState.errors.project_manager.message}
                </p>
              )}
            </div>
          )}

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              onValueChange={(value) => form.setValue('status', value as any)}
              defaultValue={form.getValues('status')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && form.setValue('start_date', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>End Date (Optional)</Label>
              {endDate && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => form.setValue('end_date', null)}
                  className="h-6 px-2 text-xs text-muted-foreground"
                >
                  Clear
                </Button>
              )}
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate || undefined}
                  onSelect={(date) => date && form.setValue('end_date', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              onValueChange={(value) => form.setValue('priority', value as any)}
              defaultValue={form.getValues('priority')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cost and Discount */}
          <div className="space-y-2">
            <Label htmlFor="cost">Cost ($)</Label>
            <Input
              id="cost"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...form.register('cost', { 
                valueAsNumber: true,
                required: 'Cost is required',
                min: { value: 0, message: 'Cost must be a positive number' }
              })}
            />
            {form.formState.errors.cost && (
              <p className="mt-1 text-sm text-red-500">{form.formState.errors.cost.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="discount">Discount ($)</Label>
            <Input
              id="discount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...form.register('discount', { 
                valueAsNumber: true,
                min: { value: 0, message: 'Discount cannot be negative' }
              })}
            />
            {form.formState.errors.discount && (
              <p className="mt-1 text-sm text-red-500">{form.formState.errors.discount.message}</p>
            )}
          </div>

        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Enter project description"
            className="min-h-[120px]"
            {...form.register('description')}
          />
          {form.formState.errors.description && (
            <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>
          )}
        </div>

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel || (() => router.back())}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="projectForm"
            disabled={isSubmitting}
            onClick={() => {
              console.log('Submit button clicked');
              console.log('Form values:', form.getValues());
              console.log('Form errors:', form.formState.errors);
              console.log('Is form valid?', form.formState.isValid);
            }}
          >
            {isSubmitting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Creating...
              </>
            ) : (
              'Create Project'
            )}
          </Button>

          {/* Debug button */}
          <button
            type="button"
            className="text-xs text-gray-500 mt-2 block"
            onClick={() => {
              console.log('--- DEBUG FORM ---');
              console.log('Form values:', form.getValues());
              console.log('Form errors:', form.formState.errors);
              console.log('Is form valid?', form.formState.isValid);
              console.log('Is submitting?', isSubmitting);
              console.log('Organization ID:', organizationId);
              console.log('Current user:', currentUser);
              console.log('------------------');
            }}
          >
            Debug Form State
          </button>
        </div>
      </form>
    </div>
  );
}
