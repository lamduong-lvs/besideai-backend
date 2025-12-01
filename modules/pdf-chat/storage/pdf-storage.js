/**
 * PDF Storage
 * Manages PDF chat data persistence
 */

export class PDFStorage {
  constructor() {
    this.storageKey = 'pdfChat_currentSession';
    this.historyKey = 'pdfChat_sessions'; // Store all sessions
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `pdf_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save current session (PDF + chat history)
   */
  async saveSession(pdfInfo, chatHistory, sessionId = null) {
    try {
      // Generate ID if not provided
      if (!sessionId) {
        // Check if we have a current session with ID
        const current = await this.loadSession();
        sessionId = current?.id || this.generateSessionId();
      }

      const session = {
        id: sessionId,
        pdfInfo: pdfInfo,
        chatHistory: chatHistory,
        savedAt: Date.now()
      };

      // Save as current session
      await chrome.storage.local.set({
        [this.storageKey]: session
      });

      // Also save to history
      await this.addToHistory(session);

      console.log('[PDFStorage] Session saved:', sessionId);
      return sessionId;
    } catch (error) {
      console.error('[PDFStorage] Failed to save session:', error);
      return null;
    }
  }

  /**
   * Add session to history
   * Optimizes storage by removing large fileData (base64) from history items
   */
  async addToHistory(session) {
    try {
      // Create a copy of the session for history
      const historySession = JSON.parse(JSON.stringify(session));

      // Remove large file data from history to save space
      if (historySession.pdfInfo && historySession.pdfInfo.fileData) {
        // Keep metadata but remove base64 content
        delete historySession.pdfInfo.fileData.base64;
        // Optional: keep a flag indicating file was present
        historySession.pdfInfo.hasFile = true;
      }

      const data = await chrome.storage.local.get(this.historyKey);
      const sessions = data[this.historyKey] || [];

      // Remove existing session with same ID
      const filtered = sessions.filter(s => s.id !== session.id);

      // Add new session at the beginning
      filtered.unshift(historySession);

      // Keep only last 20 sessions (reduced from 50 to further save space)
      const limited = filtered.slice(0, 20);

      await chrome.storage.local.set({
        [this.historyKey]: limited
      });

      console.log('[PDFStorage] Session added to history (optimized)');
    } catch (error) {
      console.error('[PDFStorage] Failed to add to history:', error);
    }
  }

  /**
   * Load current session
   */
  async loadSession() {
    try {
      const data = await chrome.storage.local.get(this.storageKey);

      if (data[this.storageKey]) {
        console.log('[PDFStorage] Session loaded');
        return data[this.storageKey];
      }

      return null;
    } catch (error) {
      console.error('[PDFStorage] Failed to load session:', error);
      return null;
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId) {
    try {
      const data = await chrome.storage.local.get(this.historyKey);
      const sessions = data[this.historyKey] || [];
      const session = sessions.find(s => s.id === sessionId);
      return session || null;
    } catch (error) {
      console.error('[PDFStorage] Failed to get session:', error);
      return null;
    }
  }

  /**
   * Get all sessions (for history)
   */
  async getAllSessions() {
    try {
      const data = await chrome.storage.local.get(this.historyKey);
      return data[this.historyKey] || [];
    } catch (error) {
      console.error('[PDFStorage] Failed to get all sessions:', error);
      return [];
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId) {
    try {
      // Remove from history
      const data = await chrome.storage.local.get(this.historyKey);
      const sessions = data[this.historyKey] || [];
      const filtered = sessions.filter(s => s.id !== sessionId);

      await chrome.storage.local.set({
        [this.historyKey]: filtered
      });

      // If it's the current session, clear it
      const current = await this.loadSession();
      if (current && current.id === sessionId) {
        await this.clearSession();
      }

      console.log('[PDFStorage] Session deleted:', sessionId);
      return true;
    } catch (error) {
      console.error('[PDFStorage] Failed to delete session:', error);
      return false;
    }
  }

  /**
   * Clear current session
   */
  async clearSession() {
    try {
      await chrome.storage.local.remove(this.storageKey);
      console.log('[PDFStorage] Session cleared');
      return true;
    } catch (error) {
      console.error('[PDFStorage] Failed to clear session:', error);
      return false;
    }
  }

  /**
   * Clear chat history but keep PDF info
   */
  async clearChatHistory() {
    try {
      const session = await this.loadSession();
      if (session && session.pdfInfo) {
        // Keep PDF info but clear chat history
        const updatedSession = {
          ...session,
          chatHistory: [],
          savedAt: Date.now()
        };
        await chrome.storage.local.set({
          [this.storageKey]: updatedSession
        });
        console.log('[PDFStorage] Chat history cleared, PDF info kept');
        return true;
      }
      return false;
    } catch (error) {
      console.error('[PDFStorage] Failed to clear chat history:', error);
      return false;
    }
  }

  /**
   * Check if session exists
   */
  async hasSession() {
    const session = await this.loadSession();
    return session !== null;
  }
}

