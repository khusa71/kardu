import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { NavigationBar } from "@/components/navigation-bar";
import { AuthModal } from "@/components/auth-modal";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { BookOpen, Upload, FileText, Zap, Star, Users, CheckCircle, ArrowRight, Brain, Target, Clock, TrendingUp, History } from "lucide-react";

export default function Home() {
  const { user, loading } = useFirebaseAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Fetch user data and recent history for dashboard
  const { data: userData } = useQuery({
    queryKey: ['/api/auth/user'],
    enabled: !!user,
  });

  const { data: recentHistory } = useQuery({
    queryKey: ['/api/history'],
    enabled: !!user,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      
      {/* Hero Section */}
      <main className="bg-background">
        <section className="container-content py-16 md:py-24 lg:py-32 text-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-hero text-foreground">
                Create flashcards
                <span className="block text-primary">in seconds</span>
              </h1>
              <p className="text-body-lg text-muted-foreground max-w-2xl mx-auto">
                Upload any PDF and transform it into interactive flashcards with AI. Study smarter, learn faster.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              {user ? (
                <Link href="/upload">
                  <Button 
                    size="lg"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 text-lg font-semibold rounded-xl min-w-[240px]"
                  >
                    Start Creating Flashcards
                  </Button>
                </Link>
              ) : (
                <Button 
                  onClick={() => setShowAuthModal(true)}
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 text-lg font-semibold rounded-xl min-w-[200px]"
                >
                  Get Started Free
                </Button>
              )}
            </div>

            <div className="pt-4">
              <p className="text-sm text-muted-foreground">
                No credit card required • Free forever
              </p>
            </div>
          </div>
        </section>

        {/* User Dashboard Section - Only for logged-in users */}
        {user && (
          <section className="py-16 md:py-24 bg-muted/30">
            <div className="container-content">
              <div className="text-center mb-12">
                <h2 className="text-section text-foreground mb-4">
                  Welcome back, {user.email?.split('@')[0]}!
                </h2>
                <p className="text-body-lg text-muted-foreground">
                  Here's your study progress and recent activity
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {/* Upload Usage */}
                <Card className="p-6">
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="flex items-center text-lg">
                      <Upload className="w-5 h-5 mr-2 text-primary" />
                      Monthly Usage
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">PDFs Uploaded</span>
                        <span className="font-medium text-foreground">
                          {(userData as any)?.uploadsThisMonth || 0} / {(userData as any)?.isPremium ? 100 : 3}
                        </span>
                      </div>
                      <Progress 
                        value={((userData as any)?.uploadsThisMonth || 0) / ((userData as any)?.isPremium ? 100 : 3) * 100} 
                        className="h-2" 
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Plan Status */}
                <Card className="p-6">
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="flex items-center text-lg">
                      <Star className="w-5 h-5 mr-2 text-primary" />
                      Current Plan
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between">
                      <Badge 
                        variant={(userData as any)?.isPremium ? "default" : "secondary"}
                        className="text-sm px-3 py-1"
                      >
                        {(userData as any)?.isPremium ? "Premium" : "Free"}
                      </Badge>
                      {!(userData as any)?.isPremium && (
                        <Link href="#pricing">
                          <Button variant="outline" size="sm">
                            Upgrade
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="p-6">
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="flex items-center text-lg">
                      <TrendingUp className="w-5 h-5 mr-2 text-primary" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="space-y-2">
                      {recentHistory && (recentHistory as any[]).length > 0 ? (
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Last upload: {new Date((recentHistory as any[])[0]?.createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-sm font-medium text-foreground">
                            {(recentHistory as any[]).length} flashcard sets created
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No uploads yet. Get started below!
                        </p>
                      )}
                      <Link href="/history">
                        <Button variant="ghost" size="sm" className="w-full mt-2">
                          View All
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/upload">
                  <Button 
                    size="lg"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 text-lg font-semibold rounded-xl min-w-[200px]"
                  >
                    <Upload className="w-5 h-5 mr-2" />
                    Upload New PDF
                  </Button>
                </Link>
                <Link href="/history">
                  <Button 
                    variant="outline"
                    size="lg"
                    className="px-8 py-3 text-lg font-medium rounded-xl min-w-[180px] border-border hover:bg-muted"
                  >
                    <History className="w-5 h-5 mr-2" />
                    View History
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Features Section */}
        <section className={`py-16 md:py-24 ${user ? 'bg-background' : 'bg-muted/30'}`}>
          <div className="container-section">
            <div className="text-center mb-16">
              <h2 className="text-section text-foreground mb-4">
                Powerful features for effective learning
              </h2>
              <p className="text-body-lg text-muted-foreground max-w-2xl mx-auto">
                Everything you need to create and study with AI-generated flashcards
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
              <div className="text-center group">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors">
                  <Zap className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-4">AI-Powered Generation</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Advanced AI analyzes your PDFs and creates relevant, high-quality flashcards automatically
                </p>
              </div>

              <div className="text-center group">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors">
                  <Target className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-4">Customizable Focus</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Choose what to focus on - concepts, definitions, examples, or procedures for targeted learning
                </p>
              </div>

              <div className="text-center group">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors">
                  <Clock className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-4">Study Tracking</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Track your progress and focus on cards that need more practice with built-in analytics
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container-content">
            <div className="text-center mb-16">
              <h2 className="text-section text-foreground mb-4">How it works</h2>
              <p className="text-body-lg text-muted-foreground max-w-2xl mx-auto">
                Three simple steps to transform your documents into study materials
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
              <div className="text-center">
                <div className="bg-primary text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                  1
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-4">Upload PDF</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Upload your educational materials, textbooks, or study guides in PDF format
                </p>
              </div>

              <div className="text-center">
                <div className="bg-primary text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                  2
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-4">AI Processing</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Our advanced AI analyzes your content and generates high-quality flashcards automatically
                </p>
              </div>

              <div className="text-center">
                <div className="bg-primary text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                  3
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-4">Start Learning</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Study with interactive flashcards, track progress, and export to your favorite platforms
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-16 md:py-24 bg-muted/30">
          <div className="container-content">
            <div className="text-center mb-16">
              <h2 className="text-section text-foreground mb-4">Choose your plan</h2>
              <p className="text-body-lg text-muted-foreground">
                Start free, upgrade when you need more
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Free Plan */}
              <Card className="relative p-8 border-border hover:shadow-lg transition-shadow">
                <CardHeader className="p-0 pb-6">
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-foreground">Free</span>
                    {user && !(user as any)?.isPremium && (
                      <Badge variant="default" className="bg-primary text-primary-foreground">
                        Current Plan
                      </Badge>
                    )}
                  </CardTitle>
                  <div className="text-4xl font-bold text-foreground mt-4">
                    $0<span className="text-lg font-normal text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="space-y-4 mb-8">
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-primary mr-3 flex-shrink-0" />
                      <span className="text-foreground">3 PDF uploads per month</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-primary mr-3 flex-shrink-0" />
                      <span className="text-foreground">Basic AI processing</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-primary mr-3 flex-shrink-0" />
                      <span className="text-foreground">Export to all formats</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-primary mr-3 flex-shrink-0" />
                      <span className="text-foreground">Built-in study mode</span>
                    </li>
                  </ul>
                  {!user && (
                    <Button 
                      className="w-full" 
                      variant="outline" 
                      onClick={() => setShowAuthModal(true)}
                      size="lg"
                    >
                      Get Started Free
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Pro Plan */}
              <Card className="relative p-8 border-2 border-primary hover:shadow-lg transition-shadow">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-4 py-2">
                    Most Popular
                  </Badge>
                </div>
                <CardHeader className="p-0 pb-6">
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-foreground">Premium</span>
                    {user && (user as any)?.isPremium && (
                      <Badge variant="default" className="bg-primary text-primary-foreground">
                        Current Plan
                      </Badge>
                    )}
                  </CardTitle>
                  <div className="text-4xl font-bold text-foreground mt-4">
                    $9<span className="text-lg font-normal text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="space-y-4 mb-8">
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-primary mr-3 flex-shrink-0" />
                      <span className="text-foreground">100 PDF uploads per month</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-primary mr-3 flex-shrink-0" />
                      <span className="text-foreground">Advanced AI with multiple providers</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-primary mr-3 flex-shrink-0" />
                      <span className="text-foreground">OCR for scanned documents</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-primary mr-3 flex-shrink-0" />
                      <span className="text-foreground">Priority processing</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-primary mr-3 flex-shrink-0" />
                      <span className="text-foreground">Advanced study analytics</span>
                    </li>
                  </ul>
                  
                  {user ? (
                    (user as any)?.isPremium ? (
                      <div className="text-center">
                        <p className="text-primary font-semibold mb-4">You're on the Premium Plan</p>
                        <Button 
                          variant="outline" 
                          className="w-full" 
                          size="lg"
                          onClick={() => window.open('https://billing.stripe.com/p/login/test_4gweVwge8fAz4vu4gg', '_blank')}
                        >
                          Manage Subscription
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90" 
                        onClick={() => window.open('/api/create-checkout-session', '_blank')}
                        size="lg"
                      >
                        Upgrade to Premium
                      </Button>
                    )
                  ) : (
                    <Button 
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90" 
                      onClick={() => setShowAuthModal(true)}
                      size="lg"
                    >
                      Start Premium Trial
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-12">
        <div className="container-section">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="bg-primary text-primary-foreground rounded-xl p-2">
                <Brain className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold text-foreground">Kardu.io</span>
            </div>
            
            <div className="text-center md:text-right">
              <p className="text-sm text-muted-foreground">
                &copy; 2024 Kardu.io. Powered by advanced AI technology.
              </p>
            </div>
          </div>
        </div>
      </footer>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}