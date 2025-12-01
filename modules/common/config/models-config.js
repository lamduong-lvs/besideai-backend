/**
 * AI Models Configuration
 * Cấu hình các AI models cho translation và summarization
 */

const ModelsConfig = {
    /**
     * Translation Models
     */
    translation: {
        // Google Translate (Free)
        google: {
            id: 'google-translate',
            name: 'Google Translate',
            provider: 'google',
            free: true,
            description: 'Dịch miễn phí, tốc độ nhanh, không cần API key',
            features: [
                'Miễn phí 100%',
                'Hỗ trợ 100+ ngôn ngữ',
                'Tốc độ dịch nhanh',
                'Không giới hạn request'
            ],
            limits: {
                maxLength: 5000, // characters per request
                rateLimit: null // unlimited
            },
            cost: 'Free',
            apiKeyRequired: false
        },

        // Google Gemini
        gemini: {
            id: 'gemini-1.5-flash',
            name: 'Gemini 1.5 Flash',
            provider: 'gemini',
            free: false,
            description: 'Dịch chất lượng cao với context awareness',
            features: [
                'Chất lượng dịch tốt',
                'Hiểu context',
                'Giá rẻ',
                'Tốc độ nhanh'
            ],
            limits: {
                maxLength: 30000, // characters per request
                rateLimit: 60 // requests per minute
            },
            cost: '$0.075 / 1M tokens (input), $0.30 / 1M tokens (output)',
            apiKeyRequired: true,
            pricing: {
                inputTokens: 0.075, // per 1M tokens
                outputTokens: 0.30  // per 1M tokens
            }
        },

        // OpenAI GPT-3.5
        'openai-3.5': {
            id: 'gpt-3.5-turbo',
            name: 'GPT-3.5 Turbo',
            provider: 'openai',
            free: false,
            description: 'Dịch nhanh với chi phí thấp',
            features: [
                'Dịch chính xác',
                'Tốc độ cao',
                'Chi phí hợp lý',
                'Hỗ trợ nhiều ngôn ngữ'
            ],
            limits: {
                maxLength: 4096, // tokens per request
                rateLimit: 60 // requests per minute
            },
            cost: '$0.50 / 1M tokens (input), $1.50 / 1M tokens (output)',
            apiKeyRequired: true,
            pricing: {
                inputTokens: 0.50,
                outputTokens: 1.50
            }
        },

        // OpenAI GPT-4
        'openai-4': {
            id: 'gpt-4-turbo-preview',
            name: 'GPT-4 Turbo',
            provider: 'openai',
            free: false,
            description: 'Chất lượng dịch tốt nhất, hiểu sâu context',
            features: [
                'Chất lượng tốt nhất',
                'Hiểu context sâu',
                'Dịch tự nhiên',
                'Xử lý văn bản phức tạp'
            ],
            limits: {
                maxLength: 128000, // tokens per request
                rateLimit: 40 // requests per minute
            },
            cost: '$10 / 1M tokens (input), $30 / 1M tokens (output)',
            apiKeyRequired: true,
            pricing: {
                inputTokens: 10,
                outputTokens: 30
            }
        }
    },

    /**
     * Summarization Models
     */
    summarization: {
        // Gemini 1.5 Flash
        'gemini-flash': {
            id: 'gemini-1.5-flash',
            name: 'Gemini 1.5 Flash',
            provider: 'gemini',
            free: false,
            recommended: true,
            description: 'Tóm tắt nhanh, chất lượng cao, giá rẻ',
            features: [
                'Tốc độ nhanh',
                'Chất lượng tốt',
                'Giá rẻ nhất',
                'Context window lớn'
            ],
            limits: {
                maxTokens: 1000000, // input tokens
                outputTokens: 8192,
                rateLimit: 60
            },
            cost: '$0.075 / 1M tokens (input), $0.30 / 1M tokens (output)',
            apiKeyRequired: true,
            contextWindow: 1000000,
            pricing: {
                inputTokens: 0.075,
                outputTokens: 0.30
            }
        },

        // Gemini 1.5 Pro
        'gemini-pro': {
            id: 'gemini-1.5-pro',
            name: 'Gemini 1.5 Pro',
            provider: 'gemini',
            free: false,
            description: 'Tóm tắt chi tiết, phân tích sâu',
            features: [
                'Chất lượng cao nhất',
                'Phân tích sâu',
                'Context window rất lớn',
                'Xử lý meeting dài'
            ],
            limits: {
                maxTokens: 2000000, // input tokens
                outputTokens: 8192,
                rateLimit: 60
            },
            cost: '$1.25 / 1M tokens (input), $5.00 / 1M tokens (output)',
            apiKeyRequired: true,
            contextWindow: 2000000,
            pricing: {
                inputTokens: 1.25,
                outputTokens: 5.00
            }
        },

        // OpenAI GPT-3.5 Turbo
        'openai-3.5-turbo': {
            id: 'gpt-3.5-turbo',
            name: 'GPT-3.5 Turbo',
            provider: 'openai',
            free: false,
            description: 'Tóm tắt nhanh, giá hợp lý',
            features: [
                'Tốc độ cao',
                'Chi phí thấp',
                'Tóm tắt chính xác',
                'Ổn định'
            ],
            limits: {
                maxTokens: 16385, // input tokens
                outputTokens: 4096,
                rateLimit: 60
            },
            cost: '$0.50 / 1M tokens (input), $1.50 / 1M tokens (output)',
            apiKeyRequired: true,
            contextWindow: 16385,
            pricing: {
                inputTokens: 0.50,
                outputTokens: 1.50
            }
        },

        // OpenAI GPT-4 Turbo
        'openai-4-turbo': {
            id: 'gpt-4-turbo-preview',
            name: 'GPT-4 Turbo',
            provider: 'openai',
            free: false,
            description: 'Tóm tắt chất lượng tốt nhất, phân tích chuyên sâu',
            features: [
                'Chất lượng tốt nhất',
                'Phân tích chuyên sâu',
                'Hiểu context tốt',
                'Tóm tắt tự nhiên'
            ],
            limits: {
                maxTokens: 128000, // input tokens
                outputTokens: 4096,
                rateLimit: 40
            },
            cost: '$10 / 1M tokens (input), $30 / 1M tokens (output)',
            apiKeyRequired: true,
            contextWindow: 128000,
            pricing: {
                inputTokens: 10,
                outputTokens: 30
            }
        }
    },

    /**
     * Model Selection Strategies
     */
    strategies: {
        // Chiến lược cho translation
        translation: {
            fastest: 'google', // Nhanh nhất
            cheapest: 'google', // Rẻ nhất
            bestQuality: 'openai-4', // Chất lượng tốt nhất
            recommended: 'google', // Khuyên dùng
            balanced: 'gemini' // Cân bằng giá/chất lượng
        },

        // Chiến lược cho summarization
        summarization: {
            fastest: 'gemini-flash',
            cheapest: 'gemini-flash',
            bestQuality: 'openai-4-turbo',
            recommended: 'gemini-flash',
            balanced: 'gemini-flash'
        }
    },

    /**
     * Auto Selection Rules
     */
    autoSelection: {
        // Chọn model dựa vào độ dài input
        byLength: {
            translation: [
                { maxLength: 1000, model: 'google' },
                { maxLength: 10000, model: 'gemini' },
                { maxLength: Infinity, model: 'gemini' }
            ],
            summarization: [
                { maxTokens: 50000, model: 'gemini-flash' },
                { maxTokens: 500000, model: 'gemini-flash' },
                { maxTokens: Infinity, model: 'gemini-pro' }
            ]
        },

        // Chọn model dựa vào budget
        byBudget: {
            free: {
                translation: 'google',
                summarization: null // No free option
            },
            low: {
                translation: 'gemini',
                summarization: 'gemini-flash'
            },
            medium: {
                translation: 'gemini',
                summarization: 'gemini-flash'
            },
            high: {
                translation: 'openai-4',
                summarization: 'openai-4-turbo'
            }
        }
    },

    /**
     * Rate Limiting Configuration
     */
    rateLimits: {
        google: {
            requestsPerMinute: null, // unlimited
            requestsPerDay: null
        },
        gemini: {
            requestsPerMinute: 60,
            requestsPerDay: 1500
        },
        openai: {
            requestsPerMinute: 60,
            requestsPerDay: 10000
        }
    }
};

