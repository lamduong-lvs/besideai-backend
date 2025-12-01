/**
 * Google AI Adapter
 */

import { BaseAdapter } from './base-adapter.js';

export class GoogleAIAdapter extends BaseAdapter {
  getRequestURL(modelId) {
    const baseURL = this.config.baseURL || this.config.defaultBaseURL;
    return `${baseURL}/${modelId}:generateContent?key=${this.config.apiKey}`;
  }
  
  getRequestHeaders(useStreaming = false) {
    return {
      'Content-Type': 'application/json'
    };
  }
  
  getRequestBody(messages, modelId, options = {}) {
    const googleContents = [];
    let systemInstruction = null;
    
    messages.forEach(msg => {
      if (msg.role === 'system') {
        systemInstruction = msg.content;
      } else {
        const role = msg.role === 'assistant' || msg.role === 'ai' ? 'model' : 'user';
        
        if (Array.isArray(msg.content)) {
          const parts = msg.content.map(item => {
            if (item.type === 'text') {
              return { text: item.text };
            } else if (item.type === 'image_url') {
              return {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: item.image_url.url.split(',')[1] || item.image_url.url
                }
              };
            }
            return null;
          }).filter(Boolean);
          
          if (parts.length > 0) {
            googleContents.push({ role, parts });
          }
        } else if (msg.images && Array.isArray(msg.images) && msg.images.length > 0) {
          const parts = [];
          if (msg.content && msg.content.trim()) {
            parts.push({ text: msg.content });
          }
          msg.images.forEach(imageUrl => {
            parts.push({
              inlineData: {
                mimeType: 'image/jpeg',
                data: imageUrl.split(',')[1] || imageUrl
              }
            });
          });
          googleContents.push({ role, parts });
        } else if (typeof msg.content === 'string') {
          googleContents.push({
            role,
            parts: [{ text: msg.content }]
          });
        }
      }
    });
    
    const body = {
      contents: googleContents,
      generationConfig: {
        temperature: options.temperature ?? this.config.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? this.config.maxTokens ?? 4000
      }
    };
    
    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }
    
    return body;
  }
  
  parseResponse(response) {
    const candidate = response.candidates?.[0];
    if (candidate && candidate.content && candidate.content.parts) {
      return candidate.content.parts
        .map(part => part.text || '')
        .filter(text => text)
        .join('');
    }
    return '';
  }
  
  parseStreamChunk(chunk) {
    // Google AI streaming format
    if (chunk.candidates?.[0]?.content?.parts) {
      return chunk.candidates[0].content.parts
        .map(part => part.text || '')
        .join('');
    }
    return null;
  }
  
  supportsFiles(modelId) {
    return true; // Google AI models generally support images
  }
}

