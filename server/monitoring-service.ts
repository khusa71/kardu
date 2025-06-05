import { log } from "./vite";
import { healthMonitor } from "./health-monitor";

export interface SystemMetrics {
  timestamp: number;
  performance: {
    responseTime: number;
    requestCount: number;
    errorRate: number;
  };
  resources: {
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
  };
  health: any;
}

export class MonitoringService {
  private metrics: SystemMetrics[] = [];
  private requestCount = 0;
  private errorCount = 0;
  private responseTimeSum = 0;
  private lastCpuUsage = process.cpuUsage();

  constructor() {
    // Clear old metrics every hour
    setInterval(() => {
      this.clearOldMetrics();
    }, 3600000);
  }

  recordRequest(responseTime: number, isError: boolean = false): void {
    this.requestCount++;
    this.responseTimeSum += responseTime;
    
    if (isError) {
      this.errorCount++;
    }
  }

  async collectMetrics(): Promise<SystemMetrics> {
    const timestamp = Date.now();
    const avgResponseTime = this.requestCount > 0 ? this.responseTimeSum / this.requestCount : 0;
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;
    
    const currentCpuUsage = process.cpuUsage(this.lastCpuUsage);
    this.lastCpuUsage = process.cpuUsage();

    const health = await healthMonitor.getHealthStatus();

    const metrics: SystemMetrics = {
      timestamp,
      performance: {
        responseTime: avgResponseTime,
        requestCount: this.requestCount,
        errorRate,
      },
      resources: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: currentCpuUsage,
      },
      health,
    };

    this.metrics.push(metrics);
    
    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    // Reset counters for next period
    this.requestCount = 0;
    this.errorCount = 0;
    this.responseTimeSum = 0;

    return metrics;
  }

  getMetrics(limit: number = 50): SystemMetrics[] {
    return this.metrics.slice(-limit);
  }

  getLatestMetrics(): SystemMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  private clearOldMetrics(): void {
    const oneHourAgo = Date.now() - 3600000;
    this.metrics = this.metrics.filter(metric => metric.timestamp > oneHourAgo);
    log(`Cleared old metrics, ${this.metrics.length} metrics remaining`);
  }

  startPeriodicCollection(): void {
    // Collect metrics every 5 minutes
    setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        log(`Metrics collection failed: ${error}`);
      }
    }, 300000);

    log('Monitoring service started - collecting metrics every 5 minutes');
  }

  getSystemSummary(): {
    uptime: number;
    averageResponseTime: number;
    totalRequests: number;
    currentMemoryMB: number;
    healthStatus: string;
  } {
    const latest = this.getLatestMetrics();
    const uptime = process.uptime() * 1000;
    
    return {
      uptime,
      averageResponseTime: latest?.performance.responseTime || 0,
      totalRequests: this.metrics.reduce((sum, m) => sum + m.performance.requestCount, 0),
      currentMemoryMB: latest ? Math.round(latest.resources.memoryUsage.heapUsed / 1024 / 1024) : 0,
      healthStatus: latest?.health.status || 'unknown',
    };
  }
}

export const monitoringService = new MonitoringService();