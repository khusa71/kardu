import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NavigationBar } from "@/components/navigation-bar";
import { AuthModal } from "@/components/auth-modal";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { Link } from "wouter";
import { BookOpen, Upload, FileText, Zap, Star, Users, CheckCircle, ArrowRight, Brain, Target, Clock } from "lucide-react";

export default function Home() {
  const { user, loading } = useFirebaseAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

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

        {/* Features Section */}
        <section className="py-16 md:py-24 bg-muted/30">
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

        {/* How It Works */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center">
              <div className="bg-primary text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mb-4">1</div>
              <h3 className="text-lg font-semibold mb-2">Upload PDF</h3>
              <p className="text-gray-600 dark:text-gray-400">Upload your educational materials or study guides</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-primary text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mb-4">2</div>
              <h3 className="text-lg font-semibold mb-2">AI Processing</h3>
              <p className="text-gray-600 dark:text-gray-400">Our AI analyzes content and generates flashcards</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-primary text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mb-4">3</div>
              <h3 className="text-lg font-semibold mb-2">Start Learning</h3>
              <p className="text-gray-600 dark:text-gray-400">Study with interactive flashcards and track progress</p>
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="relative">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Free Plan</span>
                <Badge variant="secondary">Current</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-4">$0<span className="text-lg text-gray-500">/month</span></div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span>3 PDF uploads per month</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span>Basic AI processing</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span>Standard export formats</span>
                </li>
              </ul>
              {!user && (
                <Button className="w-full" onClick={() => setShowAuthModal(true)}>
                  Get Started Free
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="relative border-primary">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-primary text-white">Most Popular</Badge>
            </div>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Pro Plan</span>
                <Star className="w-5 h-5 text-yellow-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-4">$9.99<span className="text-lg text-gray-500">/month</span></div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span>100 PDF uploads per month</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span>Advanced AI processing</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span>Multiple export formats</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span>Priority support</span>
                </li>
              </ul>
              <Button className="w-full" onClick={() => user ? window.open('/api/create-checkout-session', '_blank') : setShowAuthModal(true)}>
                {user ? 'Upgrade to Pro' : 'Sign Up for Pro'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}