// background/helpers/streaming-simulator.js
// Simulate streaming for non-streaming responses

/**
 * Simulate streaming by splitting text into chunks and sending them with delays
 * @param {string} text - Full text to stream
 * @param {Function} streamCallback - Callback to send chunks: (message) => void
 * @param {Object} options - Options for streaming simulation
 * @returns {Promise<string>} - The full text (for consistency)
 */
export async function simulateStreaming(text, streamCallback, options = {}) {
  if (!text || !text.trim()) {
    // Empty text - send done immediately
    if (streamCallback) {
      streamCallback({ type: 'done', finalContent: text || '' });
    }
    return text || '';
  }

  const {
    chunkSize = 4, // Characters per chunk (increased for faster streaming)
    delay = 8, // Delay between chunks in ms (8ms = ~125fps for faster streaming)
    minDelay = 5, // Minimum delay even for large chunks
    maxDelay = 15 // Maximum delay for very small chunks
  } = options;

  const chunks = [];
  let currentIndex = 0;

  // Split text into chunks
  // For smoother streaming, split character by character but batch small chunks
  while (currentIndex < text.length) {
    let chunkEnd = currentIndex + chunkSize;
    
    // For very smooth streaming, prefer character-by-character but batch punctuation
    // Don't split in the middle of multi-byte characters (emojis, etc.)
    if (chunkEnd < text.length) {
      // Check if we're in the middle of a multi-byte character
      const charCode = text.charCodeAt(chunkEnd);
      if (charCode >= 0xD800 && charCode <= 0xDFFF) {
        // Surrogate pair - include the next character
        chunkEnd++;
      }
      
      // For smoother effect, don't extend to word boundaries - keep chunks small
      // This creates a more natural typing effect
    }
    
    chunks.push(text.substring(currentIndex, chunkEnd));
    currentIndex = chunkEnd;
  }

  // Send chunks with delays
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    // Calculate dynamic delay based on chunk size
    // Use consistent delay for faster streaming, minimal pause for punctuation
    const isPunctuation = /[.,!?;:]\s*$/.test(chunk);
    const dynamicDelay = isPunctuation 
      ? delay + 3 // Slightly longer pause after punctuation (minimal for faster effect)
      : delay; // Consistent delay for regular characters (8ms = fast streaming)
    
    // Send chunk
    if (streamCallback) {
      streamCallback({ type: 'chunk', chunk: chunk });
    }
    
    // Wait before next chunk (except for last one)
    if (i < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, dynamicDelay));
    }
  }

  // Send done message
  if (streamCallback) {
    streamCallback({ type: 'done', finalContent: text });
  }

  return text;
}

