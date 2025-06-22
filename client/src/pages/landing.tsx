import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AuthModal } from "@/components/auth-modal";

import { 
  Brain, Download, Shield, CheckCircle, Star, ArrowRight, 
  Menu, X, Upload, Bot, Feather, Clock, 
  TrendingUp, Sparkles, Users, Zap, FileText
} from "lucide-react";

export default function Landing() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoStep, setDemoStep] = useState(0);

  const demoSteps = [
    { text: "Uploading PDF...", progress: 25 },
    { text: "Analyzing content...", progress: 60 },
    { text: "Generating flashcards...", progress: 90 },
    { text: "Ready to study!", progress: 100 }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setDemoStep((prev) => (prev + 1) % demoSteps.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white dark:bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-black dark:bg-gray-900 rounded-lg flex items-center justify-center">
                <Feather className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-semibold text-gray-900 dark:text-gray-800">StudyCards AI</span>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <nav className="flex items-center space-x-6">
                <Button variant="ghost" className="text-sm text-gray-600 hover:text-gray-900">
                  Features
                </Button>
                <Button variant="ghost" className="text-sm text-gray-600 hover:text-gray-900">
                  Pricing
                </Button>
              </nav>
              <Button 
                onClick={() => setShowAuthModal(true)} 
                className="bg-black text-white hover:bg-gray-800 px-4 py-2 text-sm font-medium"
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
            <div className="md:hidden mt-4 pb-4 border-t border-gray-200 pt-4">
              <div className="flex flex-col space-y-3">
                <Button variant="ghost" className="justify-start text-gray-600">Features</Button>
                <Button variant="ghost" className="justify-start text-gray-600">Pricing</Button>
                <Button 
                  onClick={() => setShowAuthModal(true)} 
                  className="bg-black text-white hover:bg-gray-800 justify-center mt-3"
                >
                  Get Started
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-200 rounded-full text-sm text-gray-700">
              <Sparkles className="w-3 h-3" />
              Beta Access Available
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-gray-800 leading-tight">
              Turn PDFs into smart flashcards in seconds
            </h1>
            
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Upload any document. Our AI creates optimized flashcards automatically. 
              Study smarter with spaced repetition.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
              <Button 
                onClick={() => setShowAuthModal(true)}
                size="lg"
                className="bg-black text-white hover:bg-gray-800 px-8 py-3 text-lg font-medium"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                variant="outline"
                size="lg"
                className="px-8 py-3 text-lg border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Watch Demo
              </Button>
            </div>

            <div className="pt-8 text-sm text-gray-500">
              No credit card required • 3 free PDFs monthly • Cancel anytime
            </div>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-16 bg-gray-50 dark:bg-gray-100">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              See how it works
            </h2>
            <p className="text-xl text-gray-600">
              Transform any PDF into study-ready flashcards
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Main Demo Card */}
            <Card className="lg:col-span-2 md:col-span-2 p-6 bg-white border border-gray-200">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Bot className="w-5 h-5 text-gray-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">AI Processing</h3>
                    <p className="text-sm text-gray-600">Live demo</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <div className="flex items-center gap-3 mb-3">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium">biology_chapter_5.pdf</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-black h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${demoSteps[demoStep].progress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{demoSteps[demoStep].text}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-white border border-gray-200 rounded-lg">
                      <div className="text-sm font-medium mb-1">Card 1</div>
                      <div className="text-xs text-gray-600">What is photosynthesis?</div>
                    </div>
                    <div className="p-3 bg-white border border-gray-200 rounded-lg">
                      <div className="text-sm font-medium mb-1">Card 2</div>
                      <div className="text-xs text-gray-600">Define mitochondria...</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Stats Cards */}
            <Card className="p-6 bg-white border border-gray-200 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">95%</div>
              <div className="text-sm text-gray-600">Faster creation</div>
            </Card>

            <Card className="p-6 bg-white border border-gray-200 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">200%</div>
              <div className="text-sm text-gray-600">Better retention</div>
            </Card>

            {/* Features */}
            <Card className="lg:col-span-2 p-6 bg-white border border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <Brain className="w-5 h-5 text-gray-700" />
                <h3 className="font-semibold text-gray-900">Spaced Repetition</h3>
              </div>
              <div className="flex justify-between items-center">
                <div className="text-center">
                  <div className="w-3 h-3 bg-black rounded-full mb-2"></div>
                  <div className="text-xs text-gray-600">Today</div>
                </div>
                <div className="text-center">
                  <div className="w-3 h-3 bg-gray-300 rounded-full mb-2"></div>
                  <div className="text-xs text-gray-600">Day 1</div>
                </div>
                <div className="text-center">
                  <div className="w-3 h-3 bg-gray-300 rounded-full mb-2"></div>
                  <div className="text-xs text-gray-600">Day 4</div>
                </div>
                <div className="text-center">
                  <div className="w-3 h-3 bg-gray-300 rounded-full mb-2"></div>
                  <div className="text-xs text-gray-600">Day 11</div>
                </div>
                <div className="text-center">
                  <div className="w-3 h-3 bg-gray-300 rounded-full mb-2"></div>
                  <div className="text-xs text-gray-600">Day 25</div>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white border border-gray-200 text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Download className="w-6 h-6 text-orange-600" />
              </div>
              <div className="text-sm font-semibold mb-2">Export Formats</div>
              <div className="text-xs text-gray-600">Anki • Quizlet • CSV</div>
            </Card>

            <Card className="p-6 bg-white border border-gray-200 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-gray-600" />
              </div>
              <div className="text-sm font-semibold mb-2">Secure & Private</div>
              <div className="text-xs text-gray-600">Your data protected</div>
            </Card>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Trusted by students worldwide
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-6 bg-white border border-gray-200">
              <div className="flex text-yellow-400 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 mb-4">
                "Cut my study time in half while improving my grades. This is revolutionary."
              </p>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-sm font-medium text-blue-700">SM</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Sarah M.</div>
                  <div className="text-sm text-gray-600">Medical Student</div>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white border border-gray-200">
              <div className="flex text-yellow-400 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 mb-4">
                "Finally, a tool that actually understands my textbooks. Game changer."
              </p>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-sm font-medium text-green-700">AR</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Alex R.</div>
                  <div className="text-sm text-gray-600">PhD Student</div>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white border border-gray-200">
              <div className="flex text-yellow-400 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 mb-4">
                "Passed my board exams thanks to the spaced repetition system."
              </p>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-sm font-medium text-purple-700">JK</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Jordan K.</div>
                  <div className="text-sm text-gray-600">Medical Resident</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 bg-gray-50 dark:bg-gray-100">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Simple pricing
            </h2>
            <p className="text-xl text-gray-600">
              Start free, upgrade when you need more
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="p-8 bg-white border border-gray-200">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Free</h3>
                <div className="text-3xl font-bold text-gray-900 mb-4">
                  $0<span className="text-lg font-normal text-gray-600">/month</span>
                </div>
                <p className="text-gray-600">Perfect for getting started</p>
              </div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>3 PDF uploads per month</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Up to 50 pages per PDF</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Basic AI quality</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Export to all formats</span>
                </li>
              </ul>
              
              <Button 
                onClick={() => setShowAuthModal(true)}
                className="w-full border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                variant="outline"
              >
                Start Free
              </Button>
            </Card>

            <Card className="p-8 bg-white border-2 border-black relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-black text-white px-3 py-1 rounded-full text-sm font-medium">
                  Popular
                </span>
              </div>
              
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Premium</h3>
                <div className="text-3xl font-bold text-gray-900 mb-4">
                  $9.99<span className="text-lg font-normal text-gray-600">/month</span>
                </div>
                <p className="text-gray-600">For serious students</p>
              </div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>100 PDF uploads per month</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Up to 200 pages per PDF</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Advanced AI quality</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Priority processing</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Advanced analytics</span>
                </li>
              </ul>
              
              <Button 
                onClick={() => setShowAuthModal(true)}
                className="w-full bg-black text-white hover:bg-gray-800"
              >
                Upgrade to Premium
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Ready to study smarter?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Transform your PDFs into intelligent flashcards today
          </p>
          <Button 
            onClick={() => setShowAuthModal(true)}
            size="lg"
            className="bg-black text-white hover:bg-gray-800 px-8 py-3 text-lg font-medium"
          >
            Start Your Free Trial
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <p className="text-sm text-gray-500 mt-4">
            No credit card required • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-gray-200 bg-white dark:bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-6 h-6 bg-black rounded-lg flex items-center justify-center">
              <Feather className="w-3 h-3 text-white" />
            </div>
            <span className="text-lg font-semibold text-gray-900">StudyCards AI</span>
          </div>
          <p className="text-sm text-gray-600">
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