import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NavigationBar } from "@/components/navigation-bar";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  TrendingUp, 
  Target, 
  Calendar, 
  BookOpen, 
  Trophy,
  Clock,
  Brain,
  Zap
} from "lucide-react";

export default function Analytics() {
  const { user } = useSupabaseAuth();

  // Fetch analytics data
  const { data: studyStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/analytics/study-stats'],
    enabled: !!user,
  });

  const { data: progressData, isLoading: progressLoading } = useQuery({
    queryKey: ['/api/analytics/progress'],
    enabled: !!user,
  });

  const { data: subjectBreakdown, isLoading: subjectLoading } = useQuery({
    queryKey: ['/api/analytics/subjects'],
    enabled: !!user,
  });

  if (statsLoading || progressLoading || subjectLoading) {
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

  const stats = studyStats as any || {};
  const progress = progressData as any || [];
  const subjects = subjectBreakdown as any || [];

  const pieColors = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <div className="container-section py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Study Analytics</h1>
            <p className="text-muted-foreground">Track your learning progress and performance insights</p>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="progress">Progress</TabsTrigger>
              <TabsTrigger value="subjects">Subjects</TabsTrigger>
              <TabsTrigger value="goals">Goals</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Flashcards</CardTitle>
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalFlashcards || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      +{stats.flashcardsThisWeek || 0} this week
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Study Sessions</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalSessions || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.avgSessionTime || 0} min avg
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Accuracy Rate</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.accuracyRate || 0}%</div>
                    <p className="text-xs text-muted-foreground">
                      +{stats.accuracyImprovement || 0}% from last week
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Study Streak</CardTitle>
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.studyStreak || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.longestStreak || 0} days best
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Activity</CardTitle>
                  <CardDescription>Your study activity over the past 7 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={progress}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="cardsStudied" fill="#8B5CF6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="progress" className="space-y-6">
              {/* Learning Progress */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Accuracy Trend</CardTitle>
                    <CardDescription>Your accuracy improvement over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={progress}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="accuracy" stroke="#10B981" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Daily Goals</CardTitle>
                    <CardDescription>Progress towards your daily study targets</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Cards Studied Today</span>
                        <span className="text-sm text-muted-foreground">
                          {stats.cardsToday || 0} / {stats.dailyGoal || 50}
                        </span>
                      </div>
                      <Progress value={Math.min((stats.cardsToday || 0) / (stats.dailyGoal || 50) * 100, 100)} />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Study Time Today</span>
                        <span className="text-sm text-muted-foreground">
                          {stats.timeToday || 0} / {stats.timeGoal || 30} min
                        </span>
                      </div>
                      <Progress value={Math.min((stats.timeToday || 0) / (stats.timeGoal || 30) * 100, 100)} />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Weekly Target</span>
                        <span className="text-sm text-muted-foreground">
                          {stats.cardsThisWeek || 0} / {stats.weeklyGoal || 300}
                        </span>
                      </div>
                      <Progress value={Math.min((stats.cardsThisWeek || 0) / (stats.weeklyGoal || 300) * 100, 100)} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Spaced Repetition Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Memory Retention</CardTitle>
                  <CardDescription>How well you're retaining information over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">{stats.knownCards || 0}</div>
                      <div className="text-sm text-muted-foreground">Known Cards</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-yellow-600">{stats.reviewingCards || 0}</div>
                      <div className="text-sm text-muted-foreground">In Review</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">{stats.newCards || 0}</div>
                      <div className="text-sm text-muted-foreground">New Cards</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="subjects" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Subject Distribution</CardTitle>
                    <CardDescription>Breakdown of your study materials by subject</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={subjects}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {subjects.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Subject Performance</CardTitle>
                    <CardDescription>Your accuracy rate by subject area</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {subjects.map((subject: any, index: number) => (
                        <div key={subject.name} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{subject.name}</span>
                            <span className="text-sm text-muted-foreground">{subject.accuracy || 0}%</span>
                          </div>
                          <Progress value={subject.accuracy || 0} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Subject Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    Study Recommendations
                  </CardTitle>
                  <CardDescription>AI-powered suggestions to improve your learning</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        <span className="font-medium">Focus Area</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Spend more time on {subjects[0]?.name || 'your weakest subject'} - your accuracy could improve by practicing more frequently.
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        <span className="font-medium">Study Schedule</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        You're most accurate during {stats.bestTimeSlot || 'morning'} sessions. Try scheduling more study time then.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="goals" className="space-y-6">
              {/* Goal Setting */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Current Goals</CardTitle>
                    <CardDescription>Track your progress towards study objectives</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Monthly Flashcards</span>
                        <span className="text-sm text-muted-foreground">
                          {stats.monthlyCards || 0} / {stats.monthlyGoal || 1000}
                        </span>
                      </div>
                      <Progress value={Math.min((stats.monthlyCards || 0) / (stats.monthlyGoal || 1000) * 100, 100)} />
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Accuracy Target</span>
                        <span className="text-sm text-muted-foreground">
                          {stats.accuracyRate || 0}% / {stats.accuracyTarget || 85}%
                        </span>
                      </div>
                      <Progress value={Math.min((stats.accuracyRate || 0) / (stats.accuracyTarget || 85) * 100, 100)} />
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Study Streak</span>
                        <span className="text-sm text-muted-foreground">
                          {stats.studyStreak || 0} / {stats.streakTarget || 30} days
                        </span>
                      </div>
                      <Progress value={Math.min((stats.studyStreak || 0) / (stats.streakTarget || 30) * 100, 100)} />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Achievements</CardTitle>
                    <CardDescription>Milestones you've unlocked</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 border rounded-lg">
                        <Trophy className="w-6 h-6 text-yellow-500" />
                        <div>
                          <div className="font-medium">First Week</div>
                          <div className="text-sm text-muted-foreground">Completed 7 days of studying</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 border rounded-lg">
                        <BookOpen className="w-6 h-6 text-blue-500" />
                        <div>
                          <div className="font-medium">100 Cards</div>
                          <div className="text-sm text-muted-foreground">Studied 100 flashcards</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 border rounded-lg">
                        <Target className="w-6 h-6 text-green-500" />
                        <div>
                          <div className="font-medium">High Accuracy</div>
                          <div className="text-sm text-muted-foreground">Achieved 80% accuracy</div>
                        </div>
                      </div>
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