/**
 * Message Processor for AI Module
 * Handles message formatting and processing
 */

/**
 * Process messages for API call
 * Handles images, attached files, and role conversion
 */
export function processMessages(messages, options = {}) {
  const {
    includeImages = true,
    includeAttachedFiles = true,
    convertRoles = true
  } = options;
  
  return messages.map((msg, index) => {
    const isLastMessage = index === messages.length - 1;
    const processed = { ...msg };
    
    // Handle role conversion
    if (convertRoles) {
      if (processed.role === 'ai' || processed.role === 'assistant') {
        processed.role = 'assistant';
      } else if (!processed.role || processed.role === 'user') {
        processed.role = 'user';
      }
    }
    
    // Handle images (only for last message if specified)
    if (includeImages && isLastMessage && msg.images && msg.images.length > 0) {
      processed.images = msg.images;
    } else if (!includeImages) {
      delete processed.images;
    }
    
    // Handle attached files
    if (includeAttachedFiles && msg.attachedFiles && msg.attachedFiles.length > 0) {
      processed.attachedFiles = msg.attachedFiles;
    } else if (!includeAttachedFiles) {
      delete processed.attachedFiles;
    }
    
    return processed;
  });
}

/**
 * Check if messages contain files (images or attachments)
 */
export function hasFiles(messages) {
  if (!Array.isArray(messages)) return false;
  
  return messages.some(msg => {
    const hasImages = msg.images && Array.isArray(msg.images) && msg.images.length > 0;
    const hasAttachedFiles = msg.attachedFiles && Array.isArray(msg.attachedFiles) && msg.attachedFiles.length > 0;
    return hasImages || hasAttachedFiles;
  });
}

/**
 * Filter models that support files
 */
export function filterModelsSupportingFiles(fullModelIds, checkModelSupportsFiles, apiManager) {
  const supporting = [];
  const notSupporting = [];
  
  for (const fullModelId of fullModelIds) {
    const separatorIndex = fullModelId.indexOf('/');
    if (separatorIndex === -1) continue;
    
    const providerId = fullModelId.substring(0, separatorIndex);
    const modelId = fullModelId.substring(separatorIndex + 1);
    const providerConfig = apiManager.getProvider(providerId);
    
    const supportsFiles = checkModelSupportsFiles(providerId, modelId, providerConfig?.type);
    
    if (supportsFiles) {
      supporting.push(fullModelId);
    } else {
      notSupporting.push(fullModelId);
    }
  }
  
  return { supporting, notSupporting };
}

