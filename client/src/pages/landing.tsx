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
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808003_1px,transparent_1px),linear-gradient(to_bottom,#80808003_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
        
        {/* Enhanced Floating Animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-gradient-to-r from-foreground/5 to-foreground/10 animate-pulse"
              style={{
                width: `${Math.random() * 6 + 2}px`,
                height: `${Math.random() * 6 + 2}px`,
                left: `${10 + Math.random() * 80}%`,
                top: `${20 + Math.random() * 60}%`,
                animationDelay: `${i * 0.3}s`,
                animationDuration: `${2 + Math.random() * 3}s`
              }}
            />
          ))}
        </div>

        {/* Subtle radial gradient overlay */}
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-background/50 to-background/80" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 lg:py-24">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-foreground/5 border border-foreground/10 rounded-full text-sm font-medium text-foreground/80 backdrop-blur-sm">
              <Sparkles className="w-4 h-4" />
              Beta Access Available — Join 500+ Early Users
            </div>
            
            {/* Main Headline */}
            <div className="space-y-6">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-[0.95]">
                Turn any PDF into{" "}
                <span className="relative">
                  <span className="bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
                    smart flashcards
                  </span>
                  {/* Yellow highlighter animation */}
                  <div className="absolute inset-0 bg-yellow-200/40 animate-highlight-sweep rounded-sm -z-10" />
                  <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-foreground/30 via-foreground/50 to-foreground/30 rounded-full" />
                </span>{" "}
                — in seconds.
              </h1>
              <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                AI-powered spaced repetition to help you{" "}
                <span className="text-foreground font-medium">learn faster</span>, {" "}
                <span className="text-foreground font-medium">retain longer</span>.
              </p>
            </div>
            
            {/* Enhanced CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-6">
              <Button 
                onClick={() => setShowAuthModal(true)}
                size="lg"
                className="group relative bg-gradient-to-r from-foreground to-foreground/90 text-background hover:from-foreground/90 hover:to-foreground/80 px-8 py-4 text-lg font-semibold rounded-xl min-w-[220px] shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-foreground to-foreground/90 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity" />
                <span className="relative flex items-center">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                </span>
              </Button>
              <Button 
                variant="outline"
                size="lg"
                className="px-8 py-4 text-lg font-medium rounded-xl min-w-[180px] border-border hover:bg-muted/50 hover:border-foreground/20 transition-all duration-300 group"
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                See How It Works
              </Button>
            </div>

            {/* Compact Social Proof */}
            <div className="pt-6 space-y-4">
              <div className="flex justify-center items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                Trusted by 500+ learners
              </div>
              <div className="flex flex-wrap justify-center items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  No credit card
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  3 free PDFs
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  All formats
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

      {/* How It Works Section */}
      <section id="how-it-works" className="py-12 md:py-16 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              From PDF to Mastery in 3 Steps
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our AI transforms your study materials into an optimized learning experience
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {[
              {
                step: "01",
                icon: Upload,
                title: "Upload Your PDF",
                description: "Drag and drop any study material. We support both digital and scanned PDFs.",
                features: ["Any PDF format", "OCR for scanned docs", "Instant processing"]
              },
              {
                step: "02", 
                icon: Brain,
                title: "AI Creates Smart Cards",
                description: "Our AI analyzes your content and generates targeted flashcards with optimal difficulty.",
                features: ["Context-aware questions", "Optimal difficulty", "Key concept extraction"]
              },
              {
                step: "03",
                icon: TrendingUp,
                title: "Study & Master",
                description: "Use spaced repetition to maximize retention or export to your favorite platform.",
                features: ["Spaced repetition", "Export to Anki/Quizlet", "Progress tracking"]
              }
            ].map((step, index) => (
              <div key={index} className="relative group">
                <div className="bg-card border border-border rounded-xl p-6 h-full hover:shadow-lg transition-all duration-300 group-hover:border-foreground/20">
                  {/* Step Number */}
                  <div className="absolute -top-3 left-6">
                    <div className="bg-gradient-to-r from-foreground to-foreground/90 text-background px-3 py-1 rounded-lg text-sm font-bold">
                      {step.step}
                    </div>
                  </div>
                  
                  {/* Icon */}
                  <div className="w-12 h-12 bg-gradient-to-br from-foreground/10 to-foreground/5 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <step.icon className="w-6 h-6 text-foreground" />
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-lg font-semibold text-foreground mb-3">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4 text-sm">{step.description}</p>
                  
                  {/* Features */}
                  <ul className="space-y-1">
                    {step.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Connecting Arrow */}
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who Is It For Section */}
      <section className="py-12 md:py-16 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              How StudyCards AI{" "}
              <span className="bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
                Helps You Learn
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              No matter your learning style or goals, our AI adapts to help you succeed
            </p>
          </div>

          {/* Auto-toggling content */}
          <div className="relative">
            <div 
              key={activePersona}
              className="bg-card border border-border rounded-xl p-6 md:p-8 shadow-lg animate-fade-in"
            >
              <div className="grid lg:grid-cols-3 gap-8 items-center">
                {/* Content Side */}
                <div className="lg:col-span-2 space-y-6">
                  {/* User Type Badge */}
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-foreground/5 to-foreground/10 rounded-full border border-foreground/20">
                    {React.createElement(personas[activePersona].icon, { className: "w-4 h-4 text-foreground" })}
                    <span className="text-xs font-medium text-foreground">
                      For {personas[activePersona].title}s
                    </span>
                  </div>

                  {/* Main Value Proposition */}
                  <h3 className="text-xl md:text-2xl font-bold text-foreground leading-tight">
                    {personas[activePersona].description}
                  </h3>

                  {/* Specific Benefits */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-foreground">How we help you:</h4>
                    <div className="space-y-2">
                      {[
                        activePersona === 0 ? [
                          "Convert dense textbooks into bite-sized study cards instantly",
                          "Focus on key concepts with AI-powered content extraction", 
                          "Track your progress and identify weak areas before exams"
                        ] :
                        activePersona === 1 ? [
                          "Target your study sessions on areas you struggle with most",
                          "Build confidence through spaced repetition practice",
                          "Optimize your preparation time for maximum retention"
                        ] :
                        activePersona === 2 ? [
                          "Transform training manuals into digestible learning modules",
                          "Fit skill development into your busy professional schedule",
                          "Track competency growth with detailed progress analytics"
                        ] : [
                          "Turn any learning material into memorable flashcards",
                          "Maintain knowledge retention with scientifically-proven intervals",
                          "Build a personal learning library that grows with you"
                        ]
                      ][0].map((benefit, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-muted-foreground leading-relaxed">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA */}
                  <Button
                    onClick={() => setShowAuthModal(true)}
                    className="group bg-gradient-to-r from-foreground to-foreground/90 text-background hover:from-foreground/90 hover:to-foreground/80 px-5 py-2 text-sm font-semibold rounded-lg transition-all duration-300"
                  >
                    Start Learning Smarter
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                  </Button>
                </div>

                {/* Visual Side */}
                <div className="relative text-center">
                  {/* Progress indicator */}
                  <div className="flex justify-center gap-1 mb-6">
                    {personas.map((_, index) => (
                      <div
                        key={index}
                        className={`h-1 rounded-full transition-all duration-500 ${
                          index === activePersona 
                            ? 'w-6 bg-foreground' 
                            : 'w-1 bg-foreground/20'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Visual representation */}
                  <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl p-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-foreground to-foreground/80 text-background rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                      {React.createElement(personas[activePersona].icon, { className: "w-8 h-8" })}
                    </div>
                    
                    <h4 className="text-lg font-semibold text-foreground mb-3">
                      Perfect for {personas[activePersona].title}s
                    </h4>
                    
                    {/* Success metric */}
                    <div className="bg-card border border-border rounded-lg p-3">
                      <div className="text-xl font-bold text-foreground mb-1">
                        {activePersona === 0 ? "2x Faster" :
                         activePersona === 1 ? "85% Pass Rate" :
                         activePersona === 2 ? "60% Time Saved" :
                         "10x Retention"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {activePersona === 0 ? "Study efficiency improvement" :
                         activePersona === 1 ? "Certification success rate" :
                         activePersona === 2 ? "Training time reduction" :
                         "Knowledge retention boost"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Spaced Repetition Explanation */}
      <section ref={retentionRef} className="py-12 md:py-16 bg-gradient-to-br from-muted/10 via-background to-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              The Science of Smarter Learning
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Spaced repetition isn't just theory—it's proven science that StudyCards AI optimizes for your unique learning pattern
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-10 items-center">
            {/* Explanation */}
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-red-500/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <Clock className="w-3 h-3 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      The Forgetting Curve Problem
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Without reinforcement, we forget <span className="text-foreground font-medium">50% of new information within 24 hours</span> and 
                      <span className="text-foreground font-medium"> 90% within a week</span>. Traditional cramming fights against your brain's natural patterns.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-500/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Our Intelligent Solution
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      StudyCards AI automatically schedules reviews at <span className="text-foreground font-medium">optimal intervals</span> based on your performance, 
                      ensuring <span className="text-foreground font-medium">85%+ long-term retention</span> with minimal time investment.
                    </p>
                  </div>
                </div>
              </div>

              {/* Key Benefits */}
              <div className="bg-card border border-border rounded-lg p-4">
                <h4 className="text-sm font-semibold text-foreground mb-3">Proven Results</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <div className="text-xl font-bold text-foreground">85%</div>
                    <div className="text-xs text-muted-foreground">Retention Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-foreground">60%</div>
                    <div className="text-xs text-muted-foreground">Time Saved</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Animated Retention Graph */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
              <h4 className="text-lg font-semibold text-foreground mb-6 text-center">
                Memory Retention: Traditional vs. Spaced Repetition
              </h4>
              <div className="relative w-full max-w-lg mx-auto">
                <div className="relative h-56 overflow-hidden">
                  <svg viewBox="0 0 400 240" className="w-full h-full">
                    {/* Enhanced Grid */}
                    {[0, 20, 40, 60, 80, 100].map((y) => (
                      <line 
                        key={y}
                        x1="50" 
                        y1={200 - y * 1.5} 
                        x2="350" 
                        y2={200 - y * 1.5}
                        stroke="currentColor"
                        strokeOpacity="0.1"
                        strokeDasharray="2,2"
                        className="text-muted-foreground"
                      />
                    ))}
                    
                    {/* Time markers */}
                    {[0, 1, 7, 14, 30].map((day, index) => (
                      <line 
                        key={day}
                        x1={50 + index * 75} 
                        y1="50"
                        x2={50 + index * 75}
                        y2="200"
                        stroke="currentColor"
                        strokeOpacity="0.05"
                        className="text-muted-foreground"
                      />
                    ))}
                    
                    {/* Traditional learning decay curve */}
                    <path
                      d="M 50 50 Q 95 90 140 130 Q 190 160 240 175 Q 295 185 350 190"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2.5"
                      strokeOpacity="0.7"
                      strokeDasharray="3,3"
                    />
                    
                    {/* Spaced repetition curve - animated */}
                    {retentionStep >= 5 && (
                      <path
                        d="M 50 50 L 125 60 L 200 65 L 275 70 L 350 72"
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="3"
                        className="animate-fade-in"
                        style={{ 
                          strokeDasharray: '800',
                          strokeDashoffset: retentionStep >= 5 ? '0' : '800',
                          transition: 'stroke-dashoffset 2s ease-in-out'
                        }}
                      />
                    )}
                    
                    {/* Animated data points */}
                    {retentionData.slice(0, retentionStep + 1).map((point, index) => (
                      <g key={index} className="animate-fade-in">
                        <circle
                          cx={50 + (index < 5 ? index * 75 : 350)}
                          cy={index < 5 ? 200 - (point.retention * 1.5) : 200 - (85 * 1.5)}
                          r="4"
                          fill={index < 5 ? "#ef4444" : "#22c55e"}
                          stroke="white"
                          strokeWidth="1.5"
                        />
                        {/* Point labels */}
                        <text
                          x={50 + (index < 5 ? index * 75 : 350)}
                          y={index < 5 ? 200 - (point.retention * 1.5) - 12 : 200 - (85 * 1.5) - 12}
                          textAnchor="middle"
                          className="text-xs font-medium fill-foreground"
                        >
                          {index < 5 ? `${point.retention}%` : '85%'}
                        </text>
                      </g>
                    ))}
                    
                    {/* Axes */}
                    <line x1="50" y1="50" x2="50" y2="200" stroke="currentColor" strokeWidth="2" className="text-foreground" />
                    <line x1="50" y1="200" x2="350" y2="200" stroke="currentColor" strokeWidth="2" className="text-foreground" />
                    
                    {/* Axis labels */}
                    <text x="25" y="125" textAnchor="middle" className="text-xs fill-muted-foreground" transform="rotate(-90 25 125)">
                      Retention %
                    </text>
                    <text x="200" y="225" textAnchor="middle" className="text-xs fill-muted-foreground">
                      Time (Days)
                    </text>
                  </svg>
                  
                  {/* Time labels positioned outside the SVG to prevent overlap */}
                  <div className="absolute bottom-0 left-0 right-0 flex justify-between px-[50px] text-xs text-muted-foreground">
                    <span className="text-center min-w-0">Day 0</span>
                    <span className="text-center min-w-0">Day 1</span>
                    <span className="text-center min-w-0">Week 1</span>
                    <span className="text-center min-w-0">Week 2</span>
                    <span className="text-center min-w-0">Month 1</span>
                  </div>
                  
                  {/* Enhanced Legend */}
                  <div className="absolute top-2 right-2 space-y-2 bg-background/90 backdrop-blur-sm p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-0.5 bg-red-500 opacity-70" style={{borderStyle: 'dashed'}}></div>
                      <span className="text-xs text-muted-foreground">Traditional</span>
                    </div>
                    {retentionStep >= 5 && (
                      <div className="flex items-center gap-2 animate-fade-in">
                        <div className="w-3 h-0.5 bg-green-500 rounded"></div>
                        <span className="text-xs text-muted-foreground">Spaced Rep.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-4 bg-muted/30 p-3 rounded-lg">
                <strong className="text-foreground">StudyCards AI</strong> adapts these scientifically-proven intervals to your unique learning pattern
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-12 md:py-16 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Simple, Honest Pricing
            </h2>
            <p className="text-sm text-muted-foreground">
              Start free, upgrade when you need more
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Free Plan */}
            <Card className="border-border p-6">
              <CardContent className="p-0">
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-foreground mb-1">Free</h3>
                  <div className="text-2xl font-bold text-foreground mb-2">$0</div>
                  <p className="text-sm text-muted-foreground">Perfect for trying out</p>
                </div>
                
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-foreground">3 PDFs per month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-foreground">Basic AI quality</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-foreground">Export to all formats</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-foreground">Built-in study mode</span>
                  </li>
                </ul>
                
                <Button 
                  onClick={() => setShowAuthModal(true)}
                  variant="outline" 
                  className="w-full py-2 text-sm font-medium"
                >
                  Start Free
                </Button>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="border-foreground/20 p-6 relative">
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-foreground to-foreground/90 text-background px-3 py-1 rounded-full text-xs font-medium">
                  Most Popular
                </span>
              </div>
              
              <CardContent className="p-0">
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-foreground mb-1">Pro</h3>
                  <div className="text-2xl font-bold text-foreground mb-2">$12</div>
                  <p className="text-sm text-muted-foreground">per month</p>
                </div>
                
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-foreground">100 PDFs per month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-foreground">Advanced AI quality</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-foreground">Priority processing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-foreground">Advanced study analytics</span>
                  </li>
                </ul>
                
                <Button 
                  onClick={() => setShowAuthModal(true)}
                  className="w-full py-2 text-sm font-medium bg-gradient-to-r from-foreground to-foreground/90 text-background hover:from-foreground/90 hover:to-foreground/80"
                >
                  Start Free Trial
                </Button>
              </CardContent>
            </Card>
          </div>
          
          <p className="text-center text-xs text-muted-foreground mt-6">
            No credit card required. Cancel anytime.
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Loved by Learners Worldwide
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              Join thousands who've transformed their study habits with AI-powered flashcards
            </p>
          </div>

          {/* University Logos */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-10 opacity-60">
            <div className="text-xs text-muted-foreground font-medium">Trusted by students at</div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="px-3 py-1 border border-border rounded-lg text-xs font-medium">MIT</div>
              <div className="px-3 py-1 border border-border rounded-lg text-xs font-medium">Stanford</div>
              <div className="px-3 py-1 border border-border rounded-lg text-xs font-medium">Harvard</div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Sarah M.",
                quote: "Cut my study time in half while improving my retention. The AI really understands complex medical concepts.",
                role: "Medical Student, Johns Hopkins",
                rating: 5,
                avatar: "S"
              },
              {
                name: "Marcus R.",
                quote: "Finally passed my AWS certification. The spaced repetition made technical concepts stick like never before.",
                role: "Software Engineer",
                rating: 5,
                avatar: "M"
              },
              {
                name: "Emma L.",
                quote: "Game changer for language learning. Creates perfect vocabulary cards from my textbooks automatically.",
                role: "Graduate Student, Columbia",
                rating: 5,
                avatar: "E"
              }
            ].map((testimonial, index) => (
              <Card key={index} className="border-border p-5 hover:shadow-lg transition-all duration-300 bg-card">
                <CardContent className="p-0">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <blockquote className="text-sm text-foreground mb-4 leading-relaxed">
                    "{testimonial.quote}"
                  </blockquote>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-foreground to-foreground/80 text-background rounded-full flex items-center justify-center text-sm font-semibold">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{testimonial.name}</div>
                      <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Stats */}
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-foreground mb-1">500+</div>
              <div className="text-xs text-muted-foreground">Active Users</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground mb-1">10K+</div>
              <div className="text-xs text-muted-foreground">PDFs Processed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground mb-1">85%</div>
              <div className="text-xs text-muted-foreground">Better Retention</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground mb-1">4.9★</div>
              <div className="text-xs text-muted-foreground">User Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-12 md:py-16 bg-gradient-to-br from-background via-muted/10 to-background relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:40px_40px]" />
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
              Start learning{" "}
              <span className="bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
                smarter
              </span>{" "}
              — today.
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Takes less than 60 seconds. Works with any PDF.
              <br />
              <span className="text-foreground font-medium">Transform your study habits forever.</span>
            </p>
            
            <div className="pt-6">
              <Button 
                onClick={() => setShowAuthModal(true)}
                size="lg"
                className="group relative bg-gradient-to-r from-foreground to-foreground/90 text-background hover:from-foreground/90 hover:to-foreground/80 px-10 py-4 text-lg font-semibold rounded-xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-[1.02]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-foreground to-foreground/90 rounded-xl blur opacity-40 group-hover:opacity-60 transition-opacity" />
                <span className="relative flex items-center">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform duration-300" />
                </span>
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="pt-6 flex flex-wrap justify-center items-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
                Free forever plan
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
                No credit card needed
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
                Ready in 60 seconds
              </div>
            </div>
          </div>
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