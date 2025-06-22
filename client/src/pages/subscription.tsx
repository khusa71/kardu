import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { NavigationBar } from "@/components/navigation-bar";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard, 
  Calendar, 
  TrendingUp, 
  FileText, 
  Check, 
  X, 
  Crown,
  AlertCircle,
  Download,
  RefreshCw
} from "lucide-react";

interface PlanFeature {
  name: string;
  free: boolean | string;
  pro: boolean | string;
}

const planFeatures: PlanFeature[] = [
  { name: "PDF Uploads per Month", free: "3", pro: "100" },
  { name: "AI Processing Models", free: "Basic", pro: "Premium (GPT-4o)" },
  { name: "Page Processing Limit", free: "10 pages", pro: "Unlimited" },
  { name: "Export Formats", free: true, pro: true },
  { name: "Study Analytics", free: "Basic", pro: "Advanced" },
  { name: "Priority Support", free: false, pro: true },
  { name: "Early Access Features", free: false, pro: true },
];

export default function Subscription() {
  const { user } = useSupabaseAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Fetch user data and subscription info
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['/api/auth/user'],
    enabled: !!user,
  });

  const { data: subscriptionHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['/api/subscription/history'],
    enabled: !!user,
  });

  const { data: usageStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/subscription/usage'],
    enabled: !!user,
  });

  // Create checkout session mutation
  const createCheckoutMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/create-checkout-session', { 
        priceId: 'price_pro_monthly',
        successUrl: `${window.location.origin}/subscription?success=true`,
        cancelUrl: `${window.location.origin}/subscription?canceled=true`
      });
    },
    onSuccess: (data: any) => {
      window.location.href = data.url;
    },
    onError: (error: any) => {
      toast({ title: "Failed to create checkout session", description: error.message, variant: "destructive" });
      setIsUpgrading(false);
    },
  });

  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/subscription/cancel');
    },
    onSuccess: () => {
      toast({ title: "Subscription canceled successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/history'] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to cancel subscription", description: error.message, variant: "destructive" });
    },
  });

  // Reactivate subscription mutation
  const reactivateSubscriptionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/subscription/reactivate');
    },
    onSuccess: () => {
      toast({ title: "Subscription reactivated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to reactivate subscription", description: error.message, variant: "destructive" });
    },
  });

  const handleUpgrade = () => {
    setIsUpgrading(true);
    createCheckoutMutation.mutate();
  };

  const handleCancel = () => {
    if (window.confirm("Are you sure you want to cancel your subscription? You'll lose access to Pro features at the end of your billing period.")) {
      cancelSubscriptionMutation.mutate();
    }
  };

  const isPremium = (userData as any)?.isPremium;
  const currentUploads = (usageStats as any)?.currentUploads || 0;
  const maxUploads = isPremium ? 100 : 3;
  const usagePercentage = (currentUploads / maxUploads) * 100;

  if (userLoading || historyLoading || statsLoading) {
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
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Subscription Management</h1>
            <p className="text-muted-foreground">Manage your plan, usage, and billing information</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Current Plan Card */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {isPremium ? (
                          <>
                            <Crown className="w-5 h-5 text-yellow-500" />
                            Pro Plan
                          </>
                        ) : (
                          "Free Plan"
                        )}
                      </CardTitle>
                      <CardDescription>
                        {isPremium ? "Premium features unlocked" : "Basic access to flashcard generation"}
                      </CardDescription>
                    </div>
                    <Badge variant={isPremium ? "default" : "secondary"}>
                      {isPremium ? "Active" : "Free"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Usage Stats */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Monthly Uploads</span>
                        <span className="text-sm text-muted-foreground">
                          {currentUploads} / {maxUploads}
                        </span>
                      </div>
                      <Progress value={Math.min(usagePercentage, 100)} className="h-2" />
                      {usagePercentage >= 80 && (
                        <p className="text-sm text-orange-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {usagePercentage >= 100 ? "Upload limit reached" : "Approaching upload limit"}
                        </p>
                      )}
                    </div>

                    {/* Plan Actions */}
                    <div className="flex gap-3 pt-4">
                      {!isPremium ? (
                        <Button 
                          onClick={handleUpgrade}
                          disabled={isUpgrading || createCheckoutMutation.isPending}
                          className="flex items-center gap-2"
                        >
                          {(isUpgrading || createCheckoutMutation.isPending) ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Crown className="w-4 h-4" />
                          )}
                          Upgrade to Pro
                        </Button>
                      ) : (
                        <div className="flex gap-3">
                          <Button variant="outline" onClick={() => window.open("https://billing.stripe.com/", "_blank")}>
                            <CreditCard className="w-4 h-4 mr-2" />
                            Manage Billing
                          </Button>
                          <Button 
                            variant="destructive" 
                            onClick={handleCancel}
                            disabled={cancelSubscriptionMutation.isPending}
                          >
                            {cancelSubscriptionMutation.isPending ? "Canceling..." : "Cancel Plan"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Plan Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle>Plan Comparison</CardTitle>
                  <CardDescription>See what's included in each plan</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 font-medium text-sm border-b pb-3">
                      <div>Feature</div>
                      <div className="text-center">Free</div>
                      <div className="text-center">Pro</div>
                    </div>
                    {planFeatures.map((feature, index) => (
                      <div key={index} className="grid grid-cols-3 gap-4 items-center text-sm py-2">
                        <div className="font-medium">{feature.name}</div>
                        <div className="text-center">
                          {typeof feature.free === 'boolean' ? (
                            feature.free ? (
                              <Check className="w-4 h-4 text-green-600 mx-auto" />
                            ) : (
                              <X className="w-4 h-4 text-red-600 mx-auto" />
                            )
                          ) : (
                            feature.free
                          )}
                        </div>
                        <div className="text-center">
                          {typeof feature.pro === 'boolean' ? (
                            feature.pro ? (
                              <Check className="w-4 h-4 text-green-600 mx-auto" />
                            ) : (
                              <X className="w-4 h-4 text-red-600 mx-auto" />
                            )
                          ) : (
                            feature.pro
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Pricing Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    Pro Plan
                  </CardTitle>
                  <CardDescription>Unlock unlimited potential</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="text-3xl font-bold">$9.99</div>
                      <div className="text-sm text-muted-foreground">per month</div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600" />
                        100 PDF uploads/month
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600" />
                        Advanced AI models
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600" />
                        Unlimited page processing
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600" />
                        Priority support
                      </div>
                    </div>
                    {!isPremium && (
                      <Button 
                        className="w-full" 
                        onClick={handleUpgrade}
                        disabled={isUpgrading || createCheckoutMutation.isPending}
                      >
                        {(isUpgrading || createCheckoutMutation.isPending) ? "Processing..." : "Upgrade Now"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Usage Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    This Month
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">PDFs Processed</span>
                      <span className="font-medium">{usageStats?.totalUploads || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Pages Processed</span>
                      <span className="font-medium">{usageStats?.totalPages || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Flashcards Created</span>
                      <span className="font-medium">{usageStats?.totalFlashcards || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Study Sessions</span>
                      <span className="font-medium">{usageStats?.studySessions || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Account Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start" onClick={() => window.open("mailto:support@kardu.io")}>
                      Contact Support
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="w-4 h-4 mr-2" />
                      Download Invoice
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      View Usage History
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Billing History */}
          {subscriptionHistory && subscriptionHistory.length > 0 && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Billing History
                </CardTitle>
                <CardDescription>Your recent subscription and payment history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {subscriptionHistory.map((item: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{item.planType} Plan</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(item.startDate).toLocaleDateString()} - {item.endDate ? new Date(item.endDate).toLocaleDateString() : "Active"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${item.amount}</div>
                        <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                          {item.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}