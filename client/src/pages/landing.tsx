import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthModal } from "@/components/auth-modal";
import { Brain, FileText, Download, Zap, Shield, CheckCircle, Star, ArrowRight } from "lucide-react";

export default function Landing() {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 text-white rounded-lg p-2">
                <Brain className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kardu.io</h1>
            </div>
            <div className="flex items-center space-x-6">
              <Button 
                variant="ghost" 
                className="text-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Features
              </Button>
              <Button 
                variant="ghost" 
                className="text-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Pricing
              </Button>
              <Button 
                onClick={() => setShowAuthModal(true)} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 text-lg font-bold rounded-full"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="mb-6 text-5xl font-medium leading-tight text-gray-900 dark:text-white lg:text-7xl">
            Your personal AI tutor. For flashcards.
          </h1>
          <p className="mx-auto mb-12 max-w-2xl text-xl leading-relaxed text-gray-600 dark:text-gray-300 lg:text-2xl">
            Transform any PDF into smart flashcards with AI. Study smarter, learn faster, remember more.
          </p>
          <div className="mb-16">
            <Button 
              onClick={() => setShowAuthModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8 py-3 font-medium text-lg"
            >
              Get Started Free
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Brain className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">AI-Powered Generation</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Advanced AI analyzes your PDFs and creates high-quality flashcards tailored to your content
              </p>
            </div>

            <div className="text-center p-8">
              <div className="w-16 h-16 bg-green-50 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Multiple Export Formats</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Export to Anki, CSV, JSON, or Quizlet format. Compatible with all major study platforms
              </p>
            </div>

            <div className="text-center p-8">
              <div className="w-16 h-16 bg-purple-50 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Secure & Private</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Your documents are processed securely and never stored permanently on our servers
              </p>
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="bg-gray-50 dark:bg-gray-800/50 py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Simple, Transparent Pricing</h2>
              <p className="text-xl text-gray-600 dark:text-gray-300">Start free, upgrade when you need more</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Free Plan */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Free</h3>
                  <p className="text-gray-600 dark:text-gray-300 mt-2">Perfect for getting started</p>
                  <div className="text-4xl font-bold text-gray-900 dark:text-white mt-4">$0<span className="text-lg font-normal text-gray-500">/month</span></div>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">3 PDF uploads per month</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">Basic AI flashcard generation</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">Export to all formats</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">Built-in study mode</span>
                  </li>
                </ul>
                <Button className="w-full" variant="outline" onClick={() => setShowAuthModal(true)}>
                  Get Started Free
                </Button>
              </div>

              {/* Premium Plan */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border-2 border-blue-500 relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium">
                    Most Popular
                  </div>
                </div>
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Premium</h3>
                  <p className="text-gray-600 dark:text-gray-300 mt-2">For serious learners</p>
                  <div className="text-4xl font-bold text-gray-900 dark:text-white mt-4">$9<span className="text-lg font-normal text-gray-500">/month</span></div>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">100 PDF uploads per month</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">Advanced AI with multiple providers</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">OCR for scanned documents</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">Priority processing</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">Advanced study analytics</span>
                  </li>
                </ul>
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowAuthModal(true)}>
                  Start Premium Trial
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-white dark:bg-gray-900 py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">Ready to Transform Your Learning?</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto">
              Join thousands of students and professionals who are already studying smarter with AI-generated flashcards
            </p>
            <Button 
              onClick={() => setShowAuthModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8 py-3 font-medium text-lg"
            >
              Get Started Now - It's Free!
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-600 dark:text-gray-300">
            <p>&copy; 2024 StudyCards AI. Powered by advanced AI technology.</p>
          </div>
        </div>
      </footer>

      {/* Authentication Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}