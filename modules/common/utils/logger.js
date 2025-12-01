/**
 * Google Meet Logger
 * Logging utility cho debugging và monitoring
 */

class MeetLogger {
    constructor(moduleName = 'MeetExt') {
        this.moduleName = moduleName;
        this.enabled = true;
        this.level = 'info'; // error, warn, info, debug
        this.logs = [];
        this.maxLogs = 1000;
        this.showTimestamp = true;
        this.showModule = true;
        this.colorize = true;
        
        // Colors for different log levels
        this.colors = {
            error: '#ea4335',
            warn: '#fbbc04',
            info: '#f86a01',
            debug: '#5f6368',
            success: '#34a853'
        };
        
        // Log levels hierarchy
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
    }

    /**
     * Initialize logger
     */
    async init() {
        // Load settings from storage
        try {
            const result = await chrome.storage.local.get('debugSettings');
            if (result.debugSettings) {
                this.enabled = result.debugSettings.enabled !== false;
                this.level = result.debugSettings.level || 'info';
            }
        } catch (error) {
            // Continue with defaults
        }
        
        console.log(`%c[${this.moduleName}] Logger initialized - Level: ${this.level}`, 
                    `color: ${this.colors.info}; font-weight: bold;`);
    }

    /**
     * Check if should log at this level
     */
    shouldLog(level) {
        if (!this.enabled) return false;
        return this.levels[level] <= this.levels[this.level];
    }

    /**
     * Format log message
     */
    formatMessage(level, message, data) {
        const timestamp = this.showTimestamp ? new Date().toISOString() : '';
        const module = this.showModule ? `[${this.moduleName}]` : '';
        
        let formatted = '';
        if (timestamp) formatted += `[${timestamp}] `;
        if (module) formatted += `${module} `;
        formatted += `[${level.toUpperCase()}] ${message}`;
        
        return formatted;
    }

    /**
     * Get console style
     */
    getStyle(level) {
        if (!this.colorize) return '';
        
        const color = this.colors[level] || this.colors.info;
        return `color: ${color}; font-weight: ${level === 'error' ? 'bold' : 'normal'};`;
    }

    /**
     * Store log in memory
     */
    storeLog(level, message, data) {
        const log = {
            timestamp: Date.now(),
            level: level,
            module: this.moduleName,
            message: message,
            data: data
        };
        
        this.logs.push(log);
        
        // Trim if exceeded max
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
    }

    /**
     * Error log
     */
    error(message, data = null) {
        if (!this.shouldLog('error')) return;
        
        const formatted = this.formatMessage('error', message, data);
        console.error(`%c${formatted}`, this.getStyle('error'), data || '');
        
        this.storeLog('error', message, data);
    }

    /**
     * Warning log
     */
    warn(message, data = null) {
        if (!this.shouldLog('warn')) return;
        
        const formatted = this.formatMessage('warn', message, data);
        console.warn(`%c${formatted}`, this.getStyle('warn'), data || '');
        
        this.storeLog('warn', message, data);
    }

    /**
     * Info log
     */
    info(message, data = null) {
        if (!this.shouldLog('info')) return;
        
        const formatted = this.formatMessage('info', message, data);
        console.log(`%c${formatted}`, this.getStyle('info'), data || '');
        
        this.storeLog('info', message, data);
    }

    /**
     * Debug log
     */
    debug(message, data = null) {
        if (!this.shouldLog('debug')) return;
        
        const formatted = this.formatMessage('debug', message, data);
        console.log(`%c${formatted}`, this.getStyle('debug'), data || '');
        
        this.storeLog('debug', message, data);
    }

    /**
     * Success log
     */
    success(message, data = null) {
        if (!this.shouldLog('info')) return;
        
        const formatted = this.formatMessage('success', message, data);
        console.log(`%c${formatted}`, this.getStyle('success'), data || '');
        
        this.storeLog('success', message, data);
    }

    /**
     * Log with custom level
     */
    log(level, message, data = null) {
        switch (level) {
            case 'error':
                this.error(message, data);
                break;
            case 'warn':
                this.warn(message, data);
                break;
            case 'info':
                this.info(message, data);
                break;
            case 'debug':
                this.debug(message, data);
                break;
            case 'success':
                this.success(message, data);
                break;
            default:
                this.info(message, data);
        }
    }

    /**
     * Log group
     */
    group(title, callback) {
        if (!this.enabled) {
            callback();
            return;
        }
        
        console.group(`%c[${this.moduleName}] ${title}`, this.getStyle('info'));
        callback();
        console.groupEnd();
    }

    /**
     * Log collapsed group
     */
    groupCollapsed(title, callback) {
        if (!this.enabled) {
            callback();
            return;
        }
        
        console.groupCollapsed(`%c[${this.moduleName}] ${title}`, this.getStyle('info'));
        callback();
        console.groupEnd();
    }

