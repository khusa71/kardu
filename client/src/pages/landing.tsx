import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AuthModal } from "@/components/auth-modal";

import { 
  Brain, Download, Shield, CheckCircle, Star, ArrowRight, 
  Menu, X, Upload, Bot, Feather, Clock, 
  TrendingUp, Sparkles, Users, Zap, FileText, Play,
  BarChart3, Activity, Lightbulb, Target
} from "lucide-react";

export default function Landing() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [activeChartDemo, setActiveChartDemo] = useState('retention');
  const [animatedRetention, setAnimatedRetention] = useState(0);
  const [animatedEfficiency, setAnimatedEfficiency] = useState(0);

  const demoSteps = [
    { text: "Uploading PDF...", progress: 25 },
    { text: "AI analyzing content...", progress: 60 },
    { text: "Generating flashcards...", progress: 90 },
    { text: "Ready to study!", progress: 100 }
  ];

  const spacedRepetitionData = [
    { day: 0, interval: "Today", retention: 100, forgetting: 0 },
    { day: 1, interval: "Day 1", retention: 85, forgetting: 15 },
    { day: 3, interval: "Day 3", retention: 75, forgetting: 25 },
    { day: 7, interval: "Week 1", retention: 90, forgetting: 10 },
    { day: 14, interval: "Week 2", retention: 85, forgetting: 15 },
    { day: 30, interval: "Month 1", retention: 95, forgetting: 5 }
  ];

  const aiProcessingSteps = [
    { step: "OCR Scan", time: "0.5s", accuracy: 98 },
    { step: "Content Analysis", time: "2.1s", accuracy: 94 },
    { step: "Key Extraction", time: "1.3s", accuracy: 96 },
    { step: "Question Generation", time: "3.2s", accuracy: 92 },
    { step: "Quality Check", time: "0.8s", accuracy: 99 }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setDemoStep((prev) => (prev + 1) % demoSteps.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Animate chart values
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedRetention(200);
      setAnimatedEfficiency(95);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const retentionChartHeight = 120;
  const pathPoints = spacedRepetitionData.map((point, index) => {
    const x = (index / (spacedRepetitionData.length - 1)) * 280;
    const y = retentionChartHeight - (point.retention / 100) * retentionChartHeight;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Feather className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">StudyCards AI</span>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <nav className="flex items-center space-x-6">
                <Button variant="ghost" className="text-slate-600 hover:text-slate-900 font-medium">
                  Features
                </Button>
                <Button variant="ghost" className="text-slate-600 hover:text-slate-900 font-medium">
                  Pricing
                </Button>
              </nav>
              <Button 
                onClick={() => setShowAuthModal(true)} 
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 px-6 py-2.5 font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
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
            <div className="md:hidden mt-4 pb-4 border-t border-slate-200 pt-4">
              <div className="flex flex-col space-y-3">
                <Button variant="ghost" className="justify-start text-slate-600">Features</Button>
                <Button variant="ghost" className="justify-start text-slate-600">Pricing</Button>
                <Button 
                  onClick={() => setShowAuthModal(true)} 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white justify-center mt-3"
                >
                  Get Started
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50"></div>
        <div className="absolute top-20 right-20 w-72 h-72 bg-gradient-to-br from-blue-200/30 to-purple-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-br from-purple-200/20 to-pink-200/20 rounded-full blur-3xl"></div>
        
        <div className="relative max-w-6xl mx-auto px-6 text-center">
          <div className="space-y-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-blue-200 rounded-full text-sm font-medium text-blue-700 shadow-sm">
              <Sparkles className="w-4 h-4" />
              Beta Access Available
            </div>
            
            <div className="space-y-6">
              <h1 className="text-5xl md:text-7xl font-bold leading-tight">
                <span className="bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
                  Turn PDFs into
                </span>
                <br />
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  smart flashcards
                </span>
                <br />
                <span className="text-slate-700">in seconds</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
                Upload any document. Our AI creates optimized flashcards automatically. 
                <span className="font-semibold text-slate-800"> Study smarter with science-based spaced repetition.</span>
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              <Button 
                onClick={() => setShowAuthModal(true)}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 px-10 py-4 text-lg font-semibold shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                variant="outline"
                size="lg"
                className="px-10 py-4 text-lg border-2 border-slate-300 text-slate-700 hover:bg-white hover:border-blue-300 hover:text-blue-700 transition-all duration-300"
              >
                <Play className="w-5 h-5 mr-2" />
                Watch Demo
              </Button>
            </div>

            <div className="pt-8 flex flex-wrap justify-center gap-6 text-sm text-slate-500">
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
                Cancel anytime
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
              See the magic in action
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Transform any PDF into study-ready flashcards with our AI-powered platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {/* Main Demo Card */}
            <Card className="lg:col-span-2 md:col-span-2 p-8 bg-gradient-to-br from-blue-50 to-purple-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">AI Processing</h3>
                    <p className="text-slate-600">Live demo running</p>
                  </div>
                </div>
                
                <div className="space-y-5">
                  <div className="p-5 bg-white/70 backdrop-blur-sm rounded-2xl border-2 border-dashed border-blue-200">
                    <div className="flex items-center gap-3 mb-4">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-slate-800">biology_chapter_5.pdf</span>
                      <span className="text-sm text-slate-500">• 42 pages</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-1000 relative"
                        style={{ width: `${demoSteps[demoStep].progress}%` }}
                      >
                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 mt-3">{demoSteps[demoStep].text}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                      <div className="text-sm font-semibold text-slate-800 mb-2">Generated Card #1</div>
                      <div className="text-sm text-slate-600">"What is photosynthesis?"</div>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                      <div className="text-sm font-semibold text-slate-800 mb-2">Generated Card #2</div>
                      <div className="text-sm text-slate-600">"Define mitochondria..."</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Stats Cards */}
            <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="text-center">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <div className="text-3xl font-bold mb-2">95%</div>
                <div className="text-blue-100 font-medium">Faster creation</div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="text-center">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-7 h-7 text-white" />
                </div>
                <div className="text-3xl font-bold mb-2">200%</div>
                <div className="text-green-100 font-medium">Better retention</div>
              </div>
            </Card>

            {/* Feature Cards */}
            <Card className="lg:col-span-2 p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Spaced Repetition Timeline</h3>
              </div>
              <div className="flex justify-between items-center">
                {["Today", "Day 1", "Day 4", "Day 11", "Day 25"].map((day, index) => (
                  <div key={day} className="text-center">
                    <div className={`w-4 h-4 rounded-full mb-3 ${index === 0 ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg' : 'bg-slate-300'}`}></div>
                    <div className="text-xs font-medium text-slate-600">{day}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <div className="text-sm text-slate-600">
                  <span className="font-semibold text-purple-600">Optimal timing</span> increases retention by 200%
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-orange-500 to-red-500 text-white border-0 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="text-center">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Download className="w-7 h-7 text-white" />
                </div>
                <div className="text-lg font-bold mb-3">Export Anywhere</div>
                <div className="space-y-2">
                  <div className="text-sm text-orange-100">Anki • Quizlet • CSV</div>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-slate-600 to-slate-700 text-white border-0 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="text-center">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <div className="text-lg font-bold mb-3">Bank-Grade Security</div>
                <div className="text-sm text-slate-300">Your data is always protected</div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Trusted by students worldwide
            </h2>
            <p className="text-xl text-slate-600">Join thousands who've transformed their studying</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: "Sarah M.", role: "Medical Student, Harvard", rating: 5, quote: "Cut my study time in half while improving my grades. This is revolutionary.", avatar: "SM", color: "blue" },
              { name: "Alex R.", role: "PhD Student, MIT", rating: 5, quote: "Finally, a tool that actually understands my textbooks. Game changer.", avatar: "AR", color: "green" },
              { name: "Jordan K.", role: "Medical Resident", rating: 5, quote: "Passed my board exams thanks to the spaced repetition system.", avatar: "JK", color: "purple" }
            ].map((testimonial, index) => (
              <Card key={index} className="p-8 bg-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
                <div className="flex text-yellow-400 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-current" />
                  ))}
                </div>
                <p className="text-slate-700 mb-6 text-lg leading-relaxed italic">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center">
                  <div className={`w-12 h-12 bg-gradient-to-br from-${testimonial.color}-400 to-${testimonial.color}-600 rounded-full flex items-center justify-center mr-4 shadow-lg`}>
                    <span className="text-white font-bold">{testimonial.avatar}</span>
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{testimonial.name}</div>
                    <div className="text-slate-600">{testimonial.role}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-slate-600">
              Start free, upgrade when you need more power
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="p-10 bg-white border-2 border-slate-200 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Free</h3>
                <div className="text-5xl font-bold text-slate-900 mb-4">
                  $0<span className="text-xl font-normal text-slate-600">/month</span>
                </div>
                <p className="text-slate-600">Perfect for getting started</p>
              </div>
              
              <ul className="space-y-4 mb-10">
                {["3 PDF uploads per month", "Up to 50 pages per PDF", "Basic AI quality", "Export to all formats"].map((feature) => (
                  <li key={feature} className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-slate-700">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                onClick={() => setShowAuthModal(true)}
                className="w-full py-4 text-lg border-2 border-slate-300 text-slate-700 bg-white hover:bg-slate-50 hover:border-blue-300 transition-all duration-200"
                variant="outline"
              >
                Start Free
              </Button>
            </Card>

            <Card className="relative p-10 bg-gradient-to-br from-blue-600 to-purple-600 text-white border-0 shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-slate-900 px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                  Most Popular
                </span>
              </div>
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-2">Premium</h3>
                <div className="text-5xl font-bold mb-4">
                  $9.99<span className="text-xl font-normal text-blue-100">/month</span>
                </div>
                <p className="text-blue-100">For serious students & professionals</p>
              </div>
              
              <ul className="space-y-4 mb-10">
                {["100 PDF uploads per month", "Up to 200 pages per PDF", "Advanced AI quality", "Priority processing", "Advanced analytics"].map((feature) => (
                  <li key={feature} className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-300 mr-3 flex-shrink-0" />
                    <span className="text-blue-50">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                onClick={() => setShowAuthModal(true)}
                className="w-full py-4 text-lg bg-white text-blue-600 hover:bg-blue-50 font-bold shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Upgrade to Premium
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600">
        <div className="max-w-4xl mx-auto px-6 text-center text-white">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to revolutionize your studying?
          </h2>
          <p className="text-xl mb-10 text-blue-100">
            Join thousands of students who've transformed their learning with AI-powered flashcards
          </p>
          <Button 
            onClick={() => setShowAuthModal(true)}
            size="lg"
            className="bg-white text-blue-600 hover:bg-blue-50 px-12 py-4 text-xl font-bold shadow-2xl hover:shadow-white/25 transition-all duration-300 hover:scale-105"
          >
            Start Your Free Trial Now
            <ArrowRight className="w-6 h-6 ml-3" />
          </Button>
          <p className="text-blue-200 mt-6">
            No credit card required • 3 free PDFs every month • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg">
              <Feather className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold">StudyCards AI</span>
          </div>
          <p className="text-slate-400">
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