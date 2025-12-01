/**
 * ═══════════════════════════════════════════════════════════════════
 * ENHANCED CAPTION FILTER - FIX SPAM CAPTIONS
 * ═══════════════════════════════════════════════════════════════════
 * 
 * PROBLEMS FIXED:
 * ✅ Filters out noise/empty captions
 * ✅ Filters too short captions
 * ✅ Debounces rapid captions
 * ✅ Detects similar/duplicate captions
 * ✅ Reduces API calls significantly
 */

class CaptionFilter {
    constructor() {
        // Cache for processed captions
        this.captionCache = new Set();
        this.lastCaption = '';
        this.lastCaptionTime = 0;
        
        // Settings
        this.settings = {
            minLength: 10,              // Minimum caption length
            debounceMs: 1000,           // Debounce time (1 second)
            similarityThreshold: 0.85,  // Similarity threshold for duplicates
            maxCacheSize: 100           // Max cache size
        };
        
        // Statistics
        this.stats = {
            total: 0,
            filtered: 0,
            processed: 0
        };
        
        console.log('[CaptionFilter] 🔍 Initialized');
    }
    
    /**
     * Main filter method - returns true if caption should be processed
     */
    shouldProcess(text) {
        this.stats.total++;
        
        // 1. Basic checks
        if (!text || !text.trim()) {
            this.stats.filtered++;
            console.log('[CaptionFilter] ❌ Empty caption filtered');
            return false;
        }
        
        text = text.trim();
        
        // 2. Length check - filter too short captions (likely noise)
        if (text.length < this.settings.minLength) {
            this.stats.filtered++;
            console.log('[CaptionFilter] ❌ Too short caption filtered:', text);
            return false;
        }
        
        // 3. Special characters only check
        if (this.isOnlySpecialChars(text)) {
            this.stats.filtered++;
            console.log('[CaptionFilter] ❌ Special chars only filtered:', text);
            return false;
        }
        
        // 4. Exact duplicate check
        if (text === this.lastCaption) {
            this.stats.filtered++;
            console.log('[CaptionFilter] ❌ Exact duplicate filtered');
            return false;
        }
        
        // 5. Debounce check - prevent rapid firing
        const now = Date.now();
        const timeSinceLastCaption = now - this.lastCaptionTime;
        
        if (timeSinceLastCaption < this.settings.debounceMs) {
            // Check if caption is significantly different
            if (!this.isSignificantlyDifferent(text, this.lastCaption)) {
                this.stats.filtered++;
                console.log('[CaptionFilter] ❌ Debounced similar caption:', {
                    text: text.substring(0, 30),
                    timeSince: timeSinceLastCaption
                });
                return false;
            }
        }
        
        // 6. Cache check - has this caption been seen recently?
        if (this.captionCache.has(text)) {
            this.stats.filtered++;
            console.log('[CaptionFilter] ❌ Caption in cache filtered');
            return false;
        }
        
        // 7. Similarity check with recent captions
        if (this.isSimilarToRecent(text)) {
            this.stats.filtered++;
            console.log('[CaptionFilter] ❌ Similar to recent caption filtered');
            return false;
        }
        
        // ✅ Caption passed all filters
        this.stats.processed++;
        this.addToCache(text);
        this.lastCaption = text;
        this.lastCaptionTime = now;
        
        console.log('[CaptionFilter] ✅ Caption passed filters:', {
            text: text.substring(0, 50) + '...',
            length: text.length,
            stats: this.getStats()
        });
        
        return true;
    }
    
    /**
     * Check if text contains only special characters/punctuation
     */
    isOnlySpecialChars(text) {
        // Remove all letters and numbers
        const withoutAlnum = text.replace(/[a-zA-Z0-9]/g, '');
        
        // If result is same as input, it's only special chars
        return withoutAlnum.length >= text.length * 0.9;
    }
    
    /**
     * Check if new caption is significantly different from last
     */
    isSignificantlyDifferent(newText, oldText) {
        if (!oldText) return true;
        
        const similarity = this.calculateSimilarity(newText, oldText);
        return similarity < this.settings.similarityThreshold;
    }
    
    /**
     * Check if caption is similar to recently processed captions
     */
    isSimilarToRecent(text) {
        // Check against last 5 captions in cache
        const recentCaptions = Array.from(this.captionCache).slice(-5);
        
        for (const recent of recentCaptions) {
            const similarity = this.calculateSimilarity(text, recent);
            if (similarity >= this.settings.similarityThreshold) {
                console.log('[CaptionFilter] 📊 Similar caption detected:', {
                    similarity: (similarity * 100).toFixed(1) + '%',
                    new: text.substring(0, 30),
                    recent: recent.substring(0, 30)
                });
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Calculate similarity between two strings (Jaccard similarity)
     */
    calculateSimilarity(str1, str2) {
        // Normalize
        str1 = str1.toLowerCase().trim();
        str2 = str2.toLowerCase().trim();
        
        // Quick exact match
        if (str1 === str2) return 1.0;
        
        // Convert to word sets
        const words1 = new Set(str1.split(/\s+/));
        const words2 = new Set(str2.split(/\s+/));
        
        // Calculate Jaccard similarity
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        
        return intersection.size / union.size;
    }
    
    /**
     * Add caption to cache
     */
    addToCache(text) {
        this.captionCache.add(text);
        
        // Maintain max cache size
        if (this.captionCache.size > this.settings.maxCacheSize) {
            // Remove oldest (first) item
            const first = this.captionCache.values().next().value;
            this.captionCache.delete(first);
        }
    }
    
    /**
     * Update settings
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        console.log('[CaptionFilter] ⚙️ Settings updated:', this.settings);
    }
    
    /**
     * Get statistics
     */
    getStats() {
        const filterRate = this.stats.total > 0 
            ? ((this.stats.filtered / this.stats.total) * 100).toFixed(1)
            : 0;
        
        return {
            total: this.stats.total,
            filtered: this.stats.filtered,
            processed: this.stats.processed,
            filterRate: filterRate + '%',
            cacheSize: this.captionCache.size
        };
    }
    
    /**
     * Log statistics
     */
    logStats() {
        console.log('[CaptionFilter] 📊 Statistics:', this.getStats());
    }
    
    /**
     * Reset filter
     */
    reset() {
        this.captionCache.clear();
        this.lastCaption = '';
        this.lastCaptionTime = 0;
        this.stats = {
            total: 0,
            filtered: 0,
            processed: 0
        };
        console.log('[CaptionFilter] 🔄 Reset');
    }
    
    /**
     * Clear cache
     */
    clearCache() {
        this.captionCache.clear();
        console.log('[CaptionFilter] 🗑️ Cache cleared');
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CaptionFilter;
}

// Make available globally
window.CaptionFilter = CaptionFilter;

console.log('[CaptionFilter] 🔍 Module loaded ✓');