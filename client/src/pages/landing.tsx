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
        {/* Enhanced Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]" />
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

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36 lg:py-48">
          <div className="max-w-5xl mx-auto text-center space-y-10">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-foreground/5 border border-foreground/10 rounded-full text-sm font-medium text-foreground/80 backdrop-blur-sm">
              <Sparkles className="w-4 h-4" />
              Beta Access Available — Join 500+ Early Users
            </div>
            
            {/* Main Headline */}
            <div className="space-y-8">
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-foreground leading-[0.95]">
                Turn any PDF into{" "}
                <span className="relative">
                  <span className="bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
                    smart flashcards
                  </span>
                  <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-gradient-to-r from-foreground/30 via-foreground/50 to-foreground/30 rounded-full" />
                </span>{" "}
                — in seconds.
              </h1>
              <p className="text-xl md:text-2xl lg:text-3xl text-muted-foreground max-w-4xl mx-auto leading-relaxed font-light">
                AI-powered spaced repetition to help you{" "}
                <span className="text-foreground font-medium">learn faster</span>, {" "}
                <span className="text-foreground font-medium">retain longer</span>.
              </p>
            </div>
            
            {/* Enhanced CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              <Button 
                onClick={() => setShowAuthModal(true)}
                size="lg"
                className="group relative bg-gradient-to-r from-foreground to-foreground/90 text-background hover:from-foreground/90 hover:to-foreground/80 px-10 py-5 text-lg font-semibold rounded-xl min-w-[240px] shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
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
                className="px-10 py-5 text-lg font-medium rounded-xl min-w-[200px] border-border hover:bg-muted/50 hover:border-foreground/20 transition-all duration-300 group"
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                See How It Works
              </Button>
            </div>

            {/* Social Proof */}
            <div className="pt-8 space-y-6">
              <div className="flex justify-center items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                Trusted by 500+ students and professionals
              </div>
              <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  No credit card required
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  3 free PDFs monthly
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Export to any format
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Cancel anytime
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 md:py-28 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              From PDF to Mastery in 3 Steps
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Our AI transforms your study materials into an optimized learning experience
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                step: "01",
                icon: Upload,
                title: "Upload Your PDF",
                description: "Drag and drop any study material, textbook, or document. We support both digital and scanned PDFs.",
                features: ["Any PDF format", "OCR for scanned docs", "Instant processing"]
              },
              {
                step: "02", 
                icon: Brain,
                title: "AI Creates Smart Cards",
                description: "Our advanced AI analyzes your content and generates targeted flashcards with perfect difficulty balance.",
                features: ["Context-aware questions", "Optimal difficulty", "Key concept extraction"]
              },
              {
                step: "03",
                icon: TrendingUp,
                title: "Study & Master",
                description: "Use spaced repetition to maximize retention or export to your favorite study platform.",
                features: ["Spaced repetition", "Export to Anki/Quizlet", "Progress tracking"]
              }
            ].map((step, index) => (
              <div key={index} className="relative group">
                <div className="bg-card border border-border rounded-2xl p-8 h-full hover:shadow-lg transition-all duration-300 group-hover:border-foreground/20">
                  {/* Step Number */}
                  <div className="absolute -top-4 left-8">
                    <div className="bg-gradient-to-r from-foreground to-foreground/90 text-background px-4 py-2 rounded-lg text-sm font-bold">
                      {step.step}
                    </div>
                  </div>
                  
                  {/* Icon */}
                  <div className="w-16 h-16 bg-gradient-to-br from-foreground/10 to-foreground/5 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <step.icon className="w-8 h-8 text-foreground" />
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-xl font-semibold text-foreground mb-4">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed mb-6">{step.description}</p>
                  
                  {/* Features */}
                  <ul className="space-y-2">
                    {step.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Connecting Arrow */}
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-6 transform -translate-y-1/2">
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who Is It For Section */}
      <section className="py-20 md:py-28 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Perfect for Every Learner
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Whether you're cramming for exams or pursuing lifelong learning
            </p>
          </div>

          {/* Persona Tabs */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {personas.map((persona, index) => (
              <button
                key={index}
                onClick={() => setActivePersona(index)}
                className={`flex items-center gap-3 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                  activePersona === index
                    ? 'bg-foreground text-background shadow-lg scale-105'
                    : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
                }`}
              >
                <persona.icon className="w-5 h-5" />
                {persona.title}
              </button>
            ))}
          </div>

          {/* Active Persona Content */}
          <div className="max-w-3xl mx-auto text-center">
            <div 
              key={activePersona}
              className="bg-card border border-border rounded-2xl p-12 animate-fade-in shadow-sm"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-foreground to-foreground/80 text-background rounded-2xl flex items-center justify-center mx-auto mb-8">
                {React.createElement(personas[activePersona].icon, { className: "w-10 h-10" })}
              </div>
              <h3 className="text-2xl font-semibold text-foreground mb-6">
                As a {personas[activePersona].title}
              </h3>
              <p className="text-xl text-muted-foreground leading-relaxed">
                {personas[activePersona].description}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Spaced Repetition Explanation */}
      <section ref={retentionRef} className="py-20 md:py-28 bg-gradient-to-br from-muted/10 via-background to-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              The Science of Smarter Learning
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Spaced repetition isn't just theory—it's proven science that StudyCards AI optimizes for your unique learning pattern
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Explanation */}
            <div className="space-y-8">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <Clock className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold text-foreground mb-3">
                      The Forgetting Curve Problem
                    </h3>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      Without reinforcement, we forget <span className="text-foreground font-medium">50% of new information within 24 hours</span> and 
                      <span className="text-foreground font-medium"> 90% within a week</span>. Traditional cramming fights against your brain's natural patterns.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold text-foreground mb-3">
                      Our Intelligent Solution
                    </h3>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      StudyCards AI automatically schedules reviews at <span className="text-foreground font-medium">optimal intervals</span> based on your performance, 
                      ensuring <span className="text-foreground font-medium">85%+ long-term retention</span> with minimal time investment.
                    </p>
                  </div>
                </div>
              </div>

              {/* Key Benefits */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h4 className="text-lg font-semibold text-foreground mb-4">Proven Results</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">85%</div>
                    <div className="text-sm text-muted-foreground">Retention Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">60%</div>
                    <div className="text-sm text-muted-foreground">Time Saved</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Animated Retention Graph */}
            <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
              <h4 className="text-xl font-semibold text-foreground mb-8 text-center">
                Memory Retention: Traditional vs. Spaced Repetition
              </h4>
              <div className="relative h-80">
                <svg viewBox="0 0 500 300" className="w-full h-full">
                  {/* Enhanced Grid */}
                  {[0, 20, 40, 60, 80, 100].map((y) => (
                    <line 
                      key={y}
                      x1="60" 
                      y1={280 - y * 2.2} 
                      x2="450" 
                      y2={280 - y * 2.2}
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
                      x1={60 + index * 97.5} 
                      y1="60"
                      x2={60 + index * 97.5}
                      y2="280"
                      stroke="currentColor"
                      strokeOpacity="0.05"
                      className="text-muted-foreground"
                    />
                  ))}
                  
                  {/* Traditional learning decay curve */}
                  <path
                    d="M 60 60 Q 120 120 180 180 Q 240 220 300 240 Q 375 255 450 265"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="3"
                    strokeOpacity="0.7"
                    strokeDasharray="4,4"
                  />
                  
                  {/* Spaced repetition curve - animated */}
                  {retentionStep >= 5 && (
                    <path
                      d="M 60 60 L 157.5 75 L 255 85 L 352.5 95 L 450 100"
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="4"
                      className="animate-fade-in"
                      style={{ 
                        strokeDasharray: '1000',
                        strokeDashoffset: retentionStep >= 5 ? '0' : '1000',
                        transition: 'stroke-dashoffset 2s ease-in-out'
                      }}
                    />
                  )}
                  
                  {/* Animated data points */}
                  {retentionData.slice(0, retentionStep + 1).map((point, index) => (
                    <g key={index} className="animate-fade-in">
                      <circle
                        cx={60 + (index < 5 ? index * 97.5 : 450)}
                        cy={index < 5 ? 280 - (point.retention * 2.2) : 280 - (85 * 2.2)}
                        r="6"
                        fill={index < 5 ? "#ef4444" : "#22c55e"}
                        stroke="white"
                        strokeWidth="2"
                      />
                      {/* Point labels */}
                      <text
                        x={60 + (index < 5 ? index * 97.5 : 450)}
                        y={index < 5 ? 280 - (point.retention * 2.2) - 15 : 280 - (85 * 2.2) - 15}
                        textAnchor="middle"
                        className="text-xs font-medium fill-foreground"
                      >
                        {index < 5 ? `${point.retention}%` : '85%'}
                      </text>
                    </g>
                  ))}
                  
                  {/* Axes */}
                  <line x1="60" y1="60" x2="60" y2="280" stroke="currentColor" strokeWidth="2" className="text-foreground" />
                  <line x1="60" y1="280" x2="450" y2="280" stroke="currentColor" strokeWidth="2" className="text-foreground" />
                  
                  {/* Axis labels */}
                  <text x="30" y="170" textAnchor="middle" className="text-sm fill-muted-foreground" transform="rotate(-90 30 170)">
                    Retention %
                  </text>
                  <text x="255" y="300" textAnchor="middle" className="text-sm fill-muted-foreground">
                    Time (Days)
                  </text>
                  
                  {/* Time labels */}
                  {['Day 0', 'Day 1', 'Week 1', 'Week 2', 'Month 1'].map((label, index) => (
                    <text 
                      key={label}
                      x={60 + index * 97.5} 
                      y="295" 
                      textAnchor="middle" 
                      className="text-xs fill-muted-foreground"
                    >
                      {label}
                    </text>
                  ))}
                </svg>
                
                {/* Enhanced Legend */}
                <div className="absolute top-4 right-4 space-y-3 bg-background/80 backdrop-blur-sm p-4 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-0.5 bg-red-500 opacity-70" style={{borderStyle: 'dashed'}}></div>
                    <span className="text-sm text-muted-foreground">Traditional Learning</span>
                  </div>
                  {retentionStep >= 5 && (
                    <div className="flex items-center gap-3 animate-fade-in">
                      <div className="w-4 h-1 bg-green-500 rounded"></div>
                      <span className="text-sm text-muted-foreground">Spaced Repetition</span>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center mt-6 bg-muted/30 p-3 rounded-lg">
                <strong className="text-foreground">StudyCards AI</strong> adapts these scientifically-proven intervals to your unique learning pattern and content difficulty
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
      <section className="py-20 md:py-28 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Loved by Learners Worldwide
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Join thousands who've transformed their study habits with AI-powered flashcards
            </p>
          </div>

          {/* University Logos */}
          <div className="flex justify-center items-center gap-8 mb-16 opacity-60">
            <div className="text-sm text-muted-foreground font-medium">Trusted by students at</div>
            <div className="flex items-center gap-6 text-muted-foreground">
              <div className="px-4 py-2 border border-border rounded-lg text-sm font-medium">MIT</div>
              <div className="px-4 py-2 border border-border rounded-lg text-sm font-medium">Stanford</div>
              <div className="px-4 py-2 border border-border rounded-lg text-sm font-medium">Harvard</div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
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
              <Card key={index} className="border-border p-8 hover:shadow-lg transition-all duration-300 bg-card">
                <CardContent className="p-0">
                  <div className="flex items-center gap-1 mb-6">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <blockquote className="text-lg text-foreground mb-6 leading-relaxed font-medium">
                    "{testimonial.quote}"
                  </blockquote>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-foreground to-foreground/80 text-background rounded-full flex items-center justify-center font-semibold">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{testimonial.name}</div>
                      <div className="text-muted-foreground text-sm">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-foreground mb-2">500+</div>
              <div className="text-muted-foreground">Active Users</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-foreground mb-2">10K+</div>
              <div className="text-muted-foreground">PDFs Processed</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-foreground mb-2">85%</div>
              <div className="text-muted-foreground">Better Retention</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-foreground mb-2">4.9★</div>
              <div className="text-muted-foreground">User Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 md:py-32 bg-gradient-to-br from-background via-muted/10 to-background relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:40px_40px]" />
        
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="space-y-8">
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground leading-tight">
              Start learning{" "}
              <span className="bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
                smarter
              </span>{" "}
              — today.
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Takes less than 60 seconds. Works with any PDF.
              <br />
              <span className="text-foreground font-medium">Transform your study habits forever.</span>
            </p>
            
            <div className="pt-8">
              <Button 
                onClick={() => setShowAuthModal(true)}
                size="lg"
                className="group relative bg-gradient-to-r from-foreground to-foreground/90 text-background hover:from-foreground/90 hover:to-foreground/80 px-12 py-6 text-xl font-semibold rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-[1.02]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-foreground to-foreground/90 rounded-2xl blur opacity-40 group-hover:opacity-60 transition-opacity" />
                <span className="relative flex items-center">
                  Start Free Trial
                  <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-2 transition-transform duration-300" />
                </span>
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="pt-8 flex flex-wrap justify-center items-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Free forever plan
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                No credit card needed
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
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