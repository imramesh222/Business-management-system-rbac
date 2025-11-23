'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  Target,
  Phone,
  Mail,
  Calendar,
  Clock,
  Award
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

const metrics = [
  {
    title: 'Monthly Revenue',
    value: '$127,500',
    change: '+18.2%',
    changeType: 'positive',
    icon: DollarSign,
  },
  {
    title: 'Active Clients',
    value: '89',
    change: '+12 this month',
    changeType: 'positive',
    icon: Users,
  },
  {
    title: 'Conversion Rate',
    value: '24.5%',
    change: '+3.2%',
    changeType: 'positive',
    icon: Target,
  },
  {
    title: 'Quota Achievement',
    value: '112%',
    change: 'Above target',
    changeType: 'positive',
    icon: Award,
  },
];

const salesPipelineData = [
  { stage: 'Leads', value: 150, color: '#E5E7EB' },
  { stage: 'Qualified', value: 85, color: '#FEF3C7' },
  { stage: 'Proposal', value: 45, color: '#DBEAFE' },
  { stage: 'Negotiation', value: 25, color: '#D1FAE5' },
  { stage: 'Closed Won', value: 18, color: '#10B981' },
];

const revenueData = [
  { month: 'Jan', revenue: 85000, target: 100000 },
  { month: 'Feb', revenue: 92000, target: 100000 },
  { month: 'Mar', revenue: 108000, target: 110000 },
  { month: 'Apr', revenue: 115000, target: 110000 },
  { month: 'May', revenue: 127500, target: 120000 },
  { month: 'Jun', revenue: 135000, target: 125000 },
];

const topClients = [
  { name: 'TechCorp Inc.', revenue: '$45,000', deals: 3, status: 'active' },
  { name: 'Innovation Ltd.', revenue: '$32,500', deals: 2, status: 'active' },
  { name: 'StartupHub', revenue: '$28,000', deals: 4, status: 'negotiating' },
  { name: 'Enterprise Solutions', revenue: '$22,000', deals: 1, status: 'active' },
];

const upcomingActivities = [
  { id: 1, type: 'call', client: 'TechCorp Inc.', activity: 'Follow-up call', time: '10:00 AM', priority: 'high' },
  { id: 2, type: 'meeting', client: 'Innovation Ltd.', activity: 'Product demo', time: '2:00 PM', priority: 'high' },
  { id: 3, type: 'email', client: 'StartupHub', activity: 'Send proposal', time: '4:00 PM', priority: 'medium' },
  { id: 4, type: 'call', client: 'Enterprise Solutions', activity: 'Contract discussion', time: '5:00 PM', priority: 'low' },
];

const dealsByStage = [
  { stage: 'Prospecting', count: 25, value: 125000 },
  { stage: 'Qualification', count: 18, value: 180000 },
  { stage: 'Proposal', count: 12, value: 240000 },
  { stage: 'Negotiation', count: 8, value: 320000 },
  { stage: 'Closed Won', count: 5, value: 150000 },
];

export function SalesOverview() {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone className="h-4 w-4" />;
      case 'meeting': return <Calendar className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'negotiating': return 'text-blue-600 bg-blue-100';
      case 'inactive': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Sales Dashboard</h1>
        <p className="mt-2 text-gray-600">Track your sales performance and manage your pipeline</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => (
          <Card key={metric.title} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {metric.title}
              </CardTitle>
              <metric.icon className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
              <p className={`text-xs flex items-center mt-1 ${
                metric.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
              }`}>
                <TrendingUp className="h-3 w-3 mr-1" />
                {metric.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Trends and Sales Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue vs Target</CardTitle>
            <CardDescription>Monthly revenue performance against targets</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, '']} />
                <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} name="Revenue" />
                <Line type="monotone" dataKey="target" stroke="#3B82F6" strokeWidth={2} strokeDasharray="5 5" name="Target" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales Pipeline</CardTitle>
            <CardDescription>Current deals by stage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {salesPipelineData.map((stage, index) => (
                <div key={stage.stage} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{stage.stage}</span>
                    <span className="text-sm text-gray-500">{stage.value} deals</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all duration-300" 
                      style={{ 
                        width: `${(stage.value / salesPipelineData[0].value) * 100}%`,
                        backgroundColor: stage.color 
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deals by Stage Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Deal Value by Stage</CardTitle>
          <CardDescription>Total deal value and count by pipeline stage</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dealsByStage}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="stage" />
              <YAxis />
              <Tooltip formatter={(value, name) => [
                name === 'value' ? `$${value.toLocaleString()}` : value,
                name === 'value' ? 'Deal Value' : 'Deal Count'
              ]} />
              <Bar dataKey="value" fill="#3B82F6" name="value" />
              <Bar dataKey="count" fill="#10B981" name="count" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Clients and Upcoming Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Top Clients
            </CardTitle>
            <CardDescription>Your highest value clients this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topClients.map((client, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{client.name}</p>
                    <p className="text-sm text-gray-500">{client.deals} active deals</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">{client.revenue}</span>
                    <Badge className={getStatusColor(client.status)}>
                      {client.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4">
              View All Clients
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Today's Activities
            </CardTitle>
            <CardDescription>Your scheduled activities for today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingActivities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{activity.activity}</p>
                      <p className="text-sm text-gray-500">{activity.client}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">{activity.time}</span>
                    <Badge className={getPriorityColor(activity.priority)}>
                      {activity.priority}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4">
              View Full Calendar
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Frequently used sales tools and actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button className="h-20 flex-col space-y-2">
              <Users className="h-6 w-6" />
              <span>Add New Client</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col space-y-2">
              <DollarSign className="h-6 w-6" />
              <span>Create Deal</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col space-y-2">
              <Phone className="h-6 w-6" />
              <span>Log Call</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col space-y-2">
              <Mail className="h-6 w-6" />
              <span>Send Email</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Award className="h-5 w-5 mr-2 text-yellow-500" />
            Performance Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-green-800">Exceeding Quota!</span>
              </div>
              <p className="text-sm text-green-600 mt-1">You're at 112% of your monthly quota</p>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-blue-500" />
                <span className="text-sm font-medium text-blue-800">High Conversion</span>
              </div>
              <p className="text-sm text-blue-600 mt-1">24.5% conversion rate this month</p>
            </div>
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <Award className="h-5 w-5 text-purple-500" />
                <span className="text-sm font-medium text-purple-800">Top Performer</span>
              </div>
              <p className="text-sm text-purple-600 mt-1">Ranked #2 in the sales team</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}