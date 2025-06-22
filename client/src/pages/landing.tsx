import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AuthModal } from "@/components/auth-modal";
import { 
  Brain, FileText, Download, Zap, Shield, CheckCircle, Star, ArrowRight, 
  Menu, X, Upload, Bot, Rocket, ChevronRight, Feather, Clock, RotateCcw, 
  TrendingUp, Sparkles, Users, Target, Timer, Lightbulb, Globe, Award,
  GraduationCap, BookOpen, Briefcase, Play
} from "lucide-react";

export default function Landing() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activePersona, setActivePersona] = useState(0);
  const [retentionStep, setRetentionStep] = useState(0);
  const retentionRef = useRef<HTMLDivElement>(null);

  // Auto-toggle personas
  useEffect(() => {
    const interval = setInterval(() => {
      setActivePersona((prev) => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Intersection Observer for retention graph animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateRetentionGraph();
          }
        });
      },
      { threshold: 0.5 }
    );

    if (retentionRef.current) {
      observer.observe(retentionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const animateRetentionGraph = () => {
    setRetentionStep(0);
    const steps = [0, 1, 2, 3, 4, 5];
    
    steps.forEach((step, index) => {
      setTimeout(() => {
        setRetentionStep(step);
      }, index * 500);
    });
  };

  const personas = [
    {
      icon: GraduationCap,
      title: "Student",
      description: "Turn dense PDFs into bite-sized recall prompts, and crush your finals 2x faster."
    },
    {
      icon: BookOpen,
      title: "Exam Prepper",
      description: "Transform study materials into targeted practice questions for certification success."
    },
    {
      icon: Briefcase,
      title: "Professional",
      description: "Convert training documents and manuals into digestible learning modules."
    },
    {
      icon: Brain,
      title: "Lifelong Learner",
      description: "Turn any content into memorable flashcards for continuous skill development."
    }
  ];

  const retentionData = [
    { day: 0, retention: 100, label: "Initial Learning" },
    { day: 1, retention: 50, label: "After 1 Day" },
    { day: 7, retention: 25, label: "After 1 Week" },
    { day: 14, retention: 15, label: "After 2 Weeks" },
    { day: 30, retention: 10, label: "After 1 Month" },
    { day: 30, retention: 85, label: "With Spaced Repetition" }
  ];

  const testimonials = [
    {
      name: "Sarah K.",
      quote: "Cut my study time in half. The AI really understands my textbooks.",
      role: "Medical Student"
    },
    {
      name: "Mike R.",
      quote: "Finally passed my certification exam. The spaced repetition works.",
      role: "IT Professional"
    },
    {
      name: "Emma L.",
      quote: "Game changer for language learning. Creates perfect vocabulary cards.",
      role: "Graduate Student"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-foreground to-foreground/80 text-background rounded-xl p-2.5">
                <Feather className="w-6 h-6" />
              </div>
              <span className="text-xl font-bold text-foreground">StudyCards AI</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <nav className="flex items-center space-x-6">
                <button 
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Features
                </button>
                <button 
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Pricing
                </button>
              </nav>
              <Button 
                onClick={() => setShowAuthModal(true)} 
                className="bg-gradient-to-r from-foreground to-foreground/90 text-background hover:from-foreground/90 hover:to-foreground/80 px-6 py-2 font-medium rounded-lg"
              >
                Start Free Trial
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <Button 
              variant="ghost" 
              size="sm"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-6 border-t border-border pt-6">
              <div className="flex flex-col space-y-4">
                <button 
                  className="text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => {
                    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                    setMobileMenuOpen(false);
                  }}
                >
                  Features
                </button>
                <button 
                  className="text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => {
                    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
                    setMobileMenuOpen(false);
                  }}
                >
                  Pricing
                </button>
                <Button 
                  onClick={() => setShowAuthModal(true)} 
                  className="bg-gradient-to-r from-foreground to-foreground/90 text-background justify-center font-medium rounded-lg mt-4"
                >
                  Start Free Trial
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-background overflow-hidden">
        {/* Subtle Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background/95" />
        
        {/* Floating Dots Animation */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-foreground/10 rounded-full animate-pulse"
              style={{
                left: `${20 + i * 15}%`,
                top: `${30 + (i % 2) * 40}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: '3s'
              }}
            />
          ))}
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 lg:py-40">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Main Headline */}
            <div className="space-y-6">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground">
                Turn any PDF into{" "}
                <span className="bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
                  smart flashcards
                </span>{" "}
                — in seconds.
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                AI-powered spaced repetition to help you learn faster, retain longer.
              </p>
            </div>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              <Button 
                onClick={() => setShowAuthModal(true)}
                size="lg"
                className="group bg-gradient-to-r from-foreground to-foreground/90 text-background hover:from-foreground/90 hover:to-foreground/80 px-8 py-4 text-lg font-semibold rounded-lg min-w-[200px] shadow-lg transition-all duration-200"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
              </Button>
              <Button 
                variant="outline"
                size="lg"
                className="px-8 py-4 text-lg font-medium rounded-lg min-w-[160px] border-border hover:bg-muted/50 transition-all duration-200"
                onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <Play className="w-5 h-5 mr-2" />
                Watch Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Who Is It For Section */}
      <section className="py-16 md:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Perfect for Every Learner
            </h2>
          </div>

          {/* Persona Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {personas.map((persona, index) => (
              <button
                key={index}
                onClick={() => setActivePersona(index)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  activePersona === index
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <persona.icon className="w-4 h-4" />
                {persona.title}
              </button>
            ))}
          </div>

          {/* Active Persona Content */}
          <div className="max-w-2xl mx-auto text-center">
            <div 
              key={activePersona}
              className="bg-card border border-border rounded-xl p-8 animate-fade-in"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-foreground to-foreground/80 text-background rounded-xl flex items-center justify-center mx-auto mb-6">
                {React.createElement(personas[activePersona].icon, { className: "w-8 h-8" })}
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">
                As a {personas[activePersona].title}
              </h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {personas[activePersona].description}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Spaced Repetition Explanation */}
      <section ref={retentionRef} className="py-16 md:py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Smarter Studying Through Spaced Repetition
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our AI adapts the scientifically proven spaced repetition method to your content and recall pace.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Explanation */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground">
                  Why Traditional Studying Fails
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Without reinforcement, we forget 50% of new information within 24 hours. 
                  Spaced repetition fights this natural memory decay by scheduling reviews 
                  at optimal intervals.
                </p>
              </div>
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground">
                  StudyCards AI Difference
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Our system automatically schedules flashcard reviews based on your 
                  performance, ensuring maximum retention with minimum time investment.
                </p>
              </div>
            </div>

            {/* Animated Retention Graph */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h4 className="text-lg font-semibold text-foreground mb-6 text-center">
                Memory Retention Over Time
              </h4>
              <div className="relative h-64">
                <svg viewBox="0 0 400 200" className="w-full h-full">
                  {/* Grid lines */}
                  {[0, 25, 50, 75, 100].map((y) => (
                    <line 
                      key={y}
                      x1="50" 
                      y1={200 - y * 1.5} 
                      x2="350" 
                      y2={200 - y * 1.5}
                      stroke="currentColor"
                      strokeOpacity="0.1"
                      className="text-muted-foreground"
                    />
                  ))}
                  
                  {/* Decay curve (without spaced repetition) */}
                  <path
                    d="M 50 50 Q 150 100 200 125 Q 250 140 300 150 Q 325 155 350 160"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeOpacity="0.4"
                    className="text-red-500"
                  />
                  
                  {/* Spaced repetition curve */}
                  {retentionStep >= 5 && (
                    <path
                      d="M 50 50 L 100 60 L 150 65 L 200 70 L 250 72 L 300 75 L 350 77"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-green-500 animate-fade-in"
                    />
                  )}
                  
                  {/* Data points */}
                  {retentionData.slice(0, retentionStep + 1).map((point, index) => (
                    <circle
                      key={index}
                      cx={50 + (point.day * 10)}
                      cy={200 - (point.retention * 1.5)}
                      r="4"
                      fill="currentColor"
                      className={index < 5 ? "text-red-500" : "text-green-500"}
                    />
                  ))}
                  
                  {/* Axes */}
                  <line x1="50" y1="50" x2="50" y2="200" stroke="currentColor" strokeWidth="2" className="text-muted-foreground" />
                  <line x1="50" y1="200" x2="350" y2="200" stroke="currentColor" strokeWidth="2" className="text-muted-foreground" />
                </svg>
                
                {/* Labels */}
                <div className="absolute bottom-0 left-12 text-xs text-muted-foreground">Days</div>
                <div className="absolute top-1/2 left-2 text-xs text-muted-foreground -rotate-90 origin-center">Retention %</div>
                
                {/* Legend */}
                <div className="absolute top-4 right-4 space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-red-500 opacity-40"></div>
                    <span className="text-muted-foreground">Traditional</span>
                  </div>
                  {retentionStep >= 5 && (
                    <div className="flex items-center gap-2 animate-fade-in">
                      <div className="w-3 h-0.5 bg-green-500"></div>
                      <span className="text-muted-foreground">Spaced Repetition</span>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center mt-4">
                StudyCards AI adapts this model for your content and recall pace.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 md:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Simple, Honest Pricing
            </h2>
            <p className="text-lg text-muted-foreground">
              Start free, upgrade when you need more
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <Card className="border-border p-8">
              <CardContent className="p-0">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-foreground mb-2">Free</h3>
                  <div className="text-3xl font-bold text-foreground mb-4">$0</div>
                  <p className="text-muted-foreground">Perfect for trying out</p>
                </div>
                
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-foreground">3 PDFs per month</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-foreground">Basic AI quality</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-foreground">Export to all formats</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-foreground">Built-in study mode</span>
                  </li>
                </ul>
                
                <Button 
                  onClick={() => setShowAuthModal(true)}
                  variant="outline" 
                  className="w-full py-3 font-medium"
                >
                  Start Free
                </Button>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="border-foreground/20 p-8 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-foreground to-foreground/90 text-background px-3 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
              
              <CardContent className="p-0">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-foreground mb-2">Pro</h3>
                  <div className="text-3xl font-bold text-foreground mb-4">$12</div>
                  <p className="text-muted-foreground">per month</p>
                </div>
                
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-foreground">100 PDFs per month</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-foreground">Advanced AI quality</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-foreground">Priority processing</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-foreground">Advanced study analytics</span>
                  </li>
                </ul>
                
                <Button 
                  onClick={() => setShowAuthModal(true)}
                  className="w-full py-3 font-medium bg-gradient-to-r from-foreground to-foreground/90 text-background hover:from-foreground/90 hover:to-foreground/80"
                >
                  Start Free Trial
                </Button>
              </CardContent>
            </Card>
          </div>
          
          <p className="text-center text-sm text-muted-foreground mt-8">
            No credit card required. Cancel anytime.
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Loved by Learners
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-border p-6">
                <CardContent className="p-0">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <blockquote className="text-foreground mb-4 leading-relaxed">
                    "{testimonial.quote}"
                  </blockquote>
                  <div className="text-sm">
                    <div className="font-medium text-foreground">{testimonial.name}</div>
                    <div className="text-muted-foreground">{testimonial.role}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-20 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            Start learning smarter — today.
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Takes less than 60 seconds. Works with any PDF.
          </p>
          <Button 
            onClick={() => setShowAuthModal(true)}
            size="lg"
            className="bg-gradient-to-r from-foreground to-foreground/90 text-background hover:from-foreground/90 hover:to-foreground/80 px-8 py-4 text-lg font-semibold rounded-lg shadow-lg"
          >
            Start Free Trial
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-foreground to-foreground/80 text-background rounded-xl p-2">
                <Feather className="w-5 h-5" />
              </div>
              <span className="font-semibold text-foreground">StudyCards AI</span>
            </div>
            
            <div className="flex items-center space-x-6 text-sm">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">About</a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Terms</a>
              <a href="mailto:hello@studycards.ai" className="text-muted-foreground hover:text-foreground transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </div>
  );
}