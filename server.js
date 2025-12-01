/**
 * Standalone Express Server
 * For running on dedicated server (not Vercel)
 * This file allows easy migration from Vercel to standalone server
 */

import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { corsMiddleware } from './src/middleware/cors.js';
import { errorHandler, notFoundHandler } from './src/middleware/error-handler.js';
import { requestLogger, errorLogger } from './src/middleware/logger.js';
import { defaultRateLimiter } from './src/middleware/rate-limiter.js';
import { getDbPool } from './src/lib/db.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS
app.use(corsMiddleware);

// Request logging
app.use(requestLogger);

// Rate limiting
app.use(defaultRateLimiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check (standalone)
app.get('/health', async (req, res) => {
  try {
    const pool = getDbPool();
    await pool.query('SELECT 1');

    res.json({
      success: true,
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// API routes
import userRoutes from './src/routes/users.js';
import subscriptionRoutes from './src/routes/subscription.js';
import usageRoutes from './src/routes/usage.js';
import webhookRoutes from './src/routes/webhooks.js';

app.use('/api/users', userRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/webhooks', webhookRoutes);

// 404 handler
app.use(notFoundHandler);

// Error logging (before error handler)
app.use(errorLogger);

// Error handler (must be last)
app.use(errorHandler);

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[Server] Running on port ${PORT}`);
    console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[Server] Health check: http://localhost:${PORT}/health`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Server] SIGTERM received, shutting down gracefully...');
  const { closePool } = await import('./src/lib/db.js');
  await closePool();
  process.exit(0);
});

export default app;

