'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { getCurrentUserWithFallback } from '@/lib/auth';
import { User } from '@/lib/auth';

export default function ProjectSettings() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    timezone: 'UTC+05:45',
    notifications: true,
    emailNotifications: true,
  });

  useEffect(() => {
    const currentUser = getCurrentUserWithFallback();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    
    setUser(currentUser);
    
    // Set initial form data from user
    setFormData({
      email: currentUser.email || '',
      firstName: currentUser.first_name || '',
      lastName: currentUser.last_name || '',
      phone: currentUser.phone || '',
      timezone: 'UTC+05:45',
      notifications: true,
      emailNotifications: true,
    });
    
    setLoading(false);
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement save settings
    console.log('Saving settings:', formData);
    // Add API call to save settings
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Project Settings</h1>
        <p className="text-muted-foreground">
          Manage your project settings and preferences
        </p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md mb-8">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="members">Team Members</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Update your project's general information and settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="projectName">Project Name</Label>
                  <Input
                    id="projectName"
                    name="projectName"
                    placeholder="Enter project name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectDescription">Description</Label>
                  <Input
                    id="projectDescription"
                    name="projectDescription"
                    placeholder="Enter project description"
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit">Save Changes</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                Manage who has access to this project.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">Invite Team Members</h3>
                    <p className="text-sm text-muted-foreground">
                      Invite team members by email address
                    </p>
                  </div>
                  <Button>Invite</Button>
                </div>
                
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-4">Current Members</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          {user.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">Owner</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure how you receive notifications for this project.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="taskUpdates">Task Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications for task updates
                  </p>
                </div>
                <Switch
                  id="taskUpdates"
                  checked={formData.notifications}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, notifications: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="emailDigest">Daily Email Digest</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive a daily summary of project activity
                  </p>
                </div>
                <Switch
                  id="emailDigest"
                  checked={formData.emailNotifications}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, emailNotifications: checked })
                  }
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSubmit}>Save Preferences</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
