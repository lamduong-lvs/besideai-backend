/**
 * CORS Middleware
 * Configure CORS for Chrome Extension
 */

import cors from 'cors';

// Get allowed origins from environment
const getAllowedOrigins = () => {
  const corsOrigin = process.env.CORS_ORIGIN;
  
  if (!corsOrigin) {
    console.warn('[CORS] CORS_ORIGIN not set, allowing all origins');
    return '*';
  }

  // Support multiple origins (comma-separated)
  if (corsOrigin.includes(',')) {
    return corsOrigin.split(',').map(origin => origin.trim());
  }

  return corsOrigin;
};

/**
 * CORS configuration
 */
export const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow all origins in development
    if (allowedOrigins === '*' || process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    // Check if origin is allowed
    if (Array.isArray(allowedOrigins)) {
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
    } else if (origin === allowedOrigins) {
      return callback(null, true);
    }

    // For Chrome Extensions, origin might be null
    // Allow requests without origin (e.g., from extensions)
    if (!origin) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type'],
  maxAge: 86400 // 24 hours
};

/**
 * CORS middleware
 */
export const corsMiddleware = cors(corsOptions);

