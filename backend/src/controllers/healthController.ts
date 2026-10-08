import { Request, Response } from 'express';
import { query } from '../config/db.js';
import { ENV } from '../config/env.js';

export async function getHealthCheck(_req: Request, res: Response) {
  const startTime = Date.now();
  let dbStatus: 'connected' | 'disconnected' | 'unconfigured' = 'disconnected';
  let dbLatencyMs: number | null = null;
  let dbError: string | null = null;

  if (ENV.DATABASE_URL) {
    try {
      const dbStart = Date.now();
      await query('SELECT 1');
      dbLatencyMs = Date.now() - dbStart;
      dbStatus = 'connected';
    } catch (err: any) {
      dbStatus = 'disconnected';
      dbError = err?.message || 'Database connection error';
    }
  } else {
    dbStatus = 'unconfigured';
  }

  const memoryUsage = process.memoryUsage();
  const isHealthy = dbStatus !== 'disconnected';

  const healthData = {
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    responseTimeMs: Date.now() - startTime,
    environment: ENV.NODE_ENV,
    version: '1.0.0',
    services: {
      server: {
        status: 'up',
        nodeVersion: process.version,
        memory: {
          rssMb: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
          heapUsedMb: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
          heapTotalMb: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100,
        },
      },
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        ...(dbError ? { error: dbError } : {}),
      },
    },
  };

  return res.status(isHealthy ? 200 : 503).json(healthData);
}
