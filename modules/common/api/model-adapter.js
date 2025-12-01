/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  MODEL ADAPTER                                                  │
 * │  Unified interface for all AI providers (OpenAI, Anthropic, Google) │
 * └─────────────────────────────────────────────────────────────────┘
 * * This adapter provides a consistent interface for calling different AI APIs,
 * abstracting away provider-specific implementation details.
 *
 * *** PHIÊN BẢN CẬP NHẬT (i18n) ***
 * - Thay thế tất cả các chuỗi Error bằng window.Lang.get()
 */

class ModelAdapter {
    constructor() {
        this.providers = {
            openai: this.callOpenAI.bind(this),
            anthropic: this.callAnthropic.bind(this),
            google: this.callGemini.bind(this)
        };

        console.log('[ModelAdapter] Initialized with providers:', Object.keys(this.providers));
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * MAIN INTERFACE
     * ═══════════════════════════════════════════════════════════════
     */

    /**
     * Send a prompt to any model with unified interface
     * @param {object} modelConfig - Model configuration from storage
     * @param {string} prompt - The prompt to send
     * @param {object} options - Request options
     * @param {AbortSignal} signal - Optional abort signal
     * @returns {Promise<string>} - Model response
     */
    async sendPrompt(modelConfig, prompt, options = {}, signal = null) {
        // Thoát sớm nếu i18n.js chưa sẵn sàng
        if (!window.Lang) {
            console.error("ModelAdapter: window.Lang (i18n.js) is not ready.");
            throw new Error("i18n service not loaded.");
        }
        
        const { provider, id, apiKey } = modelConfig;

        if (!provider || !id || !apiKey) {
            // Dịch lỗi
            throw new Error(window.Lang.get('errorModelConfigInvalid'));
        }

        const providerFunc = this.providers[provider];
        if (!providerFunc) {
            // Dịch lỗi (với biến)
            throw new Error(window.Lang.get('errorModelProviderUnsupported', { provider: provider }));
        }

        console.log(`[ModelAdapter] Sending to ${provider}/${id}...`);
        const startTime = Date.now();

        try {
            const response = await providerFunc(modelConfig, prompt, options, signal);
            const latency = Date.now() - startTime;
            
            console.log(`[ModelAdapter] ✓ Response from ${provider}/${id} in ${latency}ms`);
            
            return response;
        } catch (error) {
            const latency = Date.now() - startTime;
            console.error(`[ModelAdapter] ✗ Error from ${provider}/${id} after ${latency}ms:`, error.message);
            throw error;
        }
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * OPENAI API
     * ═══════════════════════════════════════════════════════════════
     */

    async callOpenAI(modelConfig, prompt, options = {}, signal = null) {
        const { id: model, apiKey } = modelConfig;

        const requestBody = {
            model: model,
            messages: [
                { 
                    role: 'user', 
                    content: prompt 
                }
            ],
            temperature: options.temperature ?? 0.3,
            max_tokens: options.maxTokens ?? 1000
        };

        if (options.topP !== undefined) {
            requestBody.top_p = options.topP;
        }
        if (options.frequencyPenalty !== undefined) {
            requestBody.frequency_penalty = options.frequencyPenalty;
        }
        if (options.presencePenalty !== undefined) {
            requestBody.presence_penalty = options.presencePenalty;
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody),
            signal: signal
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
            // Dịch lỗi (với biến)
            throw new Error(window.Lang.get('errorModelOpenAI', { errorMessage: errorMessage }));
        }

        const data = await response.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            // Dịch lỗi
            throw new Error(window.Lang.get('errorModelOpenAIResponse'));
        }

        return data.choices[0].message.content.trim();
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * ANTHROPIC API
     * ═══════════════════════════════════════════════════════════════
     */

    async callAnthropic(modelConfig, prompt, options = {}, signal = null) {
        const { id: model, apiKey } = modelConfig;

        const requestBody = {
            model: model,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: options.maxTokens ?? 1000,
            temperature: options.temperature ?? 0.3
        };

        if (options.topP !== undefined) {
            requestBody.top_p = options.topP;
        }
        if (options.topK !== undefined) {
            requestBody.top_k = options.topK;
        }

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(requestBody),
            signal: signal
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
            // Dịch lỗi (với biến)
            throw new Error(window.Lang.get('errorModelAnthropic', { errorMessage: errorMessage }));
        }

        const data = await response.json();

        if (!data.content || !data.content[0] || !data.content[0].text) {
            // Dịch lỗi
            throw new Error(window.Lang.get('errorModelAnthropicResponse'));
        }

        return data.content[0].text.trim();
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * GOOGLE GEMINI API
     * ═══════════════════════════════════════════════════════════════
     */

    async callGemini(modelConfig, prompt, options = {}, signal = null) {
        const { id: model, apiKey } = modelConfig;

        const requestBody = {
            contents: [{
                parts: [{ 
                    text: prompt 
                }]
            }],
            generationConfig: {
                temperature: options.temperature ?? 0.3,
                maxOutputTokens: options.maxTokens ?? 1000
            }
        };

        if (options.topP !== undefined) {
            requestBody.generationConfig.topP = options.topP;
        }
        if (options.topK !== undefined) {
            requestBody.generationConfig.topK = options.topK;
        }

        // ✅ Sửa lỗi: Thêm 'models/' vào URL
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody),
            signal: signal
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
            // Dịch lỗi (với biến)
            throw new Error(window.Lang.get('errorModelGemini', { errorMessage: errorMessage }));
        }

