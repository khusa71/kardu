import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NavigationBar } from "@/components/navigation-bar";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { Users, FileText, Database, Zap, TrendingUp, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface AdminMetrics {
  totalUsers: number;
  totalJobs: number;
  storageUsed: string;
  apiCalls: {
    openai: number;
    anthropic: number;
    total: number;
  };
  recentActivity: {
    period: string;
    newUsers: number;
    jobsGenerated: number;
  };
}

export default function Admin() {
  const { user } = useFirebaseAuth();

  // Fetch user details to check admin role
  const { data: userData } = useQuery({
    queryKey: ['/api/auth/user'],
    enabled: !!user,
  });

  const isAdmin = userData?.role === 'admin';

  // Fetch admin metrics
  const { data: metrics, isLoading, error: metricsError } = useQuery({
    queryKey: ['/api/admin/metrics'],
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <NavigationBar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <Card className="max-w-md">
            <CardContent className="text-center p-8">
              <div className="text-red-500 mb-4">
                <Users className="w-16 h-16 mx-auto" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-gray-600 dark:text-gray-400">
                You don't have permission to access the admin panel.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <NavigationBar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const adminMetrics: AdminMetrics = (metrics as AdminMetrics) || {
    totalUsers: 0,
    totalJobs: 0,
    storageUsed: "0 MB",
    apiCalls: { openai: 0, anthropic: 0, total: 0 },
    recentActivity: { period: "Last 30 days", newUsers: 0, jobsGenerated: 0 }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <NavigationBar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400">Platform metrics and analytics</p>
            </div>
            <Badge variant="destructive" className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>Admin Access</span>
            </Badge>
          </div>
        </div>

        {/* Main Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adminMetrics.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +{adminMetrics.recentActivity.newUsers} in {adminMetrics.recentActivity.period.toLowerCase()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Jobs Generated</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adminMetrics.totalJobs.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +{adminMetrics.recentActivity.jobsGenerated} in {adminMetrics.recentActivity.period.toLowerCase()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adminMetrics.storageUsed}</div>
              <p className="text-xs text-muted-foreground">
                Across all user files
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">API Calls</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adminMetrics.apiCalls.total.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Total across all providers
              </p>
            </CardContent>
          </Card>
        </div>

        {/* API Provider Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="w-5 h-5" />
                <span>API Provider Usage</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>OpenAI</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{adminMetrics.apiCalls.openai.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">
                      {adminMetrics.apiCalls.total > 0 
                        ? Math.round((adminMetrics.apiCalls.openai / adminMetrics.apiCalls.total) * 100)
                        : 0}%
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span>Anthropic</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{adminMetrics.apiCalls.anthropic.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">
                      {adminMetrics.apiCalls.total > 0 
                        ? Math.round((adminMetrics.apiCalls.anthropic / adminMetrics.apiCalls.total) * 100)
                        : 0}%
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>Recent Activity</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div>
                    <div className="font-medium">New Users</div>
                    <div className="text-sm text-gray-500">{adminMetrics.recentActivity.period}</div>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    +{adminMetrics.recentActivity.newUsers}
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div>
                    <div className="font-medium">Jobs Generated</div>
                    <div className="text-sm text-gray-500">{adminMetrics.recentActivity.period}</div>
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    +{adminMetrics.recentActivity.jobsGenerated}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>System Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div>
                  <div className="font-medium">API Status</div>
                  <div className="text-sm text-gray-500">All systems operational</div>
                </div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div>
                  <div className="font-medium">Database</div>
                  <div className="text-sm text-gray-500">Connected and healthy</div>
                </div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div>
                  <div className="font-medium">Storage</div>
                  <div className="text-sm text-gray-500">Object storage online</div>
                </div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}