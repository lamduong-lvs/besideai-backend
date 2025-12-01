/**
 * PDF Processor
 * Handles PDF file validation and processing
 */

import { PDF_CHAT_CONFIG } from '../config/pdf-chat-config.js';

export class PDFProcessor {
  constructor() {
    this.currentFile = null;
    this.fileData = null;
  }

  /**
   * Check if a file is currently processed
   */
  hasFile() {
    return !!this.fileData;
  }

  /**
   * Validate PDF file
   */
  validateFile(file) {
    const errors = [];

    // Check file type
    if (!file.type || file.type !== 'application/pdf') {
      errors.push({
        code: 'INVALID_TYPE',
        message: 'pdfChatErrorFileType'
      });
    }

    // Check file size
    if (file.size > PDF_CHAT_CONFIG.maxFileSize) {
      errors.push({
        code: 'FILE_TOO_LARGE',
        message: 'pdfChatErrorFileSize'
      });
    }

    // Check if file is empty
    if (file.size === 0) {
      errors.push({
        code: 'EMPTY_FILE',
        message: 'pdfChatErrorEmptyFile'
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Process PDF file - Convert to base64 for Gemini API
   * @param {File} file - PDF file to process
   * @param {Function} onProgress - Callback function(progress: number) to update progress (0-100)
   */
  async processFile(file, onProgress = null) {
    console.log('[PDFProcessor] Processing file:', file.name);

    try {
      // Validate first
      if (onProgress) onProgress(5);
      const validation = this.validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.errors[0].message);
      }

      // Store file reference
      this.currentFile = file;
      if (onProgress) onProgress(10);

      // Convert to ArrayBuffer then to base64
      if (onProgress) onProgress(15);
      const arrayBuffer = await this.readFileAsArrayBuffer(file, (progress) => {
        // Reading file: 15-40% (25% range)
        if (onProgress) onProgress(15 + (progress * 0.25));
      });
      
      if (onProgress) onProgress(40);
      const base64 = await this.arrayBufferToBase64(arrayBuffer, (progress) => {
        // Converting to base64: 40-60% (20% range)
        if (onProgress) onProgress(40 + (progress * 0.20));
      });

      // Extract number of pages from PDF
      if (onProgress) onProgress(60);
      const numPages = await this.extractPageCount(arrayBuffer);

      // Store file data
      if (onProgress) onProgress(62);
      this.fileData = {
        name: file.name,
        size: file.size,
        type: file.type,
        base64: base64,
        mimeType: 'application/pdf',
        numPages: numPages,
        uploadedAt: Date.now()
      };

      if (onProgress) onProgress(65);
      console.log('[PDFProcessor] File processed successfully, pages:', numPages);

      return {
        success: true,
        data: {
          fileName: file.name,
          fileSize: file.size,
          numPages: numPages,
          base64Data: base64,
          mimeType: 'application/pdf'
        }
      };

    } catch (error) {
      console.error('[PDFProcessor] Error processing file:', error);
      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Read file as ArrayBuffer
   * @param {File} file - File to read
   * @param {Function} onProgress - Optional progress callback
   */
  readFileAsArrayBuffer(file, onProgress = null) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        if (onProgress) onProgress(100);
        resolve(e.target.result);
      };

      reader.onerror = (e) => {
        reject(new Error('Failed to read file'));
      };

      // FileReader doesn't support progress events for readAsArrayBuffer
      // So we simulate progress based on file size
      if (onProgress && file.size > 0) {
        // Simulate progress: start at 0, end at 100 when loaded
        let progress = 0;
        const interval = setInterval(() => {
          progress = Math.min(progress + 10, 90);
          onProgress(progress);
          if (progress >= 90) {
            clearInterval(interval);
          }
        }, 50);
        
        reader.onloadend = () => {
          clearInterval(interval);
          if (onProgress) onProgress(100);
        };
      }

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Convert ArrayBuffer to base64
   * @param {ArrayBuffer} buffer - Buffer to convert
   * @param {Function} onProgress - Optional progress callback
   */
  arrayBufferToBase64(buffer, onProgress = null) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    const chunkSize = Math.max(1, Math.floor(len / 100)); // Process in chunks for progress

    return new Promise((resolve) => {
      const processChunk = (start) => {
        const end = Math.min(start + chunkSize, len);
        
        for (let i = start; i < end; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        
        if (onProgress) {
          const progress = Math.floor((end / len) * 100);
          onProgress(progress);
        }
        
        if (end < len) {
          // Use setTimeout to avoid blocking UI
          setTimeout(() => processChunk(end), 0);
        } else {
          resolve(btoa(binary));
        }
      };
      
      processChunk(0);
    });
  }

  /**
   * Extract page count from PDF
   * @param {ArrayBuffer} arrayBuffer - PDF file as ArrayBuffer
   * @returns {Promise<number>} Number of pages
   */
  async extractPageCount(arrayBuffer) {
    try {
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Read entire file to ensure we catch all page count references
      // PDFs can have nested page trees, so we need to find the root /Count
      const text = new TextDecoder('latin1').decode(uint8Array);
      
      // Method 1: Find all /Count values in Pages objects and take the maximum
      // PDFs can have nested page trees, the root tree will have the total count
      const countMatches = [];
      
      // Pattern 1: Find /Type /Pages followed by /Count (most common)
      // This handles both single-line and multi-line formats
      const pagesCountPattern = /\/Type\s*\/Pages[\s\S]{0,2000}?\/Count\s+(\d+)/g;
      let match;
      while ((match = pagesCountPattern.exec(text)) !== null) {
        const count = parseInt(match[1], 10);
        if (count > 0 && count <= 10000) {
          countMatches.push(count);
        }
      }
      
      // Pattern 2: Find /Count that appears after /Pages (even without /Type)
      // Some PDFs have different structures
      const pagesCountPattern2 = /\/Pages[\s\S]{0,2000}?\/Count\s+(\d+)/g;
      while ((match = pagesCountPattern2.exec(text)) !== null) {
        const count = parseInt(match[1], 10);
        if (count > 0 && count <= 10000 && !countMatches.includes(count)) {
          countMatches.push(count);
        }
      }
      
      // Pattern 3: Look for /Count in dictionary objects that might be page trees
      // Format: << ... /Type /Pages ... /Count N ... >>
      const dictPattern = /<<[\s\S]{0,2000}?\/Type\s*\/Pages[\s\S]{0,2000}?\/Count\s+(\d+)[\s\S]{0,2000}?>>/g;
      while ((match = dictPattern.exec(text)) !== null) {
        const count = parseInt(match[1], 10);
        if (count > 0 && count <= 10000 && !countMatches.includes(count)) {
          countMatches.push(count);
        }
      }
      
      // If we found multiple counts, take the maximum (root page tree)
      if (countMatches.length > 0) {
        const maxCount = Math.max(...countMatches);
        console.log('[PDFProcessor] Page count found:', maxCount, '(from', countMatches.length, 'matches:', countMatches.join(', '), ')');
        return maxCount;
      }
      
      // Method 2: Count /Page objects (works for simple PDFs without page trees)
      // Look for /Type /Page (not /Pages) - these are actual page objects
      const pageMatches = text.match(/\/Type\s*\/Page\b/g);
      if (pageMatches && pageMatches.length > 0) {
        const count = pageMatches.length;
        if (count > 0 && count <= 10000) {
          console.log('[PDFProcessor] Page count found via /Page objects:', count);
          return count;
        }
      }
      
      // Method 3: Count page references in /Kids arrays
      // This works for PDFs with page trees where /Count might be missing
      const kidsMatches = text.match(/\/Kids\s*\[\s*([^\]]+)\]/g);
      if (kidsMatches) {
        let totalKids = 0;
        for (const kidsMatch of kidsMatches) {
          // Count object references (format: N M R)
          const refs = kidsMatch.match(/\d+\s+\d+\s+R/g);
          if (refs) {
            totalKids += refs.length;
          }
        }
        // Only use this if we found a reasonable number
        if (totalKids > 0 && totalKids <= 10000) {
          console.log('[PDFProcessor] Page count found via /Kids arrays:', totalKids);
          return totalKids;
        }
      }
      
      // Method 4: Try to find the root page tree object
      // Look for the Pages object that's referenced in the Catalog
      const catalogPattern = /\/Type\s*\/Catalog[\s\S]{0,500}?\/Pages\s+(\d+)\s+(\d+)\s+R/;
      const catalogMatch = text.match(catalogPattern);
      if (catalogMatch) {
        // Find the referenced object
        const objNum = catalogMatch[1];
        const genNum = catalogMatch[2];
        const objPattern = new RegExp(`${objNum}\\s+${genNum}\\s+obj[\\s\\S]{0,2000}?\/Type\\s*\/Pages[\\s\\S]{0,2000}?\/Count\\s+(\\d+)`, 'i');
        const objMatch = text.match(objPattern);
        if (objMatch && objMatch[3]) {
          const count = parseInt(objMatch[3], 10);
          if (count > 0 && count <= 10000) {
            console.log('[PDFProcessor] Page count found via Catalog reference:', count);
            return count;
          }
        }
      }
      
      // Fallback: return null if cannot determine
      console.warn('[PDFProcessor] Could not determine page count from PDF');
      return null;
    } catch (error) {
      console.error('[PDFProcessor] Error extracting page count:', error);
      return null;
    }
  }

  /**
   * Get current file info
   */
  getCurrentFileInfo() {
    if (!this.fileData) {
      return null;
    }

    return {
      fileName: this.fileData.name,
      fileSize: this.fileData.size,
      numPages: this.fileData.numPages || null,
      uploadedAt: this.fileData.uploadedAt
    };
  }

  /**
   * Get file data for Gemini API
   */
  getFileDataForAPI() {
    if (!this.fileData) {
      return null;
    }

    return {
      inlineData: {
        data: this.fileData.base64,
        mimeType: this.fileData.mimeType
      }
    };
  }

  /**
   * Clear current file and free memory
   */
  clear() {
    // Clear references to allow garbage collection
    if (this.fileData) {
      this.fileData.base64 = null;
      this.fileData = null;
    }
    this.currentFile = null;

    console.log('[PDFProcessor] Cleared and freed memory');
  }

  /**
   * Get memory usage info
   */
  getMemoryInfo() {
    if (!this.fileData) return { size: 0 };

    // Estimate memory usage (base64 is ~33% larger than original)
    const estimatedSize = this.fileData.size * 1.33;
    return {
      originalSize: this.fileData.size,
      estimatedMemory: estimatedSize,
      fileName: this.fileData.name
    };
  }
}

