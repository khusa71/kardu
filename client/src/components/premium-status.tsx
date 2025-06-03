import { Badge } from "@/components/ui/badge";
import { Crown, Upload } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function PremiumStatus() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Upload className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {user.monthlyUploads || 0}/{user.monthlyLimit || 3} uploads
        </span>
      </div>
      
      {user.isPremium ? (
        <Badge variant="secondary" className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
          <Crown className="mr-1 h-3 w-3" />
          Pro
        </Badge>
      ) : (
        <Badge variant="outline">
          Free
        </Badge>
      )}
    </div>
  );
}