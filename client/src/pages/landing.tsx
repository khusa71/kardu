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
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [sparklePositions, setSparklePositions] = useState<Array<{x: number, y: number, id: number}>>([]);
  const [spacedRepetitionData, setSpacedRepetitionData] = useState([
    { day: "Today", active: true },
    { day: "Day 1", active: false },
    { day: "Day 4", active: false },
    { day: "Day 11", active: false },
    { day: "Day 25", active: false },
    { day: "Day 55", active: false }
  ]);

  const demoSteps = [
    { text: "Upload PDF", progress: 20 },
    { text: "AI Analysis", progress: 50 },
    { text: "Generating Cards", progress: 80 },
    { text: "Ready to Study!", progress: 100 }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setDemoStep((prev) => (prev + 1) % demoSteps.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Generate sparkle positions
    const generateSparkles = () => {
      const newSparkles = Array.from({ length: 8 }, (_, i) => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        id: i
      }));
      setSparklePositions(newSparkles);
    };

    generateSparkles();
    const sparkleInterval = setInterval(generateSparkles, 3000);
    return () => clearInterval(sparkleInterval);
  }, []);

  const handleSpacedRepetitionDemo = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    // Animate through spaced repetition steps
    spacedRepetitionData.forEach((_, index) => {
      setTimeout(() => {
        setSpacedRepetitionData(prev => 
          prev.map((item, i) => ({ ...item, active: i <= index }))
        );
      }, index * 600);
    });
    
    setTimeout(() => {
      setSpacedRepetitionData([
        { day: "Today", active: true },
        { day: "Day 1", active: false },
        { day: "Day 4", active: false },
        { day: "Day 11", active: false },
        { day: "Day 25", active: false },
        { day: "Day 55", active: false }
      ]);
      setIsAnimating(false);
    }, 3000);
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
      <section className="relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/10">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-full blur-3xl opacity-60"></div>
          
          {/* Floating Sparkles */}
          {sparklePositions.map((sparkle) => (
            <div
              key={sparkle.id}
              className="absolute w-1 h-1 bg-primary/60 rounded-full animate-pulse"
              style={{
                left: `${sparkle.x}%`,
                top: `${sparkle.y}%`,
                animationDelay: `${sparkle.id * 0.5}s`,
                animationDuration: '3s'
              }}
            >
              <div className="absolute inset-0 bg-primary/40 rounded-full animate-ping"></div>
            </div>
          ))}
        </div>
        
        <div className="relative container mx-auto px-6 py-24 md:py-40">
          <div className="max-w-5xl mx-auto text-center space-y-10">
            {/* Animated Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary/10 to-primary/20 border border-primary/30 rounded-full text-sm font-medium text-primary hover:scale-105 transition-transform duration-300 cursor-pointer">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>Beta Access Available</span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            
            {/* Enhanced Headline */}
            <div className="space-y-6">
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-none">
                <span className="block">PDF to</span>
                <span className="bg-gradient-to-r from-primary via-primary to-primary/60 bg-clip-text text-transparent relative">
                  Smart Flashcards
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/10 blur-2xl -z-10 opacity-50"></div>
                </span>
                <span className="block text-muted-foreground">in Seconds</span>
              </h1>
              
              <p className="text-xl md:text-2xl lg:text-3xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
                AI transforms your study materials into{" "}
                <span className="text-foreground font-semibold bg-gradient-to-r from-primary/10 to-transparent px-2 rounded">
                  scientifically optimized
                </span>{" "}
                flashcards. Study smarter, not harder.
              </p>
            </div>
            
            {/* Enhanced CTAs */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-10">
              <Button 
                onClick={() => setShowAuthModal(true)}
                size="lg"
                className="group relative bg-primary text-primary-foreground hover:bg-primary/90 px-10 py-5 text-xl font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                <span className="relative flex items-center">
                  Start Free Trial
                  <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-2 transition-transform duration-300" />
                </span>
              </Button>
              
              <Button 
                variant="outline"
                size="lg"
                className="group px-10 py-5 text-xl font-semibold rounded-2xl border-2 border-border hover:border-primary/30 hover:bg-primary/5 backdrop-blur-sm transition-all duration-500"
              >
                <span className="flex items-center">
                  Watch Demo
                  <div className="w-3 h-3 bg-red-500 rounded-full ml-3 animate-pulse group-hover:animate-none"></div>
                </span>
              </Button>
            </div>

            {/* Enhanced Social Proof */}
            <div className="pt-16 space-y-6">
              <div className="flex justify-center items-center gap-3 text-base text-muted-foreground">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full border-2 border-background flex items-center justify-center text-xs font-bold text-white">S</div>
                  <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full border-2 border-background flex items-center justify-center text-xs font-bold text-white">A</div>
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full border-2 border-background flex items-center justify-center text-xs font-bold text-white">J</div>
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full border-2 border-background flex items-center justify-center text-xs font-bold text-white">+</div>
                </div>
                <span>Join 500+ students from Harvard, MIT & Stanford</span>
              </div>
              
              <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 bg-muted/20 px-4 py-2 rounded-full">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2 bg-muted/20 px-4 py-2 rounded-full">
                  <Timer className="w-4 h-4 text-blue-500" />
                  <span>3 free PDFs every month</span>
                </div>
                <div className="flex items-center gap-2 bg-muted/20 px-4 py-2 rounded-full">
                  <Shield className="w-4 h-4 text-purple-500" />
                  <span>Cancel anytime</span>
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
            <Card className="md:col-span-2 lg:col-span-2 md:row-span-2 p-8 bg-gradient-to-br from-background to-muted/10 border border-border/50 hover:border-primary/30 hover:shadow-2xl transition-all duration-700 group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              
              <div className="relative h-full flex flex-col">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl flex items-center justify-center border border-primary/30">
                      <Bot className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground">Live AI Processing</h3>
                      <p className="text-sm text-muted-foreground">Watch PDF transform into flashcards</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-green-600">Live Demo</span>
                  </div>
                </div>
                
                <div className="flex-1 space-y-8">
                  {/* Upload Area */}
                  <div className="relative p-6 bg-gradient-to-br from-muted/20 to-muted/5 rounded-2xl border-2 border-dashed border-primary/30 group-hover:border-primary/50 transition-colors duration-500">
                    <div className="absolute top-3 right-3">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{Math.floor(demoStep * 2.5)}s</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <span className="font-semibold text-foreground">biology_chapter_5.pdf</span>
                        <div className="text-xs text-muted-foreground">42 pages • 2.3 MB</div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{demoSteps[demoStep].text}</span>
                        <span className="text-sm font-bold text-primary">{demoSteps[demoStep].progress}%</span>
                      </div>
                      <div className="w-full bg-muted/50 rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-primary to-primary/80 h-3 rounded-full transition-all duration-1000 relative"
                          style={{ width: `${demoSteps[demoStep].progress}%` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Generated Cards Preview */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="group/card p-5 bg-gradient-to-br from-background to-muted/20 border border-border rounded-xl hover:border-primary/30 hover:shadow-lg transition-all duration-300">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-semibold text-foreground">Card #1</div>
                        <div className="w-6 h-6 bg-green-500/10 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-foreground">What is photosynthesis?</div>
                        <div className="text-xs text-muted-foreground">The process by which plants convert light energy...</div>
                      </div>
                    </div>
                    
                    <div className="group/card p-5 bg-gradient-to-br from-background to-muted/20 border border-border rounded-xl hover:border-primary/30 hover:shadow-lg transition-all duration-300">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-semibold text-foreground">Card #2</div>
                        <div className="w-6 h-6 bg-green-500/10 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-foreground">Define mitochondria</div>
                        <div className="text-xs text-muted-foreground">The powerhouse of the cell, responsible for...</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Enhanced Stats Cards */}
            <Card className="relative p-6 bg-gradient-to-br from-blue-50/50 to-blue-100/50 dark:from-blue-950/10 dark:to-blue-900/10 border border-blue-200/50 dark:border-blue-800/50 hover:shadow-xl hover:scale-105 transition-all duration-500 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500/15 to-blue-600/25 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-400/20 group-hover:border-blue-400/40 transition-colors duration-300">
                  <Zap className="w-7 h-7 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="text-4xl font-bold bg-gradient-to-br from-blue-700 to-blue-600 dark:from-blue-400 dark:to-blue-300 bg-clip-text text-transparent mb-2">95%</div>
                <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">Faster than manual</div>
                <div className="text-xs text-blue-500/70 mt-1">Average time saved</div>
              </div>
            </Card>

            <Card className="relative p-6 bg-gradient-to-br from-green-50/50 to-green-100/50 dark:from-green-950/10 dark:to-green-900/10 border border-green-200/50 dark:border-green-800/50 hover:shadow-xl hover:scale-105 transition-all duration-500 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-green-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500/15 to-green-600/25 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-green-400/20 group-hover:border-green-400/40 transition-colors duration-300">
                  <TrendingUp className="w-7 h-7 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="text-4xl font-bold bg-gradient-to-br from-green-700 to-green-600 dark:from-green-400 dark:to-green-300 bg-clip-text text-transparent mb-2">200%</div>
                <div className="text-sm font-semibold text-green-600 dark:text-green-400">Better retention</div>
                <div className="text-xs text-green-500/70 mt-1">Spaced repetition boost</div>
              </div>
            </Card>

            {/* Enhanced Spaced Repetition Card */}
            <Card className="md:col-span-1 lg:col-span-2 p-6 bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/10 dark:to-pink-950/10 border border-purple-200/50 dark:border-purple-800/50 hover:shadow-xl hover:border-purple-300/70 transition-all duration-500 group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500/15 to-pink-500/15 rounded-xl flex items-center justify-center border border-purple-400/20">
                      <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">Spaced Repetition</h3>
                      <p className="text-xs text-muted-foreground">Science-based learning intervals</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSpacedRepetitionDemo}
                    className="text-xs bg-purple-500/5 border-purple-400/30 hover:bg-purple-500/10 hover:border-purple-400/50 transition-all duration-300"
                  >
                    <RotateCcw className="w-3 h-3 mr-1.5" />
                    Demo
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    {spacedRepetitionData.map((item, index) => (
                      <div key={index} className="text-center flex-1">
                        <div className="relative mb-3">
                          <div className={`w-4 h-4 rounded-full mx-auto transition-all duration-500 ${
                            item.active 
                              ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30' 
                              : 'bg-muted border-2 border-muted-foreground/20'
                          }`}>
                            {item.active && (
                              <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full animate-ping opacity-75"></div>
                            )}
                          </div>
                          {index < spacedRepetitionData.length - 1 && (
                            <div className="absolute top-2 left-[calc(50%+8px)] w-[calc(100%-16px)] h-0.5 bg-gradient-to-r from-purple-300/50 to-transparent"></div>
                          )}
                        </div>
                        <div className={`text-xs font-medium transition-colors duration-300 ${
                          item.active ? 'text-purple-700 dark:text-purple-400' : 'text-muted-foreground'
                        }`}>
                          {item.day}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="text-center pt-2">
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium text-purple-600 dark:text-purple-400">Optimal timing</span> increases retention by 200%
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Enhanced Export Card */}
            <Card className="relative p-6 bg-gradient-to-br from-orange-50/50 to-red-50/50 dark:from-orange-950/10 dark:to-red-950/10 border border-orange-200/50 dark:border-orange-800/50 hover:shadow-xl hover:scale-105 transition-all duration-500 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500/15 to-red-500/25 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-orange-400/20 group-hover:border-orange-400/40 transition-colors duration-300">
                  <Download className="w-7 h-7 text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-bold text-foreground">Universal Export</div>
                  <div className="flex flex-wrap justify-center gap-1 text-xs">
                    <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded-full font-medium">Anki</span>
                    <span className="px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-full font-medium">Quizlet</span>
                    <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded-full font-medium">CSV</span>
                  </div>
                  <div className="text-xs text-muted-foreground">Use any platform</div>
                </div>
              </div>
            </Card>

            {/* Enhanced Security Card */}
            <Card className="relative p-6 bg-gradient-to-br from-slate-50/50 to-gray-100/50 dark:from-slate-950/10 dark:to-gray-900/10 border border-slate-200/50 dark:border-slate-800/50 hover:shadow-xl hover:scale-105 transition-all duration-500 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 to-gray-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-slate-500/15 to-gray-500/25 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-400/20 group-hover:border-slate-400/40 transition-colors duration-300">
                  <Shield className="w-7 h-7 text-slate-600 dark:text-slate-400 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-bold text-foreground">Bank-Grade Security</div>
                  <div className="flex justify-center">
                    <div className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">256-bit SSL</div>
                  </div>
                  <div className="text-xs text-muted-foreground">Private & encrypted</div>
                </div>
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