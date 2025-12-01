/**
 * Anthropic Provider
 * Handles Anthropic Claude API calls
 */

import { getApiKey } from '../../services/api-keys-service.js';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Count tokens (rough estimate)
 */
function estimateTokens(text) {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}

/**
 * Make Anthropic API call
 * @param {Array} messages - Messages array
 * @param {Object} options - API options
 * @returns {Promise<Object>} API response
 */
export async function call(messages, options = {}) {
  const apiKey = await getApiKey('anthropic');
  if (!apiKey) {
    throw new Error('Anthropic API key not configured');
  }

  const {
    model = 'claude-3-5-sonnet-20241022',
    temperature = 0.7,
    maxTokens = 2000
  } = options;

  // Convert messages format (Anthropic uses different format)
  const systemMessage = messages.find(m => m.role === 'system');
  const conversationMessages = messages.filter(m => m.role !== 'system');

  const requestBody = {
    model,
    max_tokens: maxTokens,
    temperature,
    messages: conversationMessages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }))
  };

  if (systemMessage) {
    requestBody.system = systemMessage.content;
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || `Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  
  // Calculate tokens
  const inputTokens = data.usage?.input_tokens || estimateTokens(messages.map(m => m.content).join(' '));
  const outputTokens = data.usage?.output_tokens || estimateTokens(data.content[0]?.text || '');
  const totalTokens = data.usage?.input_tokens + data.usage?.output_tokens || (inputTokens + outputTokens);

  return {
    content: data.content[0]?.text || '',
    model: data.model,
    provider: 'anthropic',
    tokens: {
      input: inputTokens,
      output: outputTokens,
      total: totalTokens
    },
    finishReason: data.stop_reason || 'stop'
  };
}

/**
 * Stream Anthropic API call
 * @param {Array} messages - Messages array
 * @param {Object} options - API options
 * @param {Function} onChunk - Callback for each chunk
 * @returns {Promise<Object>} Final response with tokens
 */
export async function stream(messages, options = {}, onChunk) {
  const apiKey = await getApiKey('anthropic');
  if (!apiKey) {
    throw new Error('Anthropic API key not configured');
  }

  const {
    model = 'claude-3-5-sonnet-20241022',
    temperature = 0.7,
    maxTokens = 2000
  } = options;

  // Convert messages format
  const systemMessage = messages.find(m => m.role === 'system');
  const conversationMessages = messages.filter(m => m.role !== 'system');

  const requestBody = {
    model,
    max_tokens: maxTokens,
    temperature,
    stream: true,
    messages: conversationMessages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }))
  };

  if (systemMessage) {
    requestBody.system = systemMessage.content;
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || `Anthropic API error: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            continue;
          }

          try {
            const json = JSON.parse(data);
            
            if (json.type === 'message_start') {
              inputTokens = json.message.usage?.input_tokens || 0;
            } else if (json.type === 'content_block_delta') {
              const delta = json.delta?.text;
              if (delta) {
                fullContent += delta;
                outputTokens += estimateTokens(delta);
                
                if (onChunk) {
                  onChunk(delta);
                }
              }
            } else if (json.type === 'message_delta') {
              outputTokens = json.usage?.output_tokens || outputTokens;
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return {
    content: fullContent,
    model: model,
    provider: 'anthropic',
    tokens: {
      input: inputTokens,
      output: outputTokens,
      total: inputTokens + outputTokens
    }
  };
}

