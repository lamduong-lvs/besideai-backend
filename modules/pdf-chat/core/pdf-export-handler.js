/**
 * PDF Export Handler
 * Export PDF chat conversations to Google Docs and Google Sheets
 */

export class PDFExportHandler {
  constructor() {
    this.Lang = window.Lang;
  }
  
  /**
   * Get auth token via background script
   */
  async getAuthToken() {
    console.log('[PDFExportHandler] Requesting auth token...');
    
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ 
        type: 'auth',
        action: 'auth_get_token' 
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[PDFExportHandler] Runtime error:', chrome.runtime.lastError.message);
          return reject(new Error('Failed to communicate with background script'));
        }
        
        if (!response) {
          console.error('[PDFExportHandler] No response from background script');
          return reject(new Error('No response from authentication service'));
        }
        
        if (response.success && response.token) {
          console.log('[PDFExportHandler] Token received successfully');
          resolve(response.token);
        } else {
          console.error('[PDFExportHandler] Auth failed:', response?.error);
          reject(new Error(response?.error || 'Authentication failed. Please sign in to your Google account.'));
        }
      });
    });
  }
  
  /**
   * Export to Google Docs
   * @param {Object} pdfInfo - PDF file information
   * @param {string} extractedContent - Extracted text content from PDF
   * @param {boolean} includeMetadata - Whether to include metadata (default: false for clean export)
   */
  async exportToDocs(pdfInfo, extractedContent, includeMetadata = false) {
    console.log('[PDFExportHandler] Exporting to Google Docs...');
    
    try {
      const token = await this.getAuthToken();
      
      // Create document title
      const timestamp = new Date().toLocaleString('vi-VN');
      const title = includeMetadata 
        ? `${pdfInfo.fileName.replace('.pdf', '')} - ${timestamp}`
        : pdfInfo.fileName.replace('.pdf', '');
      
      // Build document content (clean content only, no metadata)
      const content = this.buildDocsContentFromExtraction(pdfInfo, extractedContent, includeMetadata);
      
      // Create document
      const docId = await this.createGoogleDoc(token, title, content);
      
      console.log('[PDFExportHandler] Document created:', docId);
      
      return {
        success: true,
        docId: docId,
        url: `https://docs.google.com/document/d/${docId}/edit`
      };
      
    } catch (error) {
      console.error('[PDFExportHandler] Export to Docs failed:', error);
      throw error;
    }
  }
  
  /**
   * Export to Google Sheets
   * @param {Object} pdfInfo - PDF file information
   * @param {string} extractedContent - Extracted text content from PDF
   * @param {boolean} includeMetadata - Whether to include metadata (default: false for clean export)
   */
  async exportToSheets(pdfInfo, extractedContent, includeMetadata = false) {
    console.log('[PDFExportHandler] Exporting to Google Sheets...');
    
    try {
      const token = await this.getAuthToken();
      
      // Create spreadsheet title
      const timestamp = new Date().toLocaleString('vi-VN');
      const title = includeMetadata
        ? `${pdfInfo.fileName.replace('.pdf', '')} - ${timestamp}`
        : pdfInfo.fileName.replace('.pdf', '');
      
      // Create spreadsheet
      const sheetId = await this.createGoogleSheet(token, title);
      
      // Populate with data (clean content only, no metadata)
      await this.populateSheetFromExtraction(token, sheetId, pdfInfo, extractedContent, includeMetadata);
      
      console.log('[PDFExportHandler] Spreadsheet created:', sheetId);
      
      return {
        success: true,
        sheetId: sheetId,
        url: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`
      };
      
    } catch (error) {
      console.error('[PDFExportHandler] Export to Sheets failed:', error);
      
      // Check if it's a 403 SERVICE_DISABLED error
      if (error.message && error.message.includes('403') && error.message.includes('SERVICE_DISABLED')) {
        throw new Error(this.Lang?.get('pdfChatErrorSheetsAPIDisabled') || 'Google Sheets API is not enabled for this extension. Please contact the extension developer to enable it.');
      }
      
      throw error;
    }
  }
  
  /**
   * Build Google Docs content from extracted PDF text
   * @param {Object} pdfInfo - PDF file information
   * @param {string} extractedContent - Extracted text content from PDF
   * @param {boolean} includeMetadata - Whether to include metadata (title, info, etc.)
   */
  buildDocsContentFromExtraction(pdfInfo, extractedContent, includeMetadata = false) {
    const requests = [];
    let currentIndex = 1;
    
    if (includeMetadata) {
      // Title (PDF filename without extension)
      const titleText = pdfInfo.fileName.replace('.pdf', '') + '\n';
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: titleText
        }
      });
      currentIndex += titleText.length;
      
      // Style title
      requests.push({
        updateParagraphStyle: {
          range: { startIndex: 1, endIndex: currentIndex },
          paragraphStyle: {
            namedStyleType: 'HEADING_1',
            alignment: 'CENTER'
          },
          fields: 'namedStyleType,alignment'
        }
      });
      
      // PDF Info
      const pdfInfoText = `\nDocument: ${pdfInfo.fileName}\nPages: ${pdfInfo.numPages}\nSize: ${(pdfInfo.fileSize / 1024 / 1024).toFixed(2)} MB\nExported: ${new Date().toLocaleString('vi-VN')}\n\n`;
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: pdfInfoText
        }
      });
      currentIndex += pdfInfoText.length;
      
      // Divider
      const divider = '═══════════════════════════════════════════════════════════\n\n';
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: divider
        }
      });
      currentIndex += divider.length;
      
      // Content heading
      const contentHeading = 'Document Content\n\n';
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: contentHeading
        }
      });
      const contentHeadingStart = currentIndex;
      currentIndex += contentHeading.length;
      
      // Style content heading
      requests.push({
        updateParagraphStyle: {
          range: { startIndex: contentHeadingStart, endIndex: currentIndex },
          paragraphStyle: {
            namedStyleType: 'HEADING_2'
          },
          fields: 'namedStyleType'
        }
      });
    }
    
    // Extracted content (clean, no metadata)
    // Clean up any AI-added prefixes/suffixes and metadata
    let cleanContent = extractedContent.trim();
    
    // Remove common AI prefixes (case-insensitive, multiline)
    const aiPrefixes = [
      /^here is the content:?\s*/i,
      /^the document contains:?\s*/i,
      /^extracted content:?\s*/i,
      /^document content:?\s*/i,
      /^content:?\s*/i,
      /^begin extraction:?\s*/i,
      /^starting extraction:?\s*/i,
      /^extracted text:?\s*/i,
      /^pdf content:?\s*/i
    ];
    
    aiPrefixes.forEach(prefix => {
      cleanContent = cleanContent.replace(prefix, '').trim();
    });
    
    // Remove common AI suffixes
    const aiSuffixes = [
      /this concludes the extraction\.?\s*$/i,
      /end of document\.?\s*$/i,
      /extraction complete\.?\s*$/i,
      /that's all the content\.?\s*$/i,
      /end of extraction\.?\s*$/i
    ];
    
    aiSuffixes.forEach(suffix => {
      cleanContent = cleanContent.replace(suffix, '').trim();
    });
    
    // Remove metadata patterns that might be in the content
    const metadataPatterns = [
      /^Document:\s*[^\n]+\n?/i,
      /^Pages?:\s*[^\n]+\n?/i,
      /^Size:\s*[^\n]+\n?/i,
      /^Exported:\s*[^\n]+\n?/i,
      /^════+.*════+\n?/,
      /^Document Content\s*\n?/i,
      /^────────────────+.*\n?/
    ];
    
    metadataPatterns.forEach(pattern => {
      cleanContent = cleanContent.replace(pattern, '').trim();
    });
    
    const contentText = cleanContent + '\n';
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: contentText
      }
    });
    currentIndex += contentText.length;
    
    return requests;
  }
  
  /**
   * Build Google Docs content from chat history (legacy)
   */
  buildDocsContent(pdfInfo, chatHistory) {
    const requests = [];
    let currentIndex = 1;
    
    // Title
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: `PDF Chat Conversation\n`
      }
    });
    currentIndex += 'PDF Chat Conversation\n'.length;
    
    // Style title
    requests.push({
      updateParagraphStyle: {
        range: { startIndex: 1, endIndex: currentIndex },
        paragraphStyle: {
          namedStyleType: 'HEADING_1',
          alignment: 'CENTER'
        },
        fields: 'namedStyleType,alignment'
      }
    });
    
    // PDF Info
    const pdfInfoText = `\nDocument: ${pdfInfo.fileName}\nSize: ${(pdfInfo.fileSize / 1024 / 1024).toFixed(2)} MB\nExported: ${new Date().toLocaleString('vi-VN')}\n\n`;
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: pdfInfoText
      }
    });
    currentIndex += pdfInfoText.length;
    
    // Divider
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: '─────────────────────────────────────────\n\n'
      }
    });
    currentIndex += '─────────────────────────────────────────\n\n'.length;
    
    // Chat messages
    chatHistory.forEach((msg, index) => {
      const role = msg.role === 'user' ? '👤 You' : '🤖 AI';
      const time = new Date(msg.timestamp).toLocaleTimeString('vi-VN');
      
      const msgText = `${role} (${time})\n${msg.message}\n\n`;
      
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: msgText
        }
      });
      
      // Style user messages differently
      if (msg.role === 'user') {
        requests.push({
          updateTextStyle: {
            range: { 
              startIndex: currentIndex, 
              endIndex: currentIndex + role.length 
            },
            textStyle: {
              bold: true,
              foregroundColor: {
                color: { rgbColor: { red: 0.2, green: 0.4, blue: 0.8 } }
              }
            },
            fields: 'bold,foregroundColor'
          }
        });
      } else {
        requests.push({
          updateTextStyle: {
            range: { 
              startIndex: currentIndex, 
              endIndex: currentIndex + role.length 
            },
            textStyle: {
              bold: true,
              foregroundColor: {
                color: { rgbColor: { red: 0.3, green: 0.7, blue: 0.3 } }
              }
            },
            fields: 'bold,foregroundColor'
          }
        });
      }
      
      currentIndex += msgText.length;
    });
    
    return requests;
  }
  
  /**
   * Create Google Doc
   */
  async createGoogleDoc(token, title, contentRequests) {
    // Step 1: Create empty document
    const createResponse = await fetch('https://docs.googleapis.com/v1/documents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title: title })
    });
    
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('[PDFExportHandler] Failed to create document:', createResponse.status, errorText);
      throw new Error(`Failed to create document: ${createResponse.status} ${createResponse.statusText}`);
    }
    
    const doc = await createResponse.json();
    const docId = doc.documentId;
    
    // Step 2: Add content
    await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests: contentRequests })
    });
    
    return docId;
  }
  
  /**
   * Create Google Sheet
   */
  async createGoogleSheet(token, title) {
    const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: { title: title }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[PDFExportHandler] Failed to create spreadsheet:', response.status, errorText);
      
      // Check if it's a 403 SERVICE_DISABLED error
      if (response.status === 403 && errorText.includes('SERVICE_DISABLED')) {
        const error = new Error(this.Lang?.get('pdfChatErrorSheetsAPIDisabled') || 'Google Sheets API is not enabled for this extension. Please contact the extension developer to enable it in Google Cloud Console.');
        error.message += ' SERVICE_DISABLED';
        throw error;
      }
      
      throw new Error(`Failed to create spreadsheet: ${response.status} ${response.statusText}`);
    }
    
    const sheet = await response.json();
    return sheet.spreadsheetId;
  }
  
  /**
   * Populate Google Sheet with extracted PDF content
   * @param {boolean} includeMetadata - Whether to include metadata (default: false for clean export)
   */
  async populateSheetFromExtraction(token, sheetId, pdfInfo, extractedContent, includeMetadata = false) {
    // Parse extracted content into rows
    // Try to detect tables (lines with | separators) and regular text
    let cleanContent = extractedContent.trim();
    
    // Remove common AI-added prefixes/suffixes and metadata
    const aiPrefixes = [
      /^here is the content:?\s*/i,
      /^the document contains:?\s*/i,
      /^extracted content:?\s*/i,
      /^document content:?\s*/i,
      /^content:?\s*/i,
      /^begin extraction:?\s*/i,
      /^starting extraction:?\s*/i,
      /^extracted text:?\s*/i,
      /^pdf content:?\s*/i
    ];
    
    aiPrefixes.forEach(prefix => {
      cleanContent = cleanContent.replace(prefix, '').trim();
    });
    
    const aiSuffixes = [
      /this concludes the extraction\.?\s*$/i,
      /end of document\.?\s*$/i,
      /extraction complete\.?\s*$/i,
      /that's all the content\.?\s*$/i,
      /end of extraction\.?\s*$/i
    ];
    
    aiSuffixes.forEach(suffix => {
      cleanContent = cleanContent.replace(suffix, '').trim();
    });
    
    // Remove metadata patterns that might be in the content
    const metadataPatterns = [
      /^Document:\s*[^\n]+\n?/i,
      /^Pages?:\s*[^\n]+\n?/i,
      /^Size:\s*[^\n]+\n?/i,
      /^Exported:\s*[^\n]+\n?/i,
      /^════+.*════+\n?/,
      /^Document Content\s*\n?/i,
      /^────────────────+.*\n?/
    ];
    
    metadataPatterns.forEach(pattern => {
      cleanContent = cleanContent.replace(pattern, '').trim();
    });
    
    const lines = cleanContent.split('\n');
    const values = [];
    
    if (includeMetadata) {
      // Header
      values.push([pdfInfo.fileName.replace('.pdf', '')]);
      values.push([]);
      values.push(['Document:', pdfInfo.fileName]);
      values.push(['Pages:', pdfInfo.numPages]);
      values.push(['Size:', `${(pdfInfo.fileSize / 1024 / 1024).toFixed(2)} MB`]);
      values.push(['Exported:', new Date().toLocaleString('vi-VN')]);
      values.push([]);
      values.push(['Content']);
      values.push([]);
    }
    
    // Process content lines
    lines.forEach(line => {
      line = line.trim();
      if (!line) {
        values.push([]); // Empty row for spacing
        return;
      }
      
      // Check if line is a table row (contains |)
      if (line.includes('|')) {
        const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
        if (cells.length > 1) {
          values.push(cells);
          return;
        }
      }
      
      // Regular text - put in first column
      values.push([line]);
    });
    
    // Calculate range based on max columns
    const maxCols = Math.max(...values.map(row => row.length));
    const colLetter = String.fromCharCode(64 + Math.min(maxCols, 26)); // A-Z
    
    // Update sheet
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A1:${colLetter}${values.length}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values: values })
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[PDFExportHandler] Failed to populate spreadsheet:', response.status, errorText);
      throw new Error(`Failed to populate spreadsheet: ${response.status} ${response.statusText}`);
    }
    
    // Format header (first row) only if metadata is included
    if (includeMetadata && values.length > 0) {
      await this.formatSheetHeader(token, sheetId);
    }
  }
  
  /**
   * Populate Google Sheet with chat data (legacy)
   */
  async populateSheet(token, sheetId, pdfInfo, chatHistory) {
    const values = [
      // Header
      ['PDF Chat Conversation'],
      [],
      ['Document:', pdfInfo.fileName],
      ['Size:', `${(pdfInfo.fileSize / 1024 / 1024).toFixed(2)} MB`],
      ['Exported:', new Date().toLocaleString('vi-VN')],
      [],
      // Chat table header
      ['Time', 'Speaker', 'Message'],
    ];
    
    // Add chat messages
    chatHistory.forEach(msg => {
      const messageText = msg.parts?.[0]?.text || msg.text || msg.message || '';
      values.push([
        new Date().toLocaleString('vi-VN'), // Use current time as fallback
        msg.role === 'user' ? 'You' : 'AI',
        messageText
      ]);
    });
    
    // Update sheet
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A1:C${values.length}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values: values })
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[PDFExportHandler] Failed to populate spreadsheet:', response.status, errorText);
      throw new Error(`Failed to populate spreadsheet: ${response.status} ${response.statusText}`);
    }
    
    // Format header
    await this.formatSheetHeader(token, sheetId);
  }
  
  /**
   * Format sheet header
   */
  async formatSheetHeader(token, sheetId) {
    const requests = [
      // Bold first row (title)
      {
        repeatCell: {
          range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
          cell: {
            userEnteredFormat: {
              textFormat: { bold: true, fontSize: 16 },
              horizontalAlignment: 'CENTER'
            }
          },
          fields: 'userEnteredFormat(textFormat,horizontalAlignment)'
        }
      },
      // Bold header row
      {
        repeatCell: {
          range: { sheetId: 0, startRowIndex: 6, endRowIndex: 7 },
          cell: {
            userEnteredFormat: {
              textFormat: { bold: true },
              backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }
            }
          },
          fields: 'userEnteredFormat(textFormat,backgroundColor)'
        }
      },
      // Auto-resize columns
      {
        autoResizeDimensions: {
          dimensions: {
            sheetId: 0,
            dimension: 'COLUMNS',
            startIndex: 0,
            endIndex: 3
          }
        }
      }
    ];
    
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requests: requests })
      }
    );
  }
}

