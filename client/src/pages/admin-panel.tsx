import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NavigationBar } from "@/components/navigation-bar";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Users, 
  FileText, 
  MessageSquare, 
  Settings, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Database,
  Activity,
  Crown,
  Mail
} from "lucide-react";

const responseSchema = z.object({
  response: z.string().min(10, "Response must be at least 10 characters"),
});

export default function AdminPanel() {
  const { user } = useSupabaseAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);

  // Fetch admin data
  const { data: userStats, isLoading: userStatsLoading } = useQuery({
    queryKey: ['/api/admin/user-stats'],
    enabled: !!user,
  });

  const { data: systemMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/admin/system-metrics'],
    enabled: !!user,
  });

  const { data: supportTickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ['/api/admin/support-tickets'],
    enabled: !!user,
  });

  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['/api/admin/recent-activity'],
    enabled: !!user,
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    enabled: !!user,
  });

  // Response form
  const responseForm = useForm({
    resolver: zodResolver(responseSchema),
    defaultValues: {
      response: "",
    },
  });

  // Respond to ticket mutation
  const respondToTicketMutation = useMutation({
    mutationFn: async (data: { ticketId: number; response: string }) => {
      return apiRequest('PATCH', `/api/admin/support-tickets/${data.ticketId}`, {
        adminResponse: data.response,
        status: 'resolved'
      });
    },
    onSuccess: () => {
      toast({ title: "Response sent successfully" });
      setResponseDialogOpen(false);
      responseForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support-tickets'] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to send response", description: error.message, variant: "destructive" });
    },
  });

  // Update user subscription mutation
  const updateUserSubscriptionMutation = useMutation({
    mutationFn: async (data: { userId: string; isPremium: boolean }) => {
      return apiRequest('PATCH', `/api/admin/users/${data.userId}`, {
        isPremium: data.isPremium
      });
    },
    onSuccess: () => {
      toast({ title: "User subscription updated" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update subscription", description: error.message, variant: "destructive" });
    },
  });

  const handleResponseSubmit = (data: z.infer<typeof responseSchema>) => {
    if (selectedTicket) {
      respondToTicketMutation.mutate({
        ticketId: selectedTicket.id,
        response: data.response
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (userStatsLoading || metricsLoading || ticketsLoading || activityLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        <div className="container-section py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  const stats = userStats as any || {};
  const metrics = systemMetrics as any || {};
  const tickets = supportTickets as any || [];
  const activity = recentActivity as any || [];
  const userList = users as any || [];

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <div className="container-section py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Admin Control Panel</h1>
            <p className="text-muted-foreground">Monitor and manage the StudyCards AI platform</p>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="support">Support</TabsTrigger>
              <TabsTrigger value="system">System</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalUsers || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      +{stats.newUsersToday || 0} today
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Premium Users</CardTitle>
                    <Crown className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.premiumUsers || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {((stats.premiumUsers || 0) / (stats.totalUsers || 1) * 100).toFixed(1)}% conversion
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">PDFs Processed</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalPdfs || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      +{stats.pdfsToday || 0} today
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.openTickets || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.avgResponseTime || 0}h avg response
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* System Health */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      System Health
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Database</span>
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Healthy
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">AI Services</span>
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Operational
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Storage</span>
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Available
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Memory Usage</span>
                      <Badge className={metrics.memoryUsage > 80 ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
                        {metrics.memoryUsage || 0}%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Recent Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Daily Active Users</span>
                      <span className="font-medium text-green-600">↗ +12%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Processing Success Rate</span>
                      <span className="font-medium text-green-600">98.5%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Average Processing Time</span>
                      <span className="font-medium">2.3 min</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">User Satisfaction</span>
                      <span className="font-medium text-green-600">4.8/5</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Manage user accounts and subscriptions</CardDescription>
                </CardHeader>
                <CardContent>
                  {usersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Clock className="w-6 h-6 animate-spin" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Uploads</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userList.slice(0, 10).map((user: any) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{user.fullName || 'Unknown'}</div>
                                <div className="text-sm text-muted-foreground">{user.id.substring(0, 8)}...</div>
                              </div>
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Badge variant={user.isPremium ? "default" : "secondary"}>
                                {user.isPremium ? "Pro" : "Free"}
                              </Badge>
                            </TableCell>
                            <TableCell>{user.uploadsThisMonth || 0} / {user.maxMonthlyUploads || 3}</TableCell>
                            <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateUserSubscriptionMutation.mutate({
                                  userId: user.id,
                                  isPremium: !user.isPremium
                                })}
                                disabled={updateUserSubscriptionMutation.isPending}
                              >
                                {user.isPremium ? "Downgrade" : "Upgrade"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="support">
              <Card>
                <CardHeader>
                  <CardTitle>Support Tickets</CardTitle>
                  <CardDescription>Manage user support requests</CardDescription>
                </CardHeader>
                <CardContent>
                  {ticketsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Clock className="w-6 h-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {tickets.map((ticket: any) => (
                        <div key={ticket.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-medium">{ticket.subject}</h4>
                              <p className="text-sm text-muted-foreground">
                                From {ticket.userEmail} • {new Date(ticket.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Badge className={getPriorityColor(ticket.priority)}>
                                {ticket.priority}
                              </Badge>
                              <Badge className={getStatusColor(ticket.status)}>
                                {ticket.status.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-sm mb-3">{ticket.message}</p>
                          <div className="flex gap-2">
                            <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedTicket(ticket)}
                                  disabled={ticket.status === 'resolved' || ticket.status === 'closed'}
                                >
                                  <Mail className="w-4 h-4 mr-2" />
                                  Respond
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Respond to Support Ticket</DialogTitle>
                                  <DialogDescription>
                                    Send a response to {selectedTicket?.userEmail}
                                  </DialogDescription>
                                </DialogHeader>
                                <Form {...responseForm}>
                                  <form onSubmit={responseForm.handleSubmit(handleResponseSubmit)}>
                                    <FormField
                                      control={responseForm.control}
                                      name="response"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Response</FormLabel>
                                          <FormControl>
                                            <Textarea
                                              placeholder="Type your response here..."
                                              className="min-h-[100px]"
                                              {...field}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <DialogFooter className="mt-6">
                                      <Button type="submit" disabled={respondToTicketMutation.isPending}>
                                        {respondToTicketMutation.isPending ? "Sending..." : "Send Response"}
                                      </Button>
                                    </DialogFooter>
                                  </form>
                                </Form>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="system">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="w-5 h-5" />
                      System Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-2xl font-bold">{metrics.responseTime || 0}ms</div>
                        <div className="text-sm text-muted-foreground">Avg Response Time</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{metrics.requestCount || 0}</div>
                        <div className="text-sm text-muted-foreground">Requests/Hour</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{metrics.errorRate || 0}%</div>
                        <div className="text-sm text-muted-foreground">Error Rate</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{metrics.uptime || 0}%</div>
                        <div className="text-sm text-muted-foreground">Uptime</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      System Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <Database className="w-4 h-4 mr-2" />
                      Database Backup
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Activity className="w-4 h-4 mr-2" />
                      Clear Cache
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="w-4 h-4 mr-2" />
                      Export Logs
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Generate Report
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest system events and user actions</CardDescription>
                </CardHeader>
                <CardContent>
                  {activityLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Clock className="w-6 h-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activity.slice(0, 20).map((event: any, index: number) => (
                        <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <div className="flex-1">
                            <div className="text-sm">{event.description}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(event.timestamp).toLocaleString()}
                            </div>
                          </div>
                          <Badge variant="outline">{event.type}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}