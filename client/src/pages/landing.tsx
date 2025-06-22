import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AuthModal } from "@/components/auth-modal";

import { 
  Brain, Download, Shield, CheckCircle, Star, ArrowRight, 
  Menu, X, Upload, Bot, Rocket, Feather, Clock, 
  TrendingUp, Sparkles, Users, Target, Timer, Lightbulb, 
  Zap, FileText, Award, Globe, RotateCcw
} from "lucide-react";

export default function Landing() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const demoSteps = [
    { text: "Upload PDF", progress: 20 },
    { text: "AI Analysis", progress: 50 },
    { text: "Generating Cards", progress: 80 },
    { text: "Ready to Study!", progress: 100 }
  ];

  const spacedRepetitionData = [
    { day: "Today", active: true },
    { day: "Day 1", active: false },
    { day: "Day 4", active: false },
    { day: "Day 11", active: false },
    { day: "Day 25", active: false },
    { day: "Day 55", active: false }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setDemoStep((prev) => (prev + 1) % demoSteps.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSpacedRepetitionDemo = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    // Animation logic here
    setTimeout(() => setIsAnimating(false), 3000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-primary text-primary-foreground rounded-xl p-2.5">
                <Feather className="w-6 h-6" />
              </div>
              <span className="text-xl font-bold text-foreground">Kardu.io</span>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <nav className="flex items-center space-x-6">
                <Button variant="ghost" className="text-sm font-medium">
                  Features
                </Button>
                <Button variant="ghost" className="text-sm font-medium">
                  Pricing
                </Button>
              </nav>
              <Button 
                onClick={() => setShowAuthModal(true)} 
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 font-medium rounded-xl"
              >
                Get Started
              </Button>
            </div>

            <Button 
              variant="ghost" 
              size="sm"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-6 border-t border-border pt-6">
              <div className="flex flex-col space-y-4">
                <Button variant="ghost" className="justify-start">Features</Button>
                <Button variant="ghost" className="justify-start">Pricing</Button>
                <Button 
                  onClick={() => setShowAuthModal(true)} 
                  className="bg-primary text-primary-foreground hover:bg-primary/90 justify-center font-medium rounded-xl mt-4"
                >
                  Get Started
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        
        <div className="relative container mx-auto px-6 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-sm font-medium text-primary">
              <Sparkles className="w-4 h-4" />
              Beta Access Available
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              PDF to{" "}
              <span className="bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                Smart Flashcards
              </span>{" "}
              in Seconds
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
              AI transforms your study materials into scientifically optimized flashcards. 
              <span className="text-foreground font-medium"> Study smarter, not harder.</span>
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              <Button 
                onClick={() => setShowAuthModal(true)}
                size="lg"
                className="group bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-4 text-lg font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                variant="outline"
                size="lg"
                className="px-8 py-4 text-lg font-medium rounded-2xl border-border hover:bg-muted/50 transition-all duration-300"
              >
                Watch Demo
              </Button>
            </div>

            <div className="pt-12 space-y-4">
              <div className="flex justify-center items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                Join 500+ students already using StudyCards AI
              </div>
              <div className="flex justify-center items-center gap-6 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  No credit card required
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  3 free PDFs/month
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  Cancel anytime
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Box Demo Section */}
      <section className="py-20 md:py-32 bg-background">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              See the Magic in Action
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Transform any PDF into intelligent flashcards with our AI-powered platform
            </p>
          </div>

          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-fr">
            {/* Large Demo Card */}
            <Card className="md:col-span-2 lg:col-span-2 md:row-span-2 p-8 bg-gradient-to-br from-background to-muted/20 border-border/40 hover:shadow-2xl transition-all duration-500">
              <div className="h-full flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Live PDF Processing</h3>
                </div>
                
                <div className="flex-1 space-y-6">
                  <div className="p-4 bg-muted/30 rounded-xl border-2 border-dashed border-border">
                    <div className="flex items-center gap-3 mb-3">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm font-medium">biology_chapter_5.pdf</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${demoSteps[demoStep].progress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{demoSteps[demoStep].text}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-background border border-border rounded-lg">
                      <div className="text-sm font-medium mb-2">Generated Card</div>
                      <div className="text-xs text-muted-foreground">What is photosynthesis?</div>
                    </div>
                    <div className="p-4 bg-background border border-border rounded-lg">
                      <div className="text-sm font-medium mb-2">Generated Card</div>
                      <div className="text-xs text-muted-foreground">Define mitochondria...</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Stats Cards */}
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all duration-300">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-blue-700 dark:text-blue-400 mb-2">95%</div>
                <div className="text-sm text-blue-600 dark:text-blue-500">Faster than manual</div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200 dark:border-green-800 hover:shadow-lg transition-all duration-300">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-3xl font-bold text-green-700 dark:text-green-400 mb-2">200%</div>
                <div className="text-sm text-green-600 dark:text-green-500">Better retention</div>
              </div>
            </Card>

            {/* Spaced Repetition Card */}
            <Card className="md:col-span-1 lg:col-span-2 p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Spaced Repetition</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSpacedRepetitionDemo}
                  className="text-xs"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Demo
                </Button>
              </div>
              <div className="flex justify-between items-center">
                {spacedRepetitionData.map((item, index) => (
                  <div key={index} className="text-center">
                    <div className={`w-3 h-3 rounded-full mb-2 ${item.active ? 'bg-purple-500' : 'bg-muted'}`}></div>
                    <div className="text-xs text-muted-foreground">{item.day}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Export Card */}
            <Card className="p-6 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-orange-200 dark:border-orange-800 hover:shadow-lg transition-all duration-300">
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Download className="w-6 h-6 text-orange-600" />
                </div>
                <div className="text-sm font-medium mb-2">Export to</div>
                <div className="text-xs text-muted-foreground">Anki • Quizlet • CSV</div>
              </div>
            </Card>

            {/* Security Card */}
            <Card className="p-6 bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-950/20 dark:to-gray-900/20 border-slate-200 dark:border-slate-800 hover:shadow-lg transition-all duration-300">
              <div className="text-center">
                <div className="w-12 h-12 bg-slate-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-slate-600" />
                </div>
                <div className="text-sm font-medium mb-2">Secure</div>
                <div className="text-xs text-muted-foreground">Private & encrypted</div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className="py-20 md:py-32 bg-muted/20">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              {/* Problem */}
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                  Traditional studying is <span className="text-red-500">broken</span>
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <X className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-foreground">Hours of manual flashcard creation</div>
                      <div className="text-sm text-muted-foreground">Tedious copy-paste work that kills motivation</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <X className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-foreground">Poor retention rates</div>
                      <div className="text-sm text-muted-foreground">Random review timing wastes your time</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <X className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-foreground">Platform lock-in</div>
                      <div className="text-sm text-muted-foreground">Stuck with one study app forever</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Solution */}
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                  StudyCards AI <span className="text-green-500">fixes it</span>
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-foreground">AI creates cards in seconds</div>
                      <div className="text-sm text-muted-foreground">Upload PDF, get perfect flashcards instantly</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-foreground">Science-based spaced repetition</div>
                      <div className="text-sm text-muted-foreground">200% better retention with optimal timing</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-foreground">Export anywhere</div>
                      <div className="text-sm text-muted-foreground">Anki, Quizlet, CSV - use your favorite app</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-20 md:py-32 bg-background">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Trusted by Students Worldwide
            </h2>
            <p className="text-xl text-muted-foreground">
              Join thousands who've transformed their studying
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="p-6 border-border hover:shadow-lg transition-all duration-300">
              <div className="flex items-center mb-4">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-muted-foreground mb-4 italic">
                "Cut my study time in half while improving my grades. This is revolutionary."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                  <span className="text-sm font-medium text-primary">SM</span>
                </div>
                <div>
                  <div className="font-medium text-foreground">Sarah M.</div>
                  <div className="text-sm text-muted-foreground">Medical Student, Harvard</div>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-border hover:shadow-lg transition-all duration-300">
              <div className="flex items-center mb-4">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-muted-foreground mb-4 italic">
                "Finally, a tool that actually understands my textbooks. Game changer."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                  <span className="text-sm font-medium text-primary">AR</span>
                </div>
                <div>
                  <div className="font-medium text-foreground">Alex R.</div>
                  <div className="text-sm text-muted-foreground">PhD Student, MIT</div>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-border hover:shadow-lg transition-all duration-300">
              <div className="flex items-center mb-4">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-muted-foreground mb-4 italic">
                "Passed my board exams thanks to the spaced repetition system."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                  <span className="text-sm font-medium text-primary">JK</span>
                </div>
                <div>
                  <div className="font-medium text-foreground">Jordan K.</div>
                  <div className="text-sm text-muted-foreground">Resident, Johns Hopkins</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 md:py-32 bg-muted/20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-muted-foreground">
              Start free, upgrade when you need more
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <Card className="p-8 border-border hover:shadow-lg transition-shadow">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-foreground mb-2">Free</h3>
                <div className="text-4xl font-bold text-foreground mb-4">
                  $0<span className="text-lg font-normal text-muted-foreground">/month</span>
                </div>
                <p className="text-muted-foreground">Perfect for trying out StudyCards AI</p>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-primary mr-3" />
                  <span>3 PDF uploads per month</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-primary mr-3" />
                  <span>Up to 50 pages per PDF</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-primary mr-3" />
                  <span>Basic AI quality</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-primary mr-3" />
                  <span>Export to all formats</span>
                </li>
              </ul>
              
              <Button 
                onClick={() => setShowAuthModal(true)}
                className="w-full py-3 rounded-xl"
                variant="outline"
              >
                Start Free
              </Button>
            </Card>

            {/* Premium Plan */}
            <Card className="p-8 border-primary/50 hover:shadow-xl transition-shadow relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-foreground mb-2">Premium</h3>
                <div className="text-4xl font-bold text-foreground mb-4">
                  $9.99<span className="text-lg font-normal text-muted-foreground">/month</span>
                </div>
                <p className="text-muted-foreground">For serious students and professionals</p>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-primary mr-3" />
                  <span>100 PDF uploads per month</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-primary mr-3" />
                  <span>Up to 200 pages per PDF</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-primary mr-3" />
                  <span>Advanced AI quality</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-primary mr-3" />
                  <span>Priority processing</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-primary mr-3" />
                  <span>Advanced analytics</span>
                </li>
              </ul>
              
              <Button 
                onClick={() => setShowAuthModal(true)}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Upgrade to Premium
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 md:py-32 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Ready to Study Smarter?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of students who've transformed their learning with AI-powered flashcards
            </p>
            <Button 
              onClick={() => setShowAuthModal(true)}
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-12 py-4 text-xl font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Start Your Free Trial
              <ArrowRight className="w-6 h-6 ml-3" />
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              No credit card required • 3 free PDFs every month • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-background border-t border-border">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="bg-primary text-primary-foreground rounded-xl p-2">
              <Feather className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold text-foreground">Kardu.io</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2025 StudyCards AI. All rights reserved.
          </p>
        </div>
      </footer>

      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}