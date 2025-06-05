import { log } from "./vite";
import { db } from "./db";
import { validateApiKeys } from "./api-key-validator";

export interface HealthStatus {
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

export class HealthMonitor {
  private lastHealthCheck: HealthStatus | null = null;
  private startTime = Date.now();

  async getHealthStatus(): Promise<HealthStatus> {
    const errors: string[] = [];
    const timestamp = Date.now();
    
    // Check database connectivity
    let databaseStatus: 'up' | 'down' = 'down';
    try {
      await db.execute('SELECT 1');
      databaseStatus = 'up';
    } catch (error) {
      errors.push(`Database connection failed: ${error}`);
    }

    // Check API keys
    const apiKeyValidation = validateApiKeys();
    const apiKeysStatus = apiKeyValidation.canProcess ? 'configured' : 'missing';
    if (!apiKeyValidation.canProcess) {
      errors.push('No API keys configured for AI processing');
    }

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    let memoryStatus: 'normal' | 'high' | 'critical' = 'normal';
    
    if (heapUsedMB > 500) {
      memoryStatus = 'critical';
      errors.push(`Critical memory usage: ${heapUsedMB.toFixed(2)}MB`);
    } else if (heapUsedMB > 200) {
      memoryStatus = 'high';
      errors.push(`High memory usage: ${heapUsedMB.toFixed(2)}MB`);
    }

    // Calculate uptime
    const uptime = timestamp - this.startTime;

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (databaseStatus === 'down' || memoryStatus === 'critical') {
      status = 'unhealthy';
    } else if (apiKeysStatus === 'missing' || memoryStatus === 'high' || errors.length > 0) {
      status = 'degraded';
    }

    const healthStatus: HealthStatus = {
      status,
      timestamp,
      services: {
        database: databaseStatus,
        apiKeys: apiKeysStatus,
        memory: memoryStatus,
        uptime
      },
      errors: errors.length > 0 ? errors : undefined
    };

    this.lastHealthCheck = healthStatus;
    return healthStatus;
  }

  startMonitoring(): void {
    // Run health checks every 30 seconds
    setInterval(async () => {
      try {
        const health = await this.getHealthStatus();
        if (health.status === 'unhealthy') {
          log(`HEALTH ALERT: Application is unhealthy - ${health.errors?.join(', ')}`);
        } else if (health.status === 'degraded') {
          log(`HEALTH WARNING: Application is degraded - ${health.errors?.join(', ')}`);
        }
      } catch (error) {
        log(`Health check failed: ${error}`);
      }
    }, 30000);

    log('Health monitoring started');
  }

  getLastHealthCheck(): HealthStatus | null {
    return this.lastHealthCheck;
  }
}

export const healthMonitor = new HealthMonitor();