    /**
     * Log table
     */
    table(data, columns = null) {
        if (!this.shouldLog('info')) return;
        
        console.log(`%c[${this.moduleName}] Table:`, this.getStyle('info'));
        if (columns) {
            console.table(data, columns);
        } else {
            console.table(data);
        }
    }

    /**
     * Time measurement start
     */
    time(label) {
        if (!this.enabled) return;
        console.time(`[${this.moduleName}] ${label}`);
    }

    /**
     * Time measurement end
     */
    timeEnd(label) {
        if (!this.enabled) return;
        console.timeEnd(`[${this.moduleName}] ${label}`);
    }

    /**
     * Performance measure
     */
    async measure(label, callback) {
        if (!this.enabled) {
            return await callback();
        }
        
        const start = performance.now();
        const result = await callback();
        const duration = performance.now() - start;
        
        this.debug(`${label} took ${duration.toFixed(2)}ms`);
        
        return result;
    }

    /**
     * Assert
     */
    assert(condition, message) {
        if (!this.enabled) return;
        
        if (!condition) {
            this.error(`Assertion failed: ${message}`);
            console.assert(condition, `[${this.moduleName}] ${message}`);
        }
    }

    /**
     * Log object properties
     */
    dir(object, label = 'Object') {
        if (!this.shouldLog('debug')) return;
        
        console.log(`%c[${this.moduleName}] ${label}:`, this.getStyle('debug'));
        console.dir(object);
    }

    /**
     * Log stack trace
     */
    trace(message = 'Trace') {
        if (!this.shouldLog('debug')) return;
        
        console.log(`%c[${this.moduleName}] ${message}`, this.getStyle('debug'));
        console.trace();
    }

    /**
     * Clear console
     */
    clear() {
        console.clear();
        this.info('Console cleared');
    }

    /**
     * Get all stored logs
     */
    getLogs(filter = null) {
        if (filter) {
            return this.logs.filter(log => {
                if (filter.level && log.level !== filter.level) return false;
                if (filter.startTime && log.timestamp < filter.startTime) return false;
                if (filter.endTime && log.timestamp > filter.endTime) return false;
                if (filter.search) {
                    const searchLower = filter.search.toLowerCase();
                    return log.message.toLowerCase().includes(searchLower);
                }
                return true;
            });
        }
        return [...this.logs];
    }

    /**
     * Export logs
     */
    exportLogs(format = 'json') {
        const logs = this.getLogs();
        
        if (format === 'json') {
            return JSON.stringify(logs, null, 2);
        } else if (format === 'csv') {
            let csv = 'Timestamp,Level,Module,Message\n';
            logs.forEach(log => {
                const timestamp = new Date(log.timestamp).toISOString();
                const message = log.message.replace(/"/g, '""');
                csv += `"${timestamp}","${log.level}","${log.module}","${message}"\n`;
            });
            return csv;
        } else if (format === 'text') {
            let text = '';
            logs.forEach(log => {
                const timestamp = new Date(log.timestamp).toISOString();
                text += `[${timestamp}] [${log.module}] [${log.level.toUpperCase()}] ${log.message}\n`;
            });
            return text;
        }
        
        return JSON.stringify(logs);
    }

    /**
     * Download logs
     */
    downloadLogs(format = 'json', filename = null) {
        const content = this.exportLogs(format);
        const blob = new Blob([content], { 
            type: format === 'json' ? 'application/json' : 'text/plain' 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || `meet-logs-${Date.now()}.${format}`;
        a.click();
        
        URL.revokeObjectURL(url);
        
        this.info('Logs downloaded', { format, count: this.logs.length });
    }

    /**
     * Clear stored logs
     */
    clearLogs() {
        this.logs = [];
        this.info('Logs cleared');
    }

    /**
     * Get log statistics
     */
    getStatistics() {
        const stats = {
            total: this.logs.length,
            byLevel: {
                error: 0,
                warn: 0,
                info: 0,
                debug: 0,
                success: 0
            },
            timeRange: {
                first: null,
                last: null
            }
        };
        
        if (this.logs.length > 0) {
            stats.timeRange.first = this.logs[0].timestamp;
            stats.timeRange.last = this.logs[this.logs.length - 1].timestamp;
            
            this.logs.forEach(log => {
                stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
            });
        }
        
        return stats;
    }

    /**
     * Set log level
     */
    setLevel(level) {
        if (!this.levels.hasOwnProperty(level)) {
            this.warn(`Invalid log level: ${level}`);
            return;
        }
        
        this.level = level;
        this.info(`Log level set to: ${level}`);
    }

    /**
     * Enable/disable logging
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        console.log(`[${this.moduleName}] Logging ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Toggle logging
     */
    toggle() {
        this.setEnabled(!this.enabled);
    }
}

/**
 * Create logger instance for a module
 */
function createLogger(moduleName) {
    return new MeetLogger(moduleName);
}

// Create default logger
const logger = new MeetLogger('MeetExt');

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MeetLogger,
        createLogger,
        logger
    };
}

// Make available globally
window.MeetLogger = MeetLogger;
window.createLogger = createLogger;
window.meetLogger = logger;