/**
 * Anthropic Adapter
 */

import { BaseAdapter } from './base-adapter.js';

export class AnthropicAdapter extends BaseAdapter {
  getRequestURL(modelId) {
    return this.config.baseURL || this.config.defaultBaseURL;
  }
  
  getRequestHeaders(useStreaming = false) {
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': this.config.apiKey,
      'anthropic-version': this.config.anthropicVersion || '2023-06-01'
    };
    
    if (useStreaming) {
      headers['Accept'] = 'text/event-stream';
    }
    
    return headers;
  }
  
  getRequestBody(messages, modelId, options = {}) {
    // Anthropic doesn't support system messages in the same way
    const anthropicMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => {
        if (m.images && Array.isArray(m.images) && m.images.length > 0) {
          const content = [];
          if (m.content && m.content.trim()) {
            content.push({
              type: 'text',
              text: m.content
            });
          }
          m.images.forEach(imageUrl => {
            content.push({
              type: 'image',
              source: {
                type: 'url',
                url: imageUrl
              }
            });
          });
          return {
            role: m.role === 'ai' || m.role === 'assistant' ? 'assistant' : 'user',
            content: content
          };
        }
        return {
          role: m.role === 'ai' || m.role === 'assistant' ? 'assistant' : 'user',
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
        };
      });
    
    const body = {
      model: modelId,
      messages: anthropicMessages,
      temperature: options.temperature ?? this.config.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? this.config.maxTokens ?? 4000,
      stream: options.stream === true
    };
    
    // Add system message if present
    const systemMessage = messages.find(m => m.role === 'system');
    if (systemMessage) {
      body.system = systemMessage.content;
    }
    
    return body;
  }
  
  parseResponse(response) {
    return response.content?.[0]?.text || '';
  }
  
  parseStreamChunk(chunk) {
    // Anthropic SSE format
    if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
      return chunk.delta.text;
    }
    if (chunk.delta?.text) {
      return chunk.delta.text;
    }
    return null;
  }
  
  supportsFiles(modelId) {
    return modelId.includes('claude-3') || 
           modelId.includes('claude-3.5') || 
           modelId.includes('claude-3-opus') || 
           modelId.includes('claude-3-sonnet') || 
           modelId.includes('claude-3-haiku');
  }
}

