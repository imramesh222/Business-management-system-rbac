// app/organization/project/team/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Filter, Plus, Mail, Phone, MoreVertical, User, UserCheck, UserX } from 'lucide-react';
import { fetchTeamMembers } from '@/services/projectManagerService';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: 'active' | 'inactive' | 'on_leave';
  avatar: string | null;
  projects: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  joined_date: string;
}

export default function TeamPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadTeamMembers = async () => {
      try {
        const data = await fetchTeamMembers();
        setTeamMembers(data);
      } catch (err) {
        setError('Failed to load team members');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadTeamMembers();
  }, []);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      active: { label: 'Active', variant: 'default' },
      inactive: { label: 'Inactive', variant: 'outline' },
      on_leave: { label: 'On Leave', variant: 'secondary' },
    };
    const statusInfo = statusMap[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      admin: { label: 'Admin', variant: 'default' },
      manager: { label: 'Manager', variant: 'secondary' },
      developer: { label: 'Developer', variant: 'outline' },
      designer: { label: 'Designer', variant: 'outline' },
    };
    const roleInfo = roleMap[role.toLowerCase()] || { label: role, variant: 'outline' as const };
    return <Badge variant={roleInfo.variant} className="text-xs">{roleInfo.label}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <UserCheck className="h-4 w-4 text-green-500" />;
      case 'inactive':
        return <UserX className="h-4 w-4 text-gray-500" />;
      case 'on_leave':
        return <User className="h-4 w-4 text-yellow-500" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const filteredMembers = (status: string) => {
    return teamMembers
      .filter(member => status === 'all' || member.status === status)
      .filter(member =>
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.role.toLowerCase().includes(searchQuery.toLowerCase())
      );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="flex justify-between items-center">
            <div className="h-10 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded w-1/6"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                  <div className="space-y-1">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-sm text-gray-500">Manage your team members</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Search team members..."
            className="pl-10 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Members</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
          <TabsTrigger value="on_leave">On Leave</TabsTrigger>
        </TabsList>

        {(['all', 'active', 'inactive', 'on_leave'] as const).map((status) => (
          <TabsContent key={status} value={status} className="space-y-4">
            {filteredMembers(status).length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No team members found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMembers(status).map((member) => (
                  <Card key={member.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={member.avatar || ''} alt={member.name} />
                              <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-medium">{member.name}</h3>
                              <p className="text-sm text-gray-500">{member.role}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {getStatusBadge(member.status)}
                                {getRoleBadge(member.role)}
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-700">{member.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-700">{member.phone || 'Not provided'}</span>
                          </div>
                        </div>
                        
                        <div className="pt-2 border-t">
                          <h4 className="text-sm font-medium mb-2">Projects ({member.projects.length})</h4>
                          <div className="flex flex-wrap gap-2">
                            {member.projects.slice(0, 3).map(project => (
                              <Badge key={project.id} variant="outline" className="text-xs">
                                {project.name}
                              </Badge>
                            ))}
                            {member.projects.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{member.projects.length - 3} more
                              </Badge>
                            )}
                            {member.projects.length === 0 && (
                              <span className="text-xs text-gray-500">No projects assigned</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="pt-2 border-t">
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Joined {new Date(member.joined_date).toLocaleDateString()}</span>
                            <Button variant="ghost" size="sm" className="h-8">
                              <Mail className="mr-2 h-4 w-4" />
                              Message
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}