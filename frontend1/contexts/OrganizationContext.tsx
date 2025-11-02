'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  // Add other organization properties as needed
}

interface OrganizationContextType {
  currentOrganization: Organization | null;
  setCurrentOrganization: (org: Organization | null) => void;
  organizations: Organization[];
  loading: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  // Load user's organizations on mount
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setLoading(true);
        // Replace with your actual API call to fetch user's organizations
        // const response = await apiGet('/organizations/');
        // setOrganizations(response.data);
        
        // For now, using mock data
        const mockOrgs: Organization[] = [
          { id: '1', name: 'Acme Inc', slug: 'acme-inc' },
          { id: '2', name: 'Tech Corp', slug: 'tech-corp' },
        ];
        
        setOrganizations(mockOrgs);
        
        // Set the first organization as default if none is selected
        if (mockOrgs.length > 0 && !currentOrganization) {
          setCurrentOrganization(mockOrgs[0]);
        }
      } catch (error) {
        console.error('Failed to fetch organizations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  return (
    <OrganizationContext.Provider 
      value={{
        currentOrganization,
        setCurrentOrganization,
        organizations,
        loading
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export const useOrganization = (): OrganizationContextType => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};
