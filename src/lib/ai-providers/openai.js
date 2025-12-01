/**
 * OpenAI Provider
 * Handles OpenAI API calls
 */

import { getApiKey } from '../../services/api-keys-service.js';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Count tokens (rough estimate)
 */
function estimateTokens(text) {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}

/**
 * Make OpenAI API call
 * @param {Array} messages - Messages array
 * @param {Object} options - API options
 * @returns {Promise<Object>} API response
 */
export async function call(messages, options = {}) {
  const apiKey = await getApiKey('openai');
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const {
    model = 'gpt-4o',
    temperature = 0.7,
    maxTokens = 2000,
    stream = false
  } = options;

  const requestBody = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: stream
  };

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
  }

  if (stream) {
    // Return response for streaming
    return {
      stream: true,
      response: response.body
    };
  }

  const data = await response.json();
  
  // Calculate tokens
  const inputTokens = estimateTokens(messages.map(m => m.content).join(' '));
  const outputTokens = data.usage?.completion_tokens || estimateTokens(data.choices[0]?.message?.content || '');
  const totalTokens = data.usage?.total_tokens || (inputTokens + outputTokens);

  return {
    content: data.choices[0]?.message?.content || '',
    model: data.model,
    provider: 'openai',
    tokens: {
      input: inputTokens,
      output: outputTokens,
      total: totalTokens
    },
    finishReason: data.choices[0]?.finish_reason || 'stop'
  };
}

/**
 * Stream OpenAI API call
 * @param {Array} messages - Messages array
 * @param {Object} options - API options
 * @param {Function} onChunk - Callback for each chunk
 * @returns {Promise<Object>} Final response with tokens
 */
export async function stream(messages, options = {}, onChunk) {
  const apiKey = await getApiKey('openai');
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const {
    model = 'gpt-4o',
    temperature = 0.7,
    maxTokens = 2000
  } = options;

  const requestBody = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: true
  };

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  let inputTokens = estimateTokens(messages.map(m => m.content).join(' '));
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
            const delta = json.choices[0]?.delta?.content;
            
            if (delta) {
              fullContent += delta;
              outputTokens += estimateTokens(delta);
              
              if (onChunk) {
                onChunk(delta);
              }
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
    provider: 'openai',
    tokens: {
      input: inputTokens,
      output: outputTokens,
      total: inputTokens + outputTokens
    }
  };
}

