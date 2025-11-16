'use client';

import { useState, useEffect } from 'react';
import { getCurrentUserWithFallback } from '@/lib/auth';
import { getApiUrl, getDefaultHeaders, handleApiResponse } from '@/lib/api';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Mail, Phone, MapPin, Clock, Edit, Save, X, Activity } from 'lucide-react';

export function ProfileContent() {
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
        return;
      }

      try {
        const response = await fetch(getApiUrl('users/me/'), {
          method: 'GET',
          headers: getDefaultHeaders(),
          credentials: 'include',
        });

        const data = await handleApiResponse<any>(response);
        
        const userData = {
          ...currentUser,
          ...data,
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
  }, []);

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
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="p-6">
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
                  <Button 
                    className="w-full mt-2"
                    onClick={handleSave}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Profile details */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="overview" onValueChange={setActiveTab} value={activeTab}>
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>About</CardTitle>
                  <CardDescription>
                    This information will be displayed publicly so be careful what you share.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                          Full Name
                        </label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div>
                        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                          Bio
                        </label>
                        <textarea
                          id="bio"
                          name="bio"
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={formData.bio}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div>
                        <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                          Location
                        </label>
                        <Input
                          id="location"
                          name="location"
                          value={formData.location}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">About</h3>
                        <p className="mt-1 text-sm text-gray-900">
                          {formData.bio || 'No bio provided'}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Location</h3>
                        <p className="mt-1 text-sm text-gray-900">
                          {formData.location || 'Not specified'}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Your recent activities across the platform.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border-l-4 border-blue-500 pl-4 py-2">
                      <p className="text-sm text-gray-600">You updated your profile information</p>
                      <p className="text-xs text-gray-400">2 hours ago</p>
                    </div>
                    <div className="border-l-4 border-green-500 pl-4 py-2">
                      <p className="text-sm text-gray-600">You completed a task in Project X</p>
                      <p className="text-xs text-gray-400">1 day ago</p>
                    </div>
                    <div className="border-l-4 border-purple-500 pl-4 py-2">
                      <p className="text-sm text-gray-600">You were mentioned in a comment</p>
                      <p className="text-xs text-gray-400">3 days ago</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                  <CardDescription>
                    Manage your account settings and preferences.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Change Password</h3>
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-1">
                            Current Password
                          </label>
                          <Input
                            id="current-password"
                            name="current-password"
                            type="password"
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                            New Password
                          </label>
                          <Input
                            id="new-password"
                            name="new-password"
                            type="password"
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                            Confirm New Password
                          </label>
                          <Input
                            id="confirm-password"
                            name="confirm-password"
                            type="password"
                            className="w-full"
                          />
                        </div>
                        <Button>Update Password</Button>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <h3 className="text-sm font-medium mb-2">Email Notifications</h3>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="comments" className="rounded" defaultChecked />
                          <label htmlFor="comments" className="text-sm">Comments</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="mentions" className="rounded" defaultChecked />
                          <label htmlFor="mentions" className="text-sm">Mentions</label>
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
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
