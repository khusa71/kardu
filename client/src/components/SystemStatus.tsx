import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertTriangle, Clock } from "lucide-react";

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  services: {
    database: 'up' | 'down';
    apiKeys: 'configured' | 'missing';
    memory: 'normal' | 'high' | 'critical';
    uptime: number;
  };
  errors?: string[];
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function StatusIcon({ status }: { status: 'healthy' | 'degraded' | 'unhealthy' | 'up' | 'down' | 'configured' | 'missing' | 'normal' | 'high' | 'critical' }) {
  switch (status) {
    case 'healthy':
    case 'up':
    case 'configured':
    case 'normal':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'degraded':
    case 'high':
    case 'missing':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'unhealthy':
    case 'down':
    case 'critical':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-500" />;
  }
}

function StatusBadge({ status }: { status: string }) {
  const variant = 
    ['healthy', 'up', 'configured', 'normal'].includes(status) ? 'default' :
    ['degraded', 'high', 'missing'].includes(status) ? 'secondary' :
    'destructive';

  return (
    <Badge variant={variant} className="flex items-center gap-1">
      <StatusIcon status={status as any} />
      {status}
    </Badge>
  );
}

export function SystemStatus() {
  const { data: health, isLoading, error } = useQuery<HealthStatus>({
    queryKey: ['/api/health'],
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: false,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            System Status
          </CardTitle>
          <CardDescription>Loading system health...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error || !health) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            System Status
          </CardTitle>
          <CardDescription>Unable to fetch system status</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <StatusIcon status={health.status} />
          System Status
        </CardTitle>
        <CardDescription>
          Last updated: {new Date(health.timestamp).toLocaleTimeString()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall</span>
              <StatusBadge status={health.status} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Database</span>
              <StatusBadge status={health.services.database} />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">API Keys</span>
              <StatusBadge status={health.services.apiKeys} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Memory</span>
              <StatusBadge status={health.services.memory} />
            </div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Uptime</span>
            <span className="text-sm text-muted-foreground">
              {formatUptime(health.services.uptime)}
            </span>
          </div>
        </div>

        {health.errors && health.errors.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-medium mb-2 text-red-600">Issues:</h4>
            <ul className="space-y-1">
              {health.errors.map((error, index) => (
                <li key={index} className="text-xs text-muted-foreground">
                  • {error}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}