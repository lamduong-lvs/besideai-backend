/**
 * OpenAI-Compatible Adapter
 * Works with OpenAI, Groq, Cerebras, and other OpenAI-compatible APIs
 */

import { BaseAdapter } from './base-adapter.js';

export class OpenAIAdapter extends BaseAdapter {
  getRequestURL(modelId) {
    return this.config.baseURL || this.config.defaultBaseURL;
  }
  
  getRequestHeaders(useStreaming = false) {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
    
    if (useStreaming) {
      headers['Accept'] = 'text/event-stream';
    }
    
    return headers;
  }
  
  getRequestBody(messages, modelId, options = {}) {
    const processedMessages = messages.map(msg => {
      if (msg.images && Array.isArray(msg.images) && msg.images.length > 0) {
        const content = [];
        if (msg.content && msg.content.trim()) {
          content.push({
            type: 'text',
            text: msg.content
          });
        }
        msg.images.forEach(imageUrl => {
          content.push({
            type: 'image_url',
            image_url: {
              url: imageUrl
            }
          });
        });
        return {
          role: msg.role === 'ai' || msg.role === 'assistant' ? 'assistant' : (msg.role || 'user'),
          content: content
        };
      }
      return {
        role: msg.role === 'ai' || msg.role === 'assistant' ? 'assistant' : (msg.role || 'user'),
        content: msg.content || ''
      };
    });
    
    return {
      model: modelId,
      messages: processedMessages,
      temperature: options.temperature ?? this.config.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? this.config.maxTokens ?? 4000,
      stream: options.stream === true
    };
  }
  
  parseResponse(response) {
    return response.choices?.[0]?.message?.content || '';
  }
  
  parseStreamChunk(chunk) {
    // OpenAI SSE format
    if (chunk.choices?.[0]?.delta?.content) {
      return chunk.choices[0].delta.content;
    }
    return null;
  }
  
  supportsFiles(modelId) {
    const multimodalModels = [
      'gpt-4o', 'gpt-4-turbo', 'gpt-4-vision-preview', 'gpt-4o-mini',
      'gpt-4', 'gpt-4-1106-preview', 'gpt-4-0125-preview'
    ];
    return multimodalModels.some(m => modelId.includes(m));
  }
}

