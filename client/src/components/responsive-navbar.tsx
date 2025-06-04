import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { UpgradeButton } from "@/components/upgrade-button";
import { PremiumStatus } from "@/components/premium-status";
import { Brain, FileText, User, LogOut, Menu, Shield } from "lucide-react";

interface ResponsiveNavbarProps {
  onAuthModalOpen: () => void;
  onLogout: () => void;
}

export function ResponsiveNavbar({ onAuthModalOpen, onLogout }: ResponsiveNavbarProps) {
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleNavigation = (path: string) => {
    window.location.href = path;
    setIsMenuOpen(false);
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="bg-primary text-white rounded-lg p-2">
              <Brain className="w-6 h-6" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl lg:text-2xl font-bold text-neutral dark:text-white">Kardu.io</h1>
              <p className="text-gray-600 dark:text-gray-300 text-xs lg:text-sm">Transform PDFs into interactive flashcards</p>
            </div>
            <div className="sm:hidden">
              <h1 className="text-lg font-bold text-neutral dark:text-white">Kardu.io</h1>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleNavigation("/history")}
                  className="flex items-center"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  History
                </Button>
                <PremiumStatus />
                {!(user as any)?.isPremium && <UpgradeButton size="sm" />}
                <div className="text-right">
                  <div className="text-sm font-medium text-neutral dark:text-white max-w-32 truncate">
                    {user.email}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={onLogout}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={onAuthModalOpen}>
                  <User className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
                <div className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-3 py-1 rounded-full text-sm font-medium">
                  <Shield className="w-3 h-3 mr-1 inline" />
                  Secure
                </div>
              </div>
            )}
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            {user ? (
              <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72">
                  <div className="flex flex-col space-y-6 pt-6">
                    {/* User Info */}
                    <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                      <div className="text-sm font-medium text-neutral dark:text-white mb-2">
                        {user.email}
                      </div>
                      <PremiumStatus />
                    </div>

                    {/* Navigation Links */}
                    <div className="space-y-3">
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => handleNavigation("/history")}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        History
                      </Button>
                    </div>

                    {/* Upgrade Section */}
                    {!(user as any)?.isPremium && (
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                        <UpgradeButton className="w-full" />
                      </div>
                    )}

                    {/* Logout */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-auto">
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          onLogout();
                          setIsMenuOpen(false);
                        }}
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            ) : (
              <Button variant="outline" size="sm" onClick={onAuthModalOpen}>
                <User className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}