import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, X, Home, Upload, History, BookOpen, LogOut, User, Brain } from "lucide-react";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface NavigationBarProps {
  onNavigate?: (path: string) => void;
}

export function NavigationBar({ onNavigate }: NavigationBarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useFirebaseAuth();
  const [location, setLocation] = useLocation();

  const handleNavigation = (path: string) => {
    setLocation(path);
    setIsMobileMenuOpen(false);
    onNavigate?.(path);
  };

  const handleLogout = async () => {
    await logout();
    setIsMobileMenuOpen(false);
  };

  // Fetch user role to determine admin access
  const { data: userData } = useQuery({
    queryKey: ['/api/auth/user'],
    enabled: !!user,
  });

  const userRole = (userData as any)?.role;

  const navItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/upload", label: "Upload", icon: Upload },
    { path: "/history", label: "History", icon: History },
    { path: "/study", label: "Study", icon: BookOpen },
    ...(userRole === 'admin' ? 
      [{ path: "/admin", label: "Admin", icon: User }] : [])
  ];

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  if (!user) return null;

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="container-section py-4">
        <div className="flex items-center justify-between">
          {/* Logo/Brand */}
          <Link href="/">
            <div className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <div className="bg-primary text-primary-foreground rounded-xl p-2.5">
                <Brain className="w-6 h-6" />
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
                  className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
                    isActive(item.path) 
                      ? 'text-primary bg-primary/10' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <item.icon className="w-4 h-4 mr-2" />
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
                variant={(user as any)?.isPremium ? "default" : "secondary"} 
                className="ml-2 text-xs"
              >
                {(user as any)?.isPremium ? "Pro" : "Free"}
              </Badge>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              className="rounded-xl"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background">
            <div className="py-4 space-y-2">
              {navItems.map((item) => (
                <Button
                  key={item.path}
                  variant="ghost"
                  className={`w-full justify-start text-left px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.path) 
                      ? 'text-primary bg-primary/10' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                  onClick={() => handleNavigation(item.path)}
                >
                  <item.icon className="w-4 h-4 mr-3" />
                  {item.label}
                </Button>
              ))}
              
              {/* User Info (Mobile) */}
              <div className="px-4 py-4 border-t border-border mt-4">
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
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}