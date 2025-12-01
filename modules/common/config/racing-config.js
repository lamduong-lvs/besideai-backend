/**
 * ═══════════════════════════════════════════════════════════════════
 * RACING CONFIGURATION - OPTIMIZED FOR TRANSLATION
 * ═══════════════════════════════════════════════════════════════════
 * 
 * PROBLEMS FIXED:
 * ✅ Reduced number of racing models from 4-5 to 2
 * ✅ Disabled racing by default for translation
 * ✅ Added rate limiting
 * ✅ Prevents 429 errors (Too Many Requests)
 * 
 * REPLACE racing-config.js content with this optimized version
 */

const RACING_CONFIG = {
    // ═══════════════════════════════════════════════════════════════
    // RACING MODE SETTINGS
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Enable/disable racing mode
     * ✅ CHANGED: false by default (was true)
     * 
     * When disabled: Uses single fastest model
     * When enabled: Races 2 models for best result
     */
    enabled: false,
    
    /**
     * Default racing mode for different tasks
     */
    defaultModes: {
        translation: false,    // ✅ CHANGED: Disable racing for translation
        summarization: false,  // ✅ CHANGED: Disable racing for summarization
        general: false         // ✅ CHANGED: Disable racing for general tasks
    },
    
    // ═══════════════════════════════════════════════════════════════
    // MODEL SELECTION FOR RACING
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Models to use for racing
     * ✅ CHANGED: Reduced from 4-5 models to 2 fastest
     */
    models: [
        // Primary: Fastest model
        {
            id: 'cerebras/llama-4-scout-17b-16e-instruct',
            priority: 1,
            avgSpeed: 150,  // tokens/sec
            reliability: 0.95
        },
        
        // Secondary: Backup fast model
        {
            id: 'cerebras/llama-3.3-70b',
            priority: 2,
            avgSpeed: 120,
            reliability: 0.90
        }
        
        /* ❌ REMOVED: Too many models cause rate limiting
        {
            id: 'cerebras/gpt-oss-120b',
            priority: 3,
            avgSpeed: 80,
            reliability: 0.85
        },
        {
            id: 'cerebras/qwen-3-235b-a22b-instruct-2507',
            priority: 4,
            avgSpeed: 60,
            reliability: 0.80
        }
        */
    ],
    
    // ═══════════════════════════════════════════════════════════════
    // TRANSLATION-SPECIFIC SETTINGS
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Translation configuration
     * ✅ OPTIMIZED: Single model, no racing
     */
    translation: {
        enabled: false,                    // ✅ Racing disabled for translation
        maxModels: 1,                     // ✅ CHANGED: was 4, now 1
        timeout: 5000,                    // 5 seconds timeout
        preferredModel: 'cerebras/llama-4-scout-17b-16e-instruct',
        
        // Rate limiting
        rateLimiting: {
            enabled: true,                // ✅ ADDED: Enable rate limiting
            maxRequestsPerMinute: 30,     // ✅ ADDED: Max 30 requests/minute
            cooldownMs: 2000              // ✅ ADDED: 2 second cooldown between requests
        }
    },
    
    /**
     * Summarization configuration
     * ✅ OPTIMIZED: Single model for consistency
     */
    summarization: {
        enabled: false,                    // ✅ Racing disabled
        maxModels: 1,                     // ✅ CHANGED: was 3, now 1
        timeout: 10000,                   // 10 seconds timeout
        preferredModel: 'cerebras/llama-3.3-70b',
        
        rateLimiting: {
            enabled: true,
            maxRequestsPerMinute: 10,
            cooldownMs: 5000
        }
    },
    
    // ═══════════════════════════════════════════════════════════════
    // CACHE SETTINGS
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Cache configuration
     * ✅ ENHANCED: Aggressive caching to reduce API calls
     */
    cache: {
        enabled: true,
        maxSize: 200,                     // ✅ CHANGED: was 100, now 200
        ttl: 1800000,                     // 30 minutes TTL
        keyPrefix: 'racing_',
        
        // Cache hit optimization
        fuzzyMatch: {
            enabled: true,                // ✅ ADDED: Enable fuzzy matching
            threshold: 0.95              // ✅ ADDED: 95% similarity = cache hit
        }
    },
    
    // ═══════════════════════════════════════════════════════════════
    // PERFORMANCE SETTINGS
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Performance optimization
     */
    performance: {
        // Timeout settings
        defaultTimeout: 5000,             // ✅ CHANGED: was 10000
        translationTimeout: 3000,         // ✅ ADDED: Faster timeout for translation
        
        // Retry settings
        maxRetries: 1,                    // ✅ CHANGED: was 3, now 1
        retryDelay: 1000,                 // 1 second between retries
        
        // Request throttling
        throttle: {
            enabled: true,                // ✅ ADDED: Enable throttling
            minInterval: 100,            // ✅ ADDED: Min 100ms between requests
            maxConcurrent: 2             // ✅ ADDED: Max 2 concurrent requests
        }
    },
    
    // ═══════════════════════════════════════════════════════════════
    // ERROR HANDLING
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Error handling configuration
     */
    errorHandling: {
        // 429 (Rate Limit) handling
        rateLimitBackoff: {
            enabled: true,
            initialDelay: 5000,           // Wait 5 seconds after 429
            maxDelay: 30000,              // Max 30 seconds
            multiplier: 2                 // Exponential backoff
        },
        
        // Fallback behavior
        fallback: {
            enabled: true,
            useCachedResponse: true,      // Use cached response on error
            useDefaultResponse: false     // Don't use placeholder responses
        }
    },
    
    // ═══════════════════════════════════════════════════════════════
    // MONITORING & STATISTICS
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Monitoring configuration
     */
    monitoring: {
        enabled: true,
        logLevel: 'info',                 // 'debug' | 'info' | 'warn' | 'error'
        logStats: true,                   // Log statistics periodically
        statsInterval: 60000              // Log every minute
    }
};

// ═══════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════

if (typeof module !== 'undefined' && module.exports) {
    module.exports = RACING_CONFIG;
}

window.RACING_CONFIG = RACING_CONFIG;

console.log('[RacingConfig] ✓ Optimized configuration loaded');
console.log('[RacingConfig] Racing:', RACING_CONFIG.enabled);
console.log('[RacingConfig] Translation racing:', RACING_CONFIG.translation.enabled);
console.log('[RacingConfig] Models:', RACING_CONFIG.models.length);