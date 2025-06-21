import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthModal } from "@/components/auth-modal";
import { AuthDebug } from "@/components/auth-debug";
import { Brain, FileText, Download, Zap, Shield, CheckCircle, Star, ArrowRight, Menu, X, Upload, Bot, Rocket, ChevronRight, Feather } from "lucide-react";

export default function Landing() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showAllSteps, setShowAllSteps] = useState(false);
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  const steps = [
    {
      number: "1",
      icon: Upload,
      title: "Upload a PDF",
      description: "Simply drag and drop your study material, textbook, or notes in PDF format"
    },
    {
      number: "2", 
      icon: Bot,
      title: "Generate Smart Flashcards",
      description: "Our AI analyzes your content and creates targeted flashcards automatically"
    },
    {
      number: "3",
      icon: Rocket,
      title: "Study or Export",
      description: "Study directly in the app or export to Anki, Quizlet, CSV and more"
    }
  ];

  const features = [
    {
      icon: Brain,
      title: "AI-powered flashcard generation from your real content",
      description: "Advanced AI analyzes your PDFs and creates high-quality flashcards tailored to your content and learning style"
    },
    {
      icon: Download,
      title: "Export to Anki, CSV, Quizlet & more",
      description: "Export to Anki, CSV, JSON, or Quizlet format. Compatible with all major study platforms and tools"
    },
    {
      icon: Shield,
      title: "Private & secure — no files stored permanently",
      description: "Your documents are processed securely with enterprise-grade encryption and never stored permanently"
    }
  ];

  const handleStepSpin = () => {
    setCurrentStep((prev) => (prev + 1) % steps.length);
  };

  // Custom Owl Icon Component
  const OwlIcon = ({ className }: { className?: string }) => (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
    >
      {/* Owl body */}
      <ellipse cx="12" cy="16" rx="6" ry="7" />
      {/* Owl eyes */}
      <circle cx="9" cy="11" r="2" />
      <circle cx="15" cy="11" r="2" />
      {/* Eye pupils */}
      <circle cx="9" cy="11" r="0.5" fill="currentColor" />
      <circle cx="15" cy="11" r="0.5" fill="currentColor" />
      {/* Beak */}
      <path d="M12 13 L11 15 L13 15 Z" fill="currentColor" />
      {/* Ear tufts */}
      <path d="M7 7 L8 9 L9 7" />
      <path d="M15 7 L16 9 L17 7" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-background dark:bg-background">
      {/* Debug Panel - Temporary for OAuth troubleshooting */}
      <div className="bg-yellow-50 p-4 border-b">
        <AuthDebug />
      </div>
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 dark:bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container-section py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <button 
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <div className="bg-primary text-primary-foreground rounded-xl p-2.5">
                <Feather className="w-6 h-6" />
              </div>
              <span className="text-xl font-bold text-foreground">Kardu.io</span>
            </button>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <nav className="flex items-center space-x-6">
                <Button 
                  variant="ghost" 
                  className="text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Features
                </Button>
                <Button 
                  variant="ghost" 
                  className="text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                  onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                >
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
                <Button 
                  variant="ghost" 
                  className="justify-start text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                  onClick={() => {
                    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                    setMobileMenuOpen(false);
                  }}
                >
                  Features
                </Button>
                <Button 
                  variant="ghost" 
                  className="justify-start text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                  onClick={() => {
                    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
                    setMobileMenuOpen(false);
                  }}
                >
                  Pricing
                </Button>
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

      {/* Beta Badge */}
      <div className="bg-primary/10 border-primary/20 border-b text-center py-3">
        <p className="text-sm text-primary font-medium">
          🚀 In Beta – Help shape the future of learning with AI flashcards
        </p>
      </div>

      {/* Hero Section */}
      <main className="bg-background">
        <section className="container-content py-16 md:py-24 lg:py-32 text-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-hero text-foreground">
                Turn Any PDF Into AI-Powered Flashcards —
                <span className="block text-primary"> in Seconds</span>
              </h1>
              <p className="text-body-lg text-muted-foreground max-w-2xl mx-auto">
                We're in beta — but already helping early users study smarter and save time.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button 
                onClick={() => setShowAuthModal(true)}
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 text-lg font-semibold rounded-xl min-w-[200px]"
              >
                Try Free Beta
              </Button>
              <Button 
                variant="outline"
                size="lg"
                className="px-8 py-3 text-lg font-medium rounded-xl min-w-[180px] border-border hover:bg-muted"
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              >
                See How It Works
              </Button>
            </div>

            <div className="pt-8">
              <p className="text-sm text-muted-foreground">
                3 free PDFs every month — no credit card required
              </p>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-16 md:py-24 bg-background">
          <div className="container-section">
            <div className="text-center mb-16">
              <h2 className="text-section text-foreground mb-4">
                How It Works
              </h2>
              <p className="text-body-lg text-muted-foreground max-w-2xl mx-auto">
                Three simple steps to transform your PDFs into smart flashcards
              </p>
            </div>

            {/* Mobile Slot Machine Spinner */}
            <div className="md:hidden">
              {!showAllSteps ? (
                <div className="max-w-sm mx-auto">
                  <Card 
                    className="p-6 border-border hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:scale-105 active:scale-95"
                    onClick={handleStepSpin}
                  >
                    <CardContent className="p-0 text-center">
                      <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-colors">
                        {currentStep === 0 && <Upload className="w-8 h-8 text-primary" />}
                        {currentStep === 1 && <Bot className="w-8 h-8 text-primary" />}
                        {currentStep === 2 && <Rocket className="w-8 h-8 text-primary" />}
                      </div>
                      <div className="text-3xl font-bold text-primary mb-2">
                        {steps[currentStep].number}
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-4">
                        {steps[currentStep].title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed mb-6">
                        {steps[currentStep].description}
                      </p>
                      <div className="flex justify-center space-x-2 mb-4">
                        {steps.map((_, index) => (
                          <div
                            key={index}
                            className={`w-2 h-2 rounded-full transition-colors ${
                              index === currentStep ? 'bg-primary' : 'bg-muted'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">Tap to see next step</p>
                    </CardContent>
                  </Card>
                  
                  <div className="text-center mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setShowAllSteps(true)}
                      className="px-6 py-2"
                    >
                      Show All Steps
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {steps.map((step, index) => (
                    <Card key={index} className="p-6 border-border">
                      <CardContent className="p-0 text-center">
                        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          {index === 0 && <Upload className="w-6 h-6 text-primary" />}
                          {index === 1 && <Bot className="w-6 h-6 text-primary" />}
                          {index === 2 && <Rocket className="w-6 h-6 text-primary" />}
                        </div>
                        <div className="text-2xl font-bold text-primary mb-2">{step.number}</div>
                        <h3 className="text-lg font-semibold text-foreground mb-3">{step.title}</h3>
                        <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                  <div className="text-center">
                    <Button
                      variant="ghost"
                      onClick={() => setShowAllSteps(false)}
                      className="px-6 py-2"
                    >
                      Show Interactive Steps
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Desktop Horizontal Layout */}
            <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
              {steps.map((step, index) => (
                <div key={index} className="text-center group">
                  <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors">
                    {index === 0 && <Upload className="w-8 h-8 text-primary" />}
                    {index === 1 && <Bot className="w-8 h-8 text-primary" />}
                    {index === 2 && <Rocket className="w-8 h-8 text-primary" />}
                  </div>
                  <div className="text-2xl font-bold text-primary mb-2">{step.number}</div>
                  <h3 className="text-xl font-semibold text-foreground mb-4">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 md:py-24 bg-muted/30">
          <div className="container-section">
            <div className="text-center mb-16">
              <h2 className="text-section text-foreground mb-4">
                Everything You Need
              </h2>
              <p className="text-body-lg text-muted-foreground max-w-2xl mx-auto">
                Powerful features designed to transform how you create and study with flashcards
              </p>
            </div>

            {/* Mobile and Small Screens - Progressive Disclosure */}
            <div className="md:hidden">
              <div className="grid grid-cols-1 gap-6 max-w-md mx-auto">
                {features.slice(0, showAllFeatures ? features.length : 2).map((feature, index) => (
                  <Card 
                    key={index} 
                    className="p-6 border-border hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:scale-105 active:scale-95"
                    onClick={() => {/* Add tap scale animation */}}
                  >
                    <CardContent className="p-0 text-center">
                      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors hover:bg-primary/20">
                        {index === 0 && <Brain className="w-8 h-8 text-primary transition-transform hover:scale-110" />}
                        {index === 1 && <Download className="w-8 h-8 text-primary transition-transform hover:scale-110" />}
                        {index === 2 && <Shield className="w-8 h-8 text-primary transition-transform hover:scale-110" />}
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-3">{feature.title}</h3>
                      <p className="text-muted-foreground leading-relaxed text-sm">{feature.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {!showAllFeatures && (
                <div className="text-center mt-8">
                  <Button
                    variant="outline"
                    onClick={() => setShowAllFeatures(true)}
                    className="px-6 py-2"
                  >
                    See All Features
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>

            {/* Tablet and Desktop - 2-Column Grid (switches to 1-column on <375px) */}
            <div className="hidden md:block">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
                {features.map((feature, index) => (
                  <div key={index} className="text-center group">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors">
                      {index === 0 && <Brain className="w-8 h-8 text-primary transition-transform group-hover:scale-110" />}
                      {index === 1 && <Download className="w-8 h-8 text-primary transition-transform group-hover:scale-110" />}
                      {index === 2 && <Shield className="w-8 h-8 text-primary transition-transform group-hover:scale-110" />}
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-4">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container-section">
            <div className="text-center mb-16">
              <h2 className="text-section text-foreground mb-4">
                What Our Early Users Say
              </h2>
              <p className="text-body-lg text-muted-foreground max-w-2xl mx-auto">
                Used by early learners in our beta who gave us a 4.7/5 average rating.
              </p>
            </div>

            {/* Mobile/Tablet: Staggered Layout */}
            <div className="lg:hidden max-w-4xl mx-auto space-y-6">
              {/* First testimonial - 90% width */}
              <div className="w-[90%] mx-auto">
                <Card className="p-6 border-border hover:shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95">
                  <CardContent className="p-0">
                    <div className="flex items-center mb-4">
                      <div className="flex text-yellow-400">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-current" />
                        ))}
                      </div>
                    </div>
                    <p className="text-muted-foreground mb-4 italic text-base leading-relaxed">
                      "This beta tool saved me hours of manual flashcard creation. The AI really understands the content."
                    </p>
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm font-medium text-primary">SM</span>
                      </div>
                      <div className="text-sm">
                        <p className="font-medium text-foreground">Sarah M.</p>
                        <p className="text-muted-foreground">Medical Student</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Second testimonial - 85% width, offset right */}
              <div className="w-[85%] ml-auto">
                <Card className="p-6 border-border hover:shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95">
                  <CardContent className="p-0">
                    <div className="flex items-center mb-4">
                      <div className="flex text-yellow-400">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-current" />
                        ))}
                      </div>
                    </div>
                    <p className="text-muted-foreground mb-4 italic text-base leading-relaxed">
                      "Perfect for studying complex textbooks. The export to Anki feature is exactly what I needed."
                    </p>
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm font-medium text-primary">AR</span>
                      </div>
                      <div className="text-sm">
                        <p className="font-medium text-foreground">Alex R.</p>
                        <p className="text-muted-foreground">Graduate Student</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Third testimonial - 90% width, offset left */}
              <div className="w-[90%] mr-auto">
                <Card className="p-6 border-border hover:shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95">
                  <CardContent className="p-0">
                    <div className="flex items-center mb-4">
                      <div className="flex text-yellow-400">
                        {[...Array(4)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-current" />
                        ))}
                        <Star className="w-4 h-4 text-gray-300" />
                      </div>
                    </div>
                    <p className="text-muted-foreground mb-4 italic text-base leading-relaxed">
                      "Great potential! Looking forward to more features as the beta progresses."
                    </p>
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm font-medium text-primary">JK</span>
                      </div>
                      <div className="text-sm">
                        <p className="font-medium text-foreground">Jordan K.</p>
                        <p className="text-muted-foreground">Professional Learner</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Desktop: Traditional Grid Layout */}
            <div className="hidden lg:block">
              <div className="grid grid-cols-3 gap-8 max-w-6xl mx-auto">
                <Card className="p-6 border-border hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                  <CardContent className="p-0">
                    <div className="flex items-center mb-4">
                      <div className="flex text-yellow-400">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-current" />
                        ))}
                      </div>
                    </div>
                    <p className="text-muted-foreground mb-4 italic">
                      "This beta tool saved me hours of manual flashcard creation. The AI really understands the content."
                    </p>
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mr-2">
                        <span className="text-xs font-medium text-primary">SM</span>
                      </div>
                      <div className="text-sm">
                        <p className="font-medium text-foreground">Sarah M.</p>
                        <p className="text-muted-foreground">Medical Student</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="p-6 border-border hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                  <CardContent className="p-0">
                    <div className="flex items-center mb-4">
                      <div className="flex text-yellow-400">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-current" />
                        ))}
                      </div>
                    </div>
                    <p className="text-muted-foreground mb-4 italic">
                      "Perfect for studying complex textbooks. The export to Anki feature is exactly what I needed."
                    </p>
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mr-2">
                        <span className="text-xs font-medium text-primary">AR</span>
                      </div>
                      <div className="text-sm">
                        <p className="font-medium text-foreground">Alex R.</p>
                        <p className="text-muted-foreground">Graduate Student</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="p-6 border-border hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                  <CardContent className="p-0">
                    <div className="flex items-center mb-4">
                      <div className="flex text-yellow-400">
                        {[...Array(4)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-current" />
                        ))}
                        <Star className="w-4 h-4 text-gray-300" />
                      </div>
                    </div>
                    <p className="text-muted-foreground mb-4 italic">
                      "Great potential! Looking forward to more features as the beta progresses."
                    </p>
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mr-2">
                        <span className="text-xs font-medium text-primary">JK</span>
                      </div>
                      <div className="text-sm">
                        <p className="font-medium text-foreground">Jordan K.</p>
                        <p className="text-muted-foreground">Professional Learner</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-16 md:py-24 bg-background">
          <div className="container-content">
            <div className="text-center mb-16">
              <h2 className="text-section text-foreground mb-4">
                Simple, transparent pricing
              </h2>
              <p className="text-body-lg text-muted-foreground">
                Start free, upgrade when you need more
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Free Plan */}
              <Card className="relative p-8 border-border hover:shadow-lg transition-shadow">
                <CardHeader className="p-0 pb-6">
                  <CardTitle className="text-2xl font-bold text-foreground">Free</CardTitle>
                  <CardDescription className="text-muted-foreground mt-2">
                    3 free PDFs every month — no credit card required
                  </CardDescription>
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
                      <span className="text-foreground">Basic AI flashcard generation</span>
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
                  <Button 
                    className="w-full" 
                    variant="outline" 
                    onClick={() => setShowAuthModal(true)}
                    size="lg"
                  >
                    Get Started Free
                  </Button>
                </CardContent>
              </Card>

              {/* Premium Plan */}
              <Card className="relative p-8 border-2 border-primary hover:shadow-lg transition-shadow">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium">
                    Most Popular
                  </div>
                </div>
                <CardHeader className="p-0 pb-6">
                  <CardTitle className="text-2xl font-bold text-foreground">Premium</CardTitle>
                  <CardDescription className="text-muted-foreground mt-2">
                    Ready for more? Unlock advanced AI and more uploads
                  </CardDescription>
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
                  <Button 
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90" 
                    onClick={() => setShowAuthModal(true)}
                    size="lg"
                  >
                    Start Premium Trial
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container-content text-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-section text-foreground">
                  Ready to transform your learning?
                </h2>
                <p className="text-body-lg text-muted-foreground max-w-2xl mx-auto">
                  Join thousands of students and professionals who are already studying smarter with AI-generated flashcards
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button 
                  onClick={() => setShowAuthModal(true)}
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 text-lg font-semibold rounded-xl min-w-[220px]"
                >
                  Get Started Now - Free
                </Button>
                <p className="text-sm text-muted-foreground">
                  No credit card required
                </p>
              </div>
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

      {/* Authentication Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}