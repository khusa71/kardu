import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthModal } from "@/components/auth-modal";
import { Brain, FileText, Download, Zap, Shield, CheckCircle, Star, ArrowRight } from "lucide-react";

export default function Landing() {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 text-white rounded-lg p-2">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">StudyCards AI</h1>
                <p className="text-gray-600 dark:text-gray-300 text-sm">AI-Powered Flashcard Generation</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={() => setShowAuthModal(true)} className="bg-blue-600 hover:bg-blue-700">
                Sign In
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Transform Your PDFs into
            <span className="text-blue-600 dark:text-blue-400"> Smart Flashcards</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
            Upload any educational PDF and let our AI create interactive flashcards with spaced repetition. 
            Perfect for students, professionals, and lifelong learners.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => setShowAuthModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
            >
              <Brain className="w-5 h-5 mr-2" />
              Get Started Free
            </Button>
            <Button variant="outline" size="lg" className="px-8 py-3">
              <FileText className="w-5 h-5 mr-2" />
              View Demo
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle>AI-Powered Generation</CardTitle>
              <CardDescription>
                Advanced AI analyzes your PDFs and creates high-quality flashcards tailored to your content
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle>Multiple Export Formats</CardTitle>
              <CardDescription>
                Export to Anki, CSV, JSON, or Quizlet format. Compatible with all major study platforms
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle>Secure & Private</CardTitle>
              <CardDescription>
                Your documents are processed securely and never stored permanently on our servers
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Pricing Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Simple, Transparent Pricing</h2>
            <p className="text-gray-600 dark:text-gray-300">Start free, upgrade when you need more</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <Card className="border-2 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-2xl">Free Plan</CardTitle>
                <CardDescription>Perfect for getting started</CardDescription>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">$0<span className="text-lg font-normal text-gray-500">/month</span></div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    <span>3 PDF uploads per month</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    <span>Basic AI flashcard generation</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    <span>Export to all formats</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    <span>Built-in study mode</span>
                  </li>
                </ul>
                <Button className="w-full mt-6" variant="outline" onClick={() => setShowAuthModal(true)}>
                  Get Started Free
                </Button>
              </CardContent>
            </Card>

            {/* Premium Plan */}
            <Card className="border-2 border-blue-500 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                  <Star className="w-4 h-4 mr-1" />
                  Most Popular
                </div>
              </div>
              <CardHeader>
                <CardTitle className="text-2xl">Premium Plan</CardTitle>
                <CardDescription>For serious learners</CardDescription>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">$9<span className="text-lg font-normal text-gray-500">/month</span></div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    <span>100 PDF uploads per month</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    <span>Advanced AI with multiple providers</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    <span>OCR for scanned documents</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    <span>Priority processing</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    <span>Advanced study analytics</span>
                  </li>
                </ul>
                <Button className="w-full mt-6 bg-blue-600 hover:bg-blue-700" onClick={() => setShowAuthModal(true)}>
                  Start Premium Trial
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Learning?</h2>
          <p className="text-xl mb-8 text-blue-100">
            Join thousands of students and professionals who are already studying smarter with AI-generated flashcards
          </p>
          <Button 
            size="lg" 
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3"
            onClick={() => setShowAuthModal(true)}
          >
            <Brain className="w-5 h-5 mr-2" />
            Get Started Now - It's Free!
          </Button>
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