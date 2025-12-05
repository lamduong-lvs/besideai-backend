/**
 * CORS Helper for Vercel Serverless Functions
 * Adds CORS headers to responses
 */

/**
 * Set CORS headers on response
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
export function setCorsHeaders(req, res) {
  const origin = req.headers.origin || req.headers.Origin;
  const allowedOrigins = process.env.CORS_ORIGIN ? 
    process.env.CORS_ORIGIN.split(',').map(o => o.trim()) : 
    ['*'];
  
  // Normalize origins (handle www and non-www variants)
  const normalizedOrigins = [];
  allowedOrigins.forEach(orig => {
    if (orig === '*') {
      normalizedOrigins.push('*');
    } else {
      normalizedOrigins.push(orig);
      // Add www variant if not already present
      if (orig.startsWith('https://') && !orig.includes('www.')) {
        normalizedOrigins.push(orig.replace('https://', 'https://www.'));
      } else if (orig.startsWith('https://www.') && !normalizedOrigins.includes(orig.replace('www.', ''))) {
        normalizedOrigins.push(orig.replace('www.', ''));
      }
    }
  });
  
  // Determine allowed origin
  let allowedOrigin = '*';
  if (normalizedOrigins.includes('*')) {
    allowedOrigin = '*';
  } else if (origin && normalizedOrigins.includes(origin)) {
    allowedOrigin = origin;
  } else if (!origin) {
    // Allow requests without origin (e.g., from extensions, server-to-server)
    allowedOrigin = '*';
  } else {
    // Try to match www/non-www variants
    const normalizedOrigin = origin.replace(/^https:\/\/(www\.)?/, 'https://');
    const matchingOrigin = normalizedOrigins.find(o => 
      o.replace(/^https:\/\/(www\.)?/, 'https://') === normalizedOrigin
    );
    if (matchingOrigin) {
      allowedOrigin = origin; // Use the actual origin from request
    } else {
      // Default to first allowed origin if origin doesn't match
      allowedOrigin = normalizedOrigins[0] || '*';
    }
  }

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
}

/**
 * Handle OPTIONS preflight request
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {boolean} - True if handled, false otherwise
 */
export function handleCorsPreflight(req, res) {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(req, res);
    res.status(200).end();
    return true;
  }
  return false;
}

