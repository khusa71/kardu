import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { NavigationBar } from "@/components/navigation-bar";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Upload, 
  FileText, 
  Clock, 
  TrendingUp, 
  BookOpen, 
  Brain,
  Calendar,
  Target,
  Award,
  BarChart3
} from "lucide-react";

interface HistoryItem {
  id: number;
  filename: string;
  fileSize: number;
  flashcardCount: number;
  createdAt: string;
  status: string;
  subject: string;
  difficulty: string;
}

export default function Dashboard() {
  const { user } = useFirebaseAuth();
  
  // Fetch user's flashcard history
  const { data: history = [], isLoading: historyLoading } = useQuery<HistoryItem[]>({
    queryKey: ["/api/history"],
    enabled: !!user,
  });

  // Calculate user stats
  const totalFlashcards = history.reduce((sum, item) => sum + (item.flashcardCount || 0), 0);
  const totalUploads = history.length;
  const recentUploads = history.filter(item => {
    const uploadDate = new Date(item.createdAt);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return uploadDate >= thirtyDaysAgo;
  }).length;

  // Calculate usage percentage
  const monthlyUsage = user?.monthlyUploads || 0;
  const monthlyLimit = user?.monthlyLimit || 3;
  const usagePercentage = Math.min((monthlyUsage / monthlyLimit) * 100, 100);

  // Get recent activity (last 5 items)
  const recentActivity = history.slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {user?.displayName || user?.email?.split('@')[0] || 'there'}!
          </h1>
          <p className="text-muted-foreground">
            Ready to create more flashcards and continue your learning journey?
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link href="/upload">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardContent className="flex items-center p-6">
                <div className="bg-primary/10 p-3 rounded-lg mr-4">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Upload New PDF</h3>
                  <p className="text-sm text-muted-foreground">Create flashcards from documents</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/history">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardContent className="flex items-center p-6">
                <div className="bg-blue-500/10 p-3 rounded-lg mr-4">
                  <FileText className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">View History</h3>
                  <p className="text-sm text-muted-foreground">Access your flashcard sets</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/study">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardContent className="flex items-center p-6">
                <div className="bg-green-500/10 p-3 rounded-lg mr-4">
                  <BookOpen className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Study Mode</h3>
                  <p className="text-sm text-muted-foreground">Practice with your flashcards</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Stats and Usage */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Account Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <Badge variant={user?.isPremium ? "default" : "secondary"}>
                      {user?.isPremium ? "Premium" : "Free Plan"}
                    </Badge>
                    {user?.isPremium && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Unlimited uploads and advanced features
                      </p>
                    )}
                  </div>
                  {!user?.isPremium && (
                    <Button variant="outline" size="sm">
                      Upgrade to Premium
                    </Button>
                  )}
                </div>

                {!user?.isPremium && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Monthly uploads</span>
                      <span>{monthlyUsage} / {monthlyLimit}</span>
                    </div>
                    <Progress value={usagePercentage} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {monthlyLimit - monthlyUsage} uploads remaining this month
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Learning Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Learning Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{totalFlashcards}</div>
                    <div className="text-sm text-muted-foreground">Total Flashcards</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-500">{totalUploads}</div>
                    <div className="text-sm text-muted-foreground">Documents Processed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">{recentUploads}</div>
                    <div className="text-sm text-muted-foreground">Recent Uploads</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-500">
                      {history.length > 0 ? Math.round(totalFlashcards / totalUploads) : 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Avg per Document</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  Your latest flashcard sets
                </CardDescription>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivity.map((item) => (
                      <Link key={item.id} href={`/study/${item.id}`}>
                        <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="bg-primary/10 p-2 rounded">
                              <FileText className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{item.filename}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.flashcardCount} cards • {item.subject} • {item.difficulty}
                              </p>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No flashcards yet</p>
                    <Link href="/upload">
                      <Button>Upload Your First PDF</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Quick Tips & Actions */}
          <div className="space-y-6">
            {/* Study Reminder */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Study Reminder
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Keep your learning streak going! Regular practice helps improve retention.
                  </p>
                  {recentActivity.length > 0 && (
                    <Link href={`/study/${recentActivity[0].id}`}>
                      <Button className="w-full">
                        <BookOpen className="w-4 h-4 mr-2" />
                        Continue Last Study
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Tips */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full mt-1.5 flex-shrink-0"></div>
                    <p>Upload clear, text-based PDFs for best results</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full mt-1.5 flex-shrink-0"></div>
                    <p>Specify your subject for more relevant flashcards</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full mt-1.5 flex-shrink-0"></div>
                    <p>Use study mode regularly to improve retention</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full mt-1.5 flex-shrink-0"></div>
                    <p>Review and edit generated flashcards if needed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}