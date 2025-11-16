'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUserWithFallback } from '../../lib/auth';
import { getApiUrl, getDefaultHeaders, handleApiResponse } from '../../lib/api';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Mail, Phone, MapPin, Clock, Edit, Save, X, Activity } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    location: ''
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      const currentUser = getCurrentUserWithFallback();
      
      if (!currentUser) {
        router.push('/login');
        return;
      }

      try {
        const response = await fetch(getApiUrl('users/me/'), {
          method: 'GET',
          headers: getDefaultHeaders(),
          credentials: 'include',
        });

        const data = await handleApiResponse<any>(response);
        
        // Use the same structure as getCurrentUser() to ensure consistency
        const userData = {
          ...currentUser,
          ...data,
          // Ensure the role comes from the same source as other pages
          role: currentUser.role || data.role,
          organization_role: currentUser.organization_role || data.organization_role
        };
        
        setUser(userData);
        setFormData({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone_number || '',
          bio: data.bio || 'No bio provided',
          location: data.location || 'Not specified'
        });
      } catch (error) {
        console.error('Error fetching user profile:', error);
        toast.error('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      const response = await fetch(getApiUrl('users/me/'), {
        method: 'PATCH',
        headers: getDefaultHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          phone_number: formData.phone,
          bio: formData.bio,
          location: formData.location
        })
      });

      const data = await handleApiResponse<any>(response);
      setUser(data);
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handleLogout = () => {
    // Implement logout logic here
    router.push('/login');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar user={user} />

      {/* Main content area */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <span>Sign out</span>
            </Button>
          </div>
        </header>

        {/* Main content */}
        <main className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Profile card */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-0">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-24 -mx-6 -mt-6 rounded-t-lg"></div>
              </CardHeader>
              <CardContent className="pb-6 -mt-12">
                <div className="flex justify-center">
                  <Avatar className="h-24 w-24 border-4 border-white">
                    <AvatarImage src={user.profile_picture || ''} alt={user.name} />
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl">
                      {getInitials(user.name || user.email)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                
                <div className="text-center mt-4">
                  <h2 className="text-xl font-bold">{user.name || 'Anonymous User'}</h2>
                  <p className="text-gray-600">{user.role ? user.role.replace(/_/g, ' ') : 'User'}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    <Mail className="inline mr-1 h-4 w-4" />
                    {user.email}
                  </p>
                  {user.phone_number && (
                    <p className="text-sm text-gray-500 mt-1">
                      <Phone className="inline mr-1 h-4 w-4" />
                      {user.phone_number}
                    </p>
                  )}
                  {user.location && (
                    <p className="text-sm text-gray-500 mt-1">
                      <MapPin className="inline mr-1 h-4 w-4" />
                      {user.location}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    <Clock className="inline mr-1 h-3 w-3" />
                    Member since {formatDate(user.date_joined || user.created_at)}
                  </p>
                </div>

                <div className="mt-6">
                  <Button 
                    variant={isEditing ? 'outline' : 'default'} 
                    className="w-full"
                    onClick={() => isEditing ? setIsEditing(false) : setIsEditing(true)}
                  >
                    {isEditing ? (
                      <>
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                      </>
                    ) : (
                      <>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Profile
                      </>
                    )}
                  </Button>
                  {isEditing && (
                    <Button className="w-full mt-2" onClick={handleSave}>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">Projects</div>
                  <div className="font-medium">{user.projects_count || 0}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">Tasks Completed</div>
                  <div className="font-medium">{user.completed_tasks || 0}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">Member Since</div>
                  <div className="text-sm">{new Date(user.date_joined || user.created_at).getFullYear()}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="overview" onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 max-w-md mb-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <Card>
                  <CardHeader>
                    <CardTitle>About</CardTitle>
                    <CardDescription>
                      {isEditing ? (
                        <textarea
                          name="bio"
                          value={formData.bio}
                          onChange={handleInputChange}
                          className="w-full p-2 border rounded mt-2 min-h-[100px]"
                          placeholder="Tell us about yourself..."
                        />
                      ) : (
                        <p className="text-gray-600 mt-2">
                          {user.bio || 'No bio provided. Click Edit Profile to add one.'}
                        </p>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Full Name</h3>
                        {isEditing ? (
                          <Input
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className="mt-1"
                          />
                        ) : (
                          <p className="mt-1">{user.name || 'Not provided'}</p>
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Email</h3>
                        <p className="mt-1">{user.email}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Phone</h3>
                        {isEditing ? (
                          <Input
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            className="mt-1"
                          />
                        ) : (
                          <p className="mt-1">{user.phone_number || 'Not provided'}</p>
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Location</h3>
                        {isEditing ? (
                          <Input
                            name="location"
                            value={formData.location}
                            onChange={handleInputChange}
                            className="mt-1"
                          />
                        ) : (
                          <p className="mt-1 flex items-center">
                            <MapPin className="h-4 w-4 mr-1 inline" />
                            {user.location || 'Not specified'}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Your recent actions and updates</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {user.recent_activity?.length > 0 ? (
                      <div className="space-y-4">
                        {user.recent_activity.map((activity: any, index: number) => (
                          <div key={index} className="flex items-start pb-4 border-b last:border-0 last:pb-0">
                            <div className="bg-blue-100 p-2 rounded-full mr-3">
                              <Activity className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{activity.action}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(activity.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">No recent activity</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity">
                <Card>
                  <CardHeader>
                    <CardTitle>Activity Log</CardTitle>
                    <CardDescription>Detailed log of all your activities</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {user.activity_log?.length > 0 ? (
                      <div className="space-y-4">
                        {user.activity_log.map((log: any, index: number) => (
                          <div key={index} className="border-l-2 border-blue-500 pl-4 py-1">
                            <p className="text-sm">{log.action}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(log.timestamp).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">No activity logs found</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings">
                <Card>
                  <CardHeader>
                    <CardTitle>Account Settings</CardTitle>
                    <CardDescription>Manage your account preferences</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Change Password</h3>
                      <div className="space-y-4">
                        <Input type="password" placeholder="Current Password" />
                        <Input type="password" placeholder="New Password" />
                        <Input type="password" placeholder="Confirm New Password" />
                        <Button>Update Password</Button>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <h3 className="text-sm font-medium mb-2">Email Notifications</h3>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="task-updates" className="rounded" defaultChecked />
                          <label htmlFor="task-updates" className="text-sm">Task updates</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="project-updates" className="rounded" defaultChecked />
                          <label htmlFor="project-updates" className="text-sm">Project updates</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="announcements" className="rounded" defaultChecked />
                          <label htmlFor="announcements" className="text-sm">Announcements</label>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <h3 className="text-sm font-medium text-red-600 mb-2">Danger Zone</h3>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-gray-600 mb-2">
                            Deactivate your account. This will disable your profile and remove access to all projects.
                          </p>
                          <Button variant="outline" className="border-red-500 text-red-600 hover:bg-red-50">
                            Deactivate Account
                          </Button>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-2">
                            Permanently delete your account and all associated data. This action cannot be undone.
                          </p>
                          <Button variant="destructive">Delete Account</Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
        </main>
      </div>
    </div>
  );
}