/**
 * Get model configuration
 */
function getModelConfig(modelId, type = 'translation') {
    return ModelsConfig[type]?.[modelId] || null;
}

/**
 * Get recommended model
 */
function getRecommendedModel(type = 'translation', criteria = 'recommended') {
    const modelId = ModelsConfig.strategies[type]?.[criteria];
    return getModelConfig(modelId, type);
}

/**
 * Get all models for a type
 */
function getAllModels(type = 'translation') {
    return ModelsConfig[type] || {};
}

/**
 * Select best model based on input
 */
function selectBestModel(type, inputLength, budget = 'low') {
    const rules = ModelsConfig.autoSelection.byLength[type];
    
    if (!rules) {
        return getRecommendedModel(type);
    }

    // Find by length
    for (const rule of rules) {
        const maxKey = type === 'translation' ? 'maxLength' : 'maxTokens';
        if (inputLength <= rule[maxKey]) {
            return getModelConfig(rule.model, type);
        }
    }

    // Fallback to budget-based
    const budgetModel = ModelsConfig.autoSelection.byBudget[budget]?.[type];
    return getModelConfig(budgetModel, type);
}

/**
 * Calculate estimated cost
 */
function estimateCost(modelId, type, inputTokens, outputTokens = 0) {
    const model = getModelConfig(modelId, type);
    
    if (!model || model.free) {
        return 0;
    }

    const inputCost = (inputTokens / 1000000) * model.pricing.inputTokens;
    const outputCost = (outputTokens / 1000000) * model.pricing.outputTokens;

    return inputCost + outputCost;
}

/**
 * Check if API key is required
 */
function requiresApiKey(modelId, type = 'translation') {
    const model = getModelConfig(modelId, type);
    return model?.apiKeyRequired || false;
}

/**
 * Get provider from model ID
 */
function getProvider(modelId, type = 'translation') {
    const model = getModelConfig(modelId, type);
    return model?.provider || null;
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ModelsConfig,
        getModelConfig,
        getRecommendedModel,
        getAllModels,
        selectBestModel,
        estimateCost,
        requiresApiKey,
        getProvider
    };
}

// Make available globally
window.ModelsConfig = ModelsConfig;
window.getModelConfig = getModelConfig;
window.getRecommendedModel = getRecommendedModel;
window.getAllModels = getAllModels;
window.selectBestModel = selectBestModel;
window.estimateCost = estimateCost;
window.requiresApiKey = requiresApiKey;
window.getProvider = getProvider;