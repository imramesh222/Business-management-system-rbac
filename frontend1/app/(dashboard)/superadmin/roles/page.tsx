'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Shield, User, Settings, Eye, Edit, Trash2, Search } from 'lucide-react';

type Role = {
  id: string;
  name: string;
  description: string;
  userCount: number;
  permissions: string[];
};

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([
    {
      id: 'admin',
      name: 'Administrator',
      description: 'Full access to all features and settings',
      userCount: 3,
      permissions: ['all'],
    },
    {
      id: 'manager',
      name: 'Project Manager',
      description: 'Can manage projects and team members',
      userCount: 12,
      permissions: ['projects:read', 'projects:write', 'users:read', 'tasks:manage'],
    },
    {
      id: 'developer',
      name: 'Developer',
      description: 'Can work on assigned tasks and projects',
      userCount: 45,
      permissions: ['projects:read', 'tasks:update', 'code:push'],
    },
  ]);

  const availablePermissions = [
    'users:read', 'users:write', 'users:delete',
    'projects:read', 'projects:write', 'projects:delete',
    'settings:read', 'settings:write',
    'billing:read', 'billing:write',
    'reports:view', 'reports:generate',
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Roles & Permissions</h1>
          <p className="mt-2 text-gray-600">Manage user roles and their permissions</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add New Role
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Roles</CardTitle>
                <CardDescription>{roles.length} roles defined</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Users</CardTitle>
                <CardDescription>{roles.reduce((acc, role) => acc + role.userCount, 0)} total users</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Settings className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Permissions</CardTitle>
                <CardDescription>{availablePermissions.length} permissions available</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Roles</CardTitle>
              <CardDescription>Manage user roles and their permissions</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search roles..."
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {roles.map((role) => (
              <div key={role.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">{role.name}</h3>
                    <p className="text-sm text-gray-500">{role.description}</p>
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <User className="h-4 w-4 mr-1" />
                      <span>{role.userCount} users</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {role.permissions.includes('all') ? (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                          All Permissions
                        </span>
                      ) : (
                        role.permissions.slice(0, 3).map((perm) => (
                          <span key={perm} className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                            {perm}
                          </span>
                        ))
                      )}
                      {role.permissions.length > 3 && !role.permissions.includes('all') && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-full">
                          +{role.permissions.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
