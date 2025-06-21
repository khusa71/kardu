import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, X, Home, Upload, History, BookOpen, LogOut, User, Brain, Feather } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface NavigationBarProps {
  onNavigate?: (path: string) => void;
}

export function NavigationBar({ onNavigate }: NavigationBarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, signOut } = useSupabaseAuth();
  const [location, setLocation] = useLocation();

  const handleNavigation = (path: string) => {
    setLocation(path);
    setIsMobileMenuOpen(false);
    onNavigate?.(path);
  };

  const handleLogout = async () => {
    await signOut();
    setIsMobileMenuOpen(false);
  };

  // Fetch user role to determine admin access
  const { data: userData } = useQuery({
    queryKey: ['/api/auth/user'],
    enabled: !!user,
  });

  const userRole = (userData as any)?.role;

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: Home },
    { path: "/upload", label: "Upload", icon: Upload },
    { path: "/history", label: "History", icon: History },
    { path: "/study", label: "Study", icon: BookOpen },
    ...(userRole === 'admin' ? 
      [{ path: "/admin", label: "Admin", icon: User }] : [])
  ];

  const isActive = (path: string) => {
    if (path === "/dashboard" && (location === "/" || location === "/dashboard")) return true;
    if (path !== "/dashboard" && location.startsWith(path)) return true;
    return false;
  };

  if (!user) return null;

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="container-section py-4">
        <div className="flex items-center justify-between">
          {/* Logo/Brand */}
          <Link href="/">
            <div className="flex items-center space-x-3 hover:opacity-80 transition-all duration-200 ease-in-out">
              <div className="bg-primary text-primary-foreground rounded-xl p-2.5 transition-transform duration-200 hover:scale-110">
                <Feather className="w-6 h-6" />
              </div>
              <span className="text-xl font-bold text-foreground">Kardu.io</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <Button
                  variant="ghost"
                  className={`text-sm font-medium px-4 py-2 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg ${
                    isActive(item.path) 
                      ? 'text-primary bg-primary/10 shadow-sm border border-primary/20' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:border-muted'
                  }`}
                >
                  <item.icon className="w-4 h-4 mr-2 transition-transform duration-200 hover:rotate-3" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </div>

          {/* User Info & Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {user.email?.split('@')[0]}
              </span>
              <Badge 
                variant={(userData as any)?.isPremium ? "default" : "secondary"} 
                className="ml-2 text-xs transition-all duration-200 hover:scale-105"
              >
                {(userData as any)?.isPremium ? "Pro" : "Free"}
              </Badge>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              className="rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-md"
            >
              <LogOut className="w-4 h-4 mr-2 transition-transform duration-200" />
              Logout
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="transition-all duration-200 hover:scale-110"
            >
              <div className="relative w-5 h-5">
                <Menu className={`w-5 h-5 absolute transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0 rotate-90' : 'opacity-100 rotate-0'}`} />
                <X className={`w-5 h-5 absolute transition-all duration-300 ${isMobileMenuOpen ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-90'}`} />
              </div>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <div className={`md:hidden border-t border-border bg-background overflow-hidden transition-all duration-500 ease-in-out ${
          isMobileMenuOpen ? 'max-h-96 opacity-100 py-4' : 'max-h-0 opacity-0 py-0'
        }`}>
          <div className="space-y-2">
            {navItems.map((item, index) => (
              <Button
                key={item.path}
                variant="ghost"
                className={`w-full justify-start text-left px-4 py-3 rounded-lg transition-all duration-300 ease-in-out transform hover:translate-x-2 hover:shadow-md ${
                  isActive(item.path) 
                    ? 'text-primary bg-primary/10 shadow-sm border-l-4 border-primary' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
                style={{ 
                  transitionDelay: `${index * 100}ms`,
                  transform: isMobileMenuOpen ? 'translateX(0)' : 'translateX(-20px)',
                  opacity: isMobileMenuOpen ? 1 : 0
                }}
                onClick={() => handleNavigation(item.path)}
              >
                <item.icon className="w-4 h-4 mr-3 transition-transform duration-200 hover:scale-110" />
                {item.label}
              </Button>
            ))}
              
            {/* User Info (Mobile) */}
            <div className="px-4 py-4 border-t border-border mt-4 transition-all duration-500 ease-in-out"
                 style={{ 
                   transitionDelay: `${navItems.length * 100}ms`,
                   transform: isMobileMenuOpen ? 'translateY(0)' : 'translateY(-20px)',
                   opacity: isMobileMenuOpen ? 1 : 0
                 }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div className="text-sm">
                    <p className="text-foreground font-medium">
                      {user.email?.split('@')[0]}
                    </p>
                    <Badge variant={(userData as any)?.isPremium ? "default" : "secondary"} className="text-xs">
                      {(userData as any)?.isPremium ? "Pro" : "Free"}
                    </Badge>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleLogout}
                  className="transition-all duration-200 hover:scale-105"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}