        const data = await response.json();

        if (!data.candidates || 
            !data.candidates[0] || 
            !data.candidates[0].content || 
            !data.candidates[0].content.parts ||
            !data.candidates[0].content.parts[0]) {
            // Dịch lỗi
            throw new Error(window.Lang.get('errorModelGeminiResponse'));
        }

        return data.candidates[0].content.parts[0].text.trim();
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * HELPER METHODS
     * ═══════════════════════════════════════════════════════════════
     */

    /**
     * Test if a model is accessible
     * (Không thay đổi - Chỉ có 'OK' không cần dịch)
     */
    async testModel(modelConfig) {
        try {
            const response = await this.sendPrompt(
                modelConfig,
                'Test: Reply with "OK"',
                { maxTokens: 10, temperature: 0 }
            );
            
            return {
                success: true,
                response: response,
                model: modelConfig.id
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                model: modelConfig.id
            };
        }
    }

    /**
     * Get model configuration from storage
     * (Không thay đổi)
     */
    async getModelConfig(modelId) {
        return new Promise((resolve) => {
            chrome.storage.local.get(['aiModels'], (result) => {
                const models = result.aiModels || [];
                const model = models.find(m => m.id === modelId);
                resolve(model || null);
            });
        });
    }

    /**
     * Send to model with automatic config lookup
     * (Cập nhật i18n)
     */
    async sendToModel(modelId, prompt, options = {}, signal = null) {
        // Thoát sớm nếu i18n.js chưa sẵn sàng
        if (!window.Lang) {
            console.error("ModelAdapter: window.Lang (i18n.js) is not ready.");
            throw new Error("i18n service not loaded.");
        }
        
        const modelConfig = await this.getModelConfig(modelId);
        
        if (!modelConfig) {
            // Dịch lỗi (với biến)
            throw new Error(window.Lang.get('errorModelNotFound', { modelId: modelId }));
        }

        if (!modelConfig.enabled) {
            // Dịch lỗi (với biến)
            throw new Error(window.Lang.get('errorModelDisabled', { modelId: modelId }));
        }

        return this.sendPrompt(modelConfig, prompt, options, signal);
    }

    /**
     * Batch send to multiple models
     * (Không thay đổi)
     */
    async sendToMultipleModels(modelIds, prompt, options = {}) {
        const promises = modelIds.map(async (modelId) => {
            const startTime = Date.now();
            try {
                const response = await this.sendToModel(modelId, prompt, options);
                return {
                    modelId,
                    success: true,
                    response,
                    latency: Date.now() - startTime
                };
            } catch (error) {
                return {
                    modelId,
                    success: false,
                    error: error.message,
                    latency: Date.now() - startTime
                };
            }
        });

        return Promise.all(promises);
    }

    /**
     * Estimate token count
     * (Không thay đổi)
     */
    estimateTokens(text) {
        return Math.ceil(text.length / 4);
    }

    /**
     * Check if provider is supported
     * (Không thay đổi)
     */
    isProviderSupported(provider) {
        return provider in this.providers;
    }

    /**
     * Get supported providers
     * (Không thay đổi)
     */
    getSupportedProviders() {
        return Object.keys(this.providers);
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModelAdapter;
}

// Make available globally
window.ModelAdapter = ModelAdapter;

console.log('[ModelAdapter] Module loaded ✓');