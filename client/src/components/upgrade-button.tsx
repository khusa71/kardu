import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CreditCard, Loader2 } from "lucide-react";

interface UpgradeButtonProps {
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}

export function UpgradeButton({ className, variant = "default", size = "default" }: UpgradeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleUpgrade = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to upgrade your account.",
        variant: "destructive",
      });
      return;
    }

    if (user.isPremium) {
      toast({
        title: "Already Premium",
        description: "You already have a premium subscription.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/create-checkout-session");
      const data = await response.json();

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      console.error("Upgrade error:", error);
      toast({
        title: "Upgrade Failed",
        description: "Failed to start the upgrade process. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (user?.isPremium) {
    return null; // Don't show upgrade button for premium users
  }

  return (
    <Button
      onClick={handleUpgrade}
      disabled={isLoading}
      className={className}
      variant={variant}
      size={size}
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <CreditCard className="mr-2 h-4 w-4" />
      )}
      {isLoading ? "Processing..." : "Upgrade to Pro"}
    </Button>
  );
}