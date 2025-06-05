import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Upload, Crown, AlertTriangle } from "lucide-react";

interface QuotaStatus {
  uploads: { used: number; limit: number; percentage: number };
  pages: { used: number; limit: number; percentage: number };
  isPremium: boolean;
  needsReset: boolean;
}

export function QuotaStatus() {
  const { data: quotaStatus, isLoading } = useQuery<QuotaStatus>({
    queryKey: ["/api/quota-status"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading || !quotaStatus) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Usage Quota
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-2 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-600";
    if (percentage >= 75) return "text-yellow-600";
    return "text-green-600";
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 75) return "bg-yellow-500";
    return "bg-blue-500";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Usage Quota
          </div>
          {quotaStatus.isPremium ? (
            <Badge variant="default" className="bg-gradient-to-r from-purple-500 to-blue-500">
              <Crown className="w-3 h-3 mr-1" />
              Premium
            </Badge>
          ) : (
            <Badge variant="secondary">Free</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Monthly Uploads */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              <span className="text-sm font-medium">Monthly Uploads</span>
            </div>
            <span className={`text-sm font-mono ${getStatusColor(quotaStatus.uploads.percentage)}`}>
              {quotaStatus.uploads.used} / {quotaStatus.uploads.limit}
            </span>
          </div>
          <Progress 
            value={quotaStatus.uploads.percentage} 
            className="h-2"
            style={{
              background: `linear-gradient(to right, ${getProgressColor(quotaStatus.uploads.percentage)} ${quotaStatus.uploads.percentage}%, #e5e7eb ${quotaStatus.uploads.percentage}%)`
            }}
          />
          {quotaStatus.uploads.percentage >= 90 && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertTriangle className="w-4 h-4" />
              <span>Upload limit almost reached</span>
            </div>
          )}
        </div>

        {/* Monthly Pages */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="text-sm font-medium">Pages Processed</span>
            </div>
            <span className={`text-sm font-mono ${getStatusColor(quotaStatus.pages.percentage)}`}>
              {quotaStatus.pages.used} / {quotaStatus.pages.limit}
            </span>
          </div>
          <Progress 
            value={quotaStatus.pages.percentage} 
            className="h-2"
            style={{
              background: `linear-gradient(to right, ${getProgressColor(quotaStatus.pages.percentage)} ${quotaStatus.pages.percentage}%, #e5e7eb ${quotaStatus.pages.percentage}%)`
            }}
          />
          {quotaStatus.pages.percentage >= 90 && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertTriangle className="w-4 h-4" />
              <span>Page limit almost reached</span>
            </div>
          )}
        </div>

        {/* Plan Information */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Max pages per file:</span>
              <div className="font-medium">{quotaStatus.isPremium ? "100" : "20"} pages</div>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Resets:</span>
              <div className="font-medium">Monthly</div>
            </div>
          </div>
        </div>

        {/* Upgrade prompt for free users */}
        {!quotaStatus.isPremium && (quotaStatus.uploads.percentage >= 75 || quotaStatus.pages.percentage >= 75) && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Need more capacity? Upgrade to Premium for:
              </p>
              <ul className="text-sm text-left space-y-1">
                <li>• 100 uploads per month</li>
                <li>• 100 pages per file</li>
                <li>• 10,000 pages per month</li>
                <li>• Advanced AI quality</li>
              </ul>
              <Button className="w-full" size="sm">
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to Premium
              </Button>
            </div>
          </div>
        )}

        {quotaStatus.needsReset && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center text-sm text-blue-600 dark:text-blue-400">
              Your quota will reset on your next upload
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}