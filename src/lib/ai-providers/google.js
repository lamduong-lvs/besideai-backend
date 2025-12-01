/**
 * Google AI Provider
 * Handles Google Gemini API calls
 */

import { getApiKey } from '../../services/api-keys-service.js';

const GOOGLE_AI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Count tokens (rough estimate)
 */
function estimateTokens(text) {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}

/**
 * Make Google AI API call
 * @param {Array} messages - Messages array
 * @param {Object} options - API options
 * @returns {Promise<Object>} API response
 */
export async function call(messages, options = {}) {
  const apiKey = await getApiKey('google');
  if (!apiKey) {
    throw new Error('Google AI API key not configured');
  }

  const {
    model = 'gemini-1.5-flash',
    temperature = 0.7,
    maxTokens = 2000
  } = options;

  // Convert messages format (Google uses different format)
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

  const systemInstruction = messages.find(m => m.role === 'system')?.content;

  const requestBody = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens
    }
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  const url = `${GOOGLE_AI_API_URL}/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || `Google AI API error: ${response.status}`);
  }

  const data = await response.json();
  
  // Calculate tokens
  const inputTokens = data.usageMetadata?.promptTokenCount || estimateTokens(messages.map(m => m.content).join(' '));
  const outputTokens = data.usageMetadata?.candidatesTokenCount || estimateTokens(data.candidates[0]?.content?.parts[0]?.text || '');
  const totalTokens = data.usageMetadata?.totalTokenCount || (inputTokens + outputTokens);

  return {
    content: data.candidates[0]?.content?.parts[0]?.text || '',
    model: model,
    provider: 'google',
    tokens: {
      input: inputTokens,
      output: outputTokens,
      total: totalTokens
    },
    finishReason: data.candidates[0]?.finishReason || 'STOP'
  };
}

/**
 * Stream Google AI API call
 * @param {Array} messages - Messages array
 * @param {Object} options - API options
 * @param {Function} onChunk - Callback for each chunk
 * @returns {Promise<Object>} Final response with tokens
 */
export async function stream(messages, options = {}, onChunk) {
  const apiKey = await getApiKey('google');
  if (!apiKey) {
    throw new Error('Google AI API key not configured');
  }

  const {
    model = 'gemini-1.5-flash',
    temperature = 0.7,
    maxTokens = 2000
  } = options;

  // Convert messages format
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

  const systemInstruction = messages.find(m => m.role === 'system')?.content;

  const requestBody = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens
    }
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  const url = `${GOOGLE_AI_API_URL}/${model}:streamGenerateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || `Google AI API error: ${response.status}`);
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
        try {
          const json = JSON.parse(line);
          
          if (json.candidates && json.candidates[0]?.content?.parts) {
            const delta = json.candidates[0].content.parts[0]?.text;
            if (delta) {
              fullContent += delta;
              outputTokens += estimateTokens(delta);
              
              if (onChunk) {
                onChunk(delta);
              }
            }
          }

          if (json.usageMetadata) {
            inputTokens = json.usageMetadata.promptTokenCount || inputTokens;
            outputTokens = json.usageMetadata.candidatesTokenCount || outputTokens;
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return {
    content: fullContent,
    model: model,
    provider: 'google',
    tokens: {
      input: inputTokens,
      output: outputTokens,
      total: inputTokens + outputTokens
    }
  };
}

