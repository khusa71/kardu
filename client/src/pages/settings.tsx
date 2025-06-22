import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { NavigationBar } from "@/components/navigation-bar";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User, Settings as SettingsIcon, Bell, Palette, Globe, Shield, AlertTriangle } from "lucide-react";

const profileFormSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
});

const preferencesFormSchema = z.object({
  studySessionLength: z.number().min(5).max(100),
  dailyStudyGoal: z.number().min(10).max(500),
  difficultyProgression: z.enum(["adaptive", "manual"]),
  spaceRepetitionInterval: z.enum(["sm2", "custom"]),
  theme: z.enum(["light", "dark", "system"]),
  language: z.enum(["en", "es", "fr", "de", "zh"]),
  timezone: z.string(),
});

const notificationFormSchema = z.object({
  notificationsEnabled: z.boolean(),
  emailNotifications: z.boolean(),
  studyReminders: z.boolean(),
  weeklyReports: z.boolean(),
});

export default function Settings() {
  const { user, signOut } = useSupabaseAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");

  // Fetch user data and preferences
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['/api/auth/user'],
    enabled: !!user,
  });

  const { data: preferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ['/api/user/preferences'],
    enabled: !!user,
  });

  // Profile form
  const profileForm = useForm({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: (userData as any)?.fullName || "",
      email: (userData as any)?.email || "",
    },
  });

  // Preferences form
  const preferencesForm = useForm({
    resolver: zodResolver(preferencesFormSchema),
    defaultValues: {
      studySessionLength: (preferences as any)?.studySessionLength || 20,
      dailyStudyGoal: (preferences as any)?.dailyStudyGoal || 50,
      difficultyProgression: (preferences as any)?.difficultyProgression || "adaptive",
      spaceRepetitionInterval: (preferences as any)?.spaceRepetitionInterval || "sm2",
      theme: (preferences as any)?.theme || "system",
      language: (preferences as any)?.language || "en",
      timezone: (preferences as any)?.timezone || "UTC",
    },
  });

  // Notifications form
  const notificationForm = useForm({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      notificationsEnabled: (preferences as any)?.notificationsEnabled ?? true,
      emailNotifications: (preferences as any)?.emailNotifications ?? true,
      studyReminders: (preferences as any)?.studyReminders ?? true,
      weeklyReports: (preferences as any)?.weeklyReports ?? true,
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof profileFormSchema>) => {
      return apiRequest('PATCH', '/api/user/profile', data);
    },
    onSuccess: () => {
      toast({ title: "Profile updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update profile", description: error.message, variant: "destructive" });
    },
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: z.infer<typeof preferencesFormSchema>) => {
      return apiRequest('PATCH', '/api/user/preferences', data);
    },
    onSuccess: () => {
      toast({ title: "Preferences updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update preferences", description: error.message, variant: "destructive" });
    },
  });

  // Update notifications mutation
  const updateNotificationsMutation = useMutation({
    mutationFn: async (data: z.infer<typeof notificationFormSchema>) => {
      return apiRequest('PATCH', '/api/user/preferences', data);
    },
    onSuccess: () => {
      toast({ title: "Notification settings updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update notifications", description: error.message, variant: "destructive" });
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', '/api/user/delete');
    },
    onSuccess: () => {
      toast({ title: "Account deleted successfully" });
      signOut();
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete account", description: error.message, variant: "destructive" });
    },
  });

  const handleDeleteAccount = () => {
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      deleteAccountMutation.mutate();
    }
  };

  if (userLoading || preferencesLoading) {
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

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <div className="container-section py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
            <p className="text-muted-foreground">Manage your account settings and preferences</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="preferences" className="flex items-center gap-2">
                <SettingsIcon className="w-4 h-4" />
                Study
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Security
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your personal information and account details</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-6">
                      <FormField
                        control={profileForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Enter your email" {...field} disabled />
                            </FormControl>
                            <FormDescription>
                              Email changes require verification. Contact support to change your email.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button type="submit" disabled={updateProfileMutation.isPending}>
                        {updateProfileMutation.isPending ? "Updating..." : "Update Profile"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preferences">
              <Card>
                <CardHeader>
                  <CardTitle>Study Preferences</CardTitle>
                  <CardDescription>Customize your learning experience and study settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...preferencesForm}>
                    <form onSubmit={preferencesForm.handleSubmit((data) => updatePreferencesMutation.mutate(data))} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={preferencesForm.control}
                          name="studySessionLength"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Study Session Length</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                              </FormControl>
                              <FormDescription>Number of cards per study session</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={preferencesForm.control}
                          name="dailyStudyGoal"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Daily Study Goal</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                              </FormControl>
                              <FormDescription>Target cards to study per day</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={preferencesForm.control}
                          name="difficultyProgression"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Difficulty Progression</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select progression type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="adaptive">Adaptive (Recommended)</SelectItem>
                                  <SelectItem value="manual">Manual Control</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>How difficulty adjusts based on performance</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={preferencesForm.control}
                          name="theme"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Theme</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select theme" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="light">Light</SelectItem>
                                  <SelectItem value="dark">Dark</SelectItem>
                                  <SelectItem value="system">System</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <Button type="submit" disabled={updatePreferencesMutation.isPending}>
                        {updatePreferencesMutation.isPending ? "Updating..." : "Update Preferences"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Settings</CardTitle>
                  <CardDescription>Control how and when you receive notifications</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...notificationForm}>
                    <form onSubmit={notificationForm.handleSubmit((data) => updateNotificationsMutation.mutate(data))} className="space-y-6">
                      <div className="space-y-4">
                        <FormField
                          control={notificationForm.control}
                          name="notificationsEnabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Enable Notifications</FormLabel>
                                <FormDescription>
                                  Receive notifications about your study progress and reminders
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={notificationForm.control}
                          name="emailNotifications"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Email Notifications</FormLabel>
                                <FormDescription>
                                  Receive study reminders and updates via email
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={notificationForm.control}
                          name="studyReminders"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Study Reminders</FormLabel>
                                <FormDescription>
                                  Daily reminders to maintain your study streak
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={notificationForm.control}
                          name="weeklyReports"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Weekly Reports</FormLabel>
                                <FormDescription>
                                  Weekly summary of your study progress and achievements
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <Button type="submit" disabled={updateNotificationsMutation.isPending}>
                        {updateNotificationsMutation.isPending ? "Updating..." : "Update Notifications"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Account Security</CardTitle>
                    <CardDescription>Manage your account security and privacy settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Password</h4>
                        <p className="text-sm text-muted-foreground">Last changed 30 days ago</p>
                      </div>
                      <Button variant="outline" onClick={() => signOut()}>
                        Sign Out & Reset
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Data Export</h4>
                        <p className="text-sm text-muted-foreground">Download all your data</p>
                      </div>
                      <Button variant="outline">
                        Export Data
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-destructive">
                  <CardHeader>
                    <CardTitle className="text-destructive flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Danger Zone
                    </CardTitle>
                    <CardDescription>
                      Irreversible actions that will permanently affect your account
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between p-4 border border-destructive rounded-lg">
                      <div>
                        <h4 className="font-medium text-destructive">Delete Account</h4>
                        <p className="text-sm text-muted-foreground">
                          Permanently delete your account and all associated data
                        </p>
                      </div>
                      <Button 
                        variant="destructive" 
                        onClick={handleDeleteAccount}
                        disabled={deleteAccountMutation.isPending}
                      >
                        {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}