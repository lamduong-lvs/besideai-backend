/**
 * Database Connection
 * Portable PostgreSQL connection using pg library
 * Works on both Vercel and standalone server
 */

import pg from 'pg';
const { Pool } = pg;

let pool = null;

/**
 * Get database connection pool
 * Uses connection pooling for serverless functions
 */
export function getDbPool() {
  if (!pool) {
    let connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    // Fix password encoding: # characters in password need to be URL encoded as %23
    // Format: postgresql://user:password@host:port/database
    const parts = connectionString.split('@');
    
    if (parts.length >= 2) {
      const beforeAt = parts[0]; // postgresql://user:password
      const afterAt = parts.slice(1).join('@'); // host:port/database
      
      // Extract user and password
      const userPassMatch = beforeAt.match(/^postgresql:\/\/([^:]+):(.+)$/);
      if (userPassMatch) {
        const [, user, password] = userPassMatch;
        
        // Check if password contains unencoded # characters
        if (password.includes('#') && !password.includes('%23')) {
          // Encode password
          const encodedPassword = encodeURIComponent(password);
          connectionString = `postgresql://${user}:${encodedPassword}@${afterAt}`;
          console.log('[DB] ✅ Encoded password in connection string');
        }
      }
    }

    // Parse connection string to extract components for better control
    // Supabase only supports IPv6, so we need to ensure proper IPv6 handling
    let poolConfig;
    
    const isVercel = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
    const isWindows = process.platform === 'win32';
    
    // Parse URL to extract components
    // On both Vercel and Windows, use IPv6 address for Supabase to bypass DNS issues
    try {
      const url = new URL(connectionString);
      let host = url.hostname;
      
      // Use IPv6 address directly for Supabase on both Vercel and Windows
      // This bypasses DNS resolution which may fail on Vercel
      if (host.includes('supabase.co')) {
        // Use IPv6 address directly - this is the most reliable method
        // Supabase database server IPv6 address
        const SUPABASE_IPV6 = '2406:da14:271:9900:5ea0:274d:56b8:80ac';
        host = SUPABASE_IPV6;
        if (isVercel) {
          console.log('[DB] Using IPv6 address directly for Supabase on Vercel (bypassing DNS)');
        } else {
          console.log('[DB] Using IPv6 address directly for Supabase on Windows (bypassing DNS)');
        }
      }
      
      poolConfig = {
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        host: host,
        port: parseInt(url.port) || 5432,
        database: url.pathname.slice(1), // Remove leading /
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 20000,
      };
      console.log('[DB] ✅ Parsed connection string to config object');
      console.log('[DB] Host:', poolConfig.host, 'Port:', poolConfig.port);
    } catch (error) {
      // Fallback to connectionString
      console.warn('[DB] Could not parse as URL, using connectionString:', error.message);
      poolConfig = {
        connectionString,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 20000
      };
    }

    pool = new Pool(poolConfig);

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('[DB] Unexpected error on idle client:', err);
    });

    console.log('[DB] Database connection pool created');
  }

  return pool;
}

/**
 * Execute a query
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
export async function query(text, params) {
  const pool = getDbPool();
  const start = Date.now();
  
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    console.log('[DB] Query executed', { 
      text: text.substring(0, 50) + '...', 
      duration: `${duration}ms`,
      rows: res.rowCount 
    });
    
    return res;
  } catch (error) {
    console.error('[DB] Query error:', error);
    throw error;
  }
}

/**
 * Get a client from the pool (for transactions)
 * @returns {Promise<pg.PoolClient>} Database client
 */
export async function getClient() {
  const pool = getDbPool();
  return await pool.connect();
}

/**
 * Close database connection pool
 * Useful for graceful shutdown
 */
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[DB] Connection pool closed');
  }
}

