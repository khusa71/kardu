import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { NavigationBar } from "@/components/navigation-bar";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
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
  const { user } = useSupabaseAuth();
  
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
      
      <main className="max-w-screen-xl mx-auto px-4 pt-4 pb-16">
        {/* Welcome Section */}
        <div className="mb-6 space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Welcome back, {user?.displayName || user?.email?.split('@')[0] || 'there'}!
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Ready to create more flashcards and continue your learning journey?
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link href="/upload">
            <Card className="cursor-pointer hover:shadow-md transition-all duration-200 hover:bg-muted/50 rounded-2xl shadow-sm">
              <CardContent className="flex items-center p-4 md:p-6">
                <div className="bg-primary/10 p-3 rounded-xl mr-4 flex-shrink-0">
                  <Upload className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-foreground">Upload New PDF</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">Create flashcards from documents</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/history">
            <Card className="cursor-pointer hover:shadow-md transition-all duration-200 hover:bg-muted/50 rounded-2xl shadow-sm">
              <CardContent className="flex items-center p-4 md:p-6">
                <div className="bg-blue-500/10 p-3 rounded-xl mr-4 flex-shrink-0">
                  <FileText className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-foreground">View History</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">Access your flashcard sets</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/study">
            <Card className="cursor-pointer hover:shadow-md transition-all duration-200 hover:bg-muted/50 rounded-2xl shadow-sm">
              <CardContent className="flex items-center p-4 md:p-6">
                <div className="bg-green-500/10 p-3 rounded-xl mr-4 flex-shrink-0">
                  <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-green-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-foreground">Study Mode</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">Practice with your flashcards</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Left Column - Stats and Usage */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* Account Status */}
            <Card className="rounded-2xl shadow-md">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Award className="w-5 h-5" />
                  Account Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <Badge variant={user?.isPremium ? "default" : "secondary"} className="text-xs">
                      {user?.isPremium ? "Premium" : "Free Plan"}
                    </Badge>
                    {user?.isPremium && (
                      <p className="text-sm text-muted-foreground">
                        Unlimited uploads and advanced features
                      </p>
                    )}
                  </div>
                  {!user?.isPremium && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="min-w-[120px] h-10 rounded-xl hover:bg-primary/80 transition"
                    >
                      Upgrade to Premium
                    </Button>
                  )}
                </div>

                {!user?.isPremium && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Monthly uploads</span>
                      <span className="font-medium">{monthlyUsage} / {monthlyLimit}</span>
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
            <Card className="rounded-2xl shadow-md">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="w-5 h-5" />
                  Learning Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center space-y-1">
                    <div className="text-xl md:text-2xl font-bold text-primary">{totalFlashcards}</div>
                    <div className="text-xs md:text-sm text-muted-foreground">Total Flashcards</div>
                  </div>
                  <div className="text-center space-y-1">
                    <div className="text-xl md:text-2xl font-bold text-blue-500">{totalUploads}</div>
                    <div className="text-xs md:text-sm text-muted-foreground">Documents Processed</div>
                  </div>
                  <div className="text-center space-y-1">
                    <div className="text-xl md:text-2xl font-bold text-green-500">{recentUploads}</div>
                    <div className="text-xs md:text-sm text-muted-foreground">Recent Uploads</div>
                  </div>
                  <div className="text-center space-y-1">
                    <div className="text-xl md:text-2xl font-bold text-orange-500">
                      {history.length > 0 ? Math.round(totalFlashcards / totalUploads) : 0}
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground">Avg per Document</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="rounded-2xl shadow-md">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription className="text-sm">
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
                  <div className="space-y-2">
                    {recentActivity.map((item) => (
                      <Link key={item.id} href={`/study/${item.id}`}>
                        <div className="flex items-center justify-between p-3 rounded-xl border hover:bg-muted/50 cursor-pointer transition-all duration-200">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="bg-primary/10 p-2 rounded-lg flex-shrink-0">
                              <FileText className="w-4 h-4 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{item.filename}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.flashcardCount} cards • {item.subject} • {item.difficulty}
                              </p>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 md:py-8">
                    <Brain className="w-8 h-8 md:w-12 md:h-12 text-muted-foreground mx-auto mb-3 md:mb-4" />
                    <p className="text-muted-foreground text-sm mb-3 md:mb-4">No flashcards yet</p>
                    <Link href="/upload">
                      <Button className="min-w-[120px] h-10 rounded-xl">Upload Your First PDF</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Quick Tips & Actions */}
          <div className="space-y-4 md:space-y-6">
            {/* Study Reminder */}
            <Card className="rounded-2xl shadow-md">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="w-5 h-5" />
                  Study Reminder
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Keep your learning streak going! Regular practice helps improve retention.
                </p>
                {recentActivity.length > 0 && (
                  <Link href={`/study/${recentActivity[0].id}`}>
                    <Button className="w-full min-h-[40px] rounded-xl hover:bg-primary/90 transition">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Continue Last Study
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>

            {/* Quick Tips */}
            <Card className="rounded-2xl shadow-md">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Quick Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-muted-foreground">Upload clear, text-based PDFs for best results</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-muted-foreground">Specify your subject for more relevant flashcards</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-muted-foreground">Use study mode regularly to improve retention</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-muted-foreground">Review and edit generated flashcards if needed</p>
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