/**
 * Models Selector Component
 * Displays and manages model selection from backend
 */

import { modelsService } from '../../subscription/models-service.js';
import { subscriptionManager } from '../../subscription/subscription-manager.js';
import { modelPreferenceService } from '../../subscription/model-preference-service.js';

export class ModelsSelector {
  constructor(containerId) {
    this.containerId = containerId;
    this.container = null;
    this.models = [];
    this.selectedModel = null;
  }

  /**
   * Initialize component
   */
  async initialize() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error(`[ModelsSelector] Container ${this.containerId} not found`);
      return;
    }

    await this.loadModels();
    await this.render();
    this.attachEventListeners();
  }

  /**
   * Load models from backend
   */
  async loadModels() {
    try {
      await modelsService.initialize();
      this.models = await modelsService.getModels(true); // Force refresh
      this.selectedModel = await this.getCurrentSelectedModel();
    } catch (error) {
      console.error('[ModelsSelector] Error loading models:', error);
      this.models = [];
    }
  }

  /**
   * Get currently selected model from storage
   */
  async getCurrentSelectedModel() {
    try {
      const data = await chrome.storage.local.get(['selectedModel', 'aiProvider']);
      return data.selectedModel || data.aiProvider || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Save selected model to storage and Backend
   */
  async saveSelectedModel(modelId) {
    try {
      await modelPreferenceService.setPreferredModel(modelId);
      this.selectedModel = modelId;
    } catch (error) {
      console.error('[ModelsSelector] Error saving model:', error);
      throw error;
    }
  }

  /**
   * Render component
   */
  async render() {
    if (!this.container) return;

    // Get current tier
    let currentTier = 'free';
    try {
      await subscriptionManager.ensureInitialized();
      currentTier = await subscriptionManager.getTier();
    } catch (error) {
      console.warn('[ModelsSelector] Could not get tier:', error);
    }

    // Group models by category
    const modelsByCategory = await modelsService.getModelsByCategory();
    const categories = await modelsService.getCategories();
    
    // Category display names
    const categoryNames = {
      'llm': 'LLM (Text Generation)',
      'tts': 'TTS (Text-to-Speech)',
      'image': 'Image Generation',
      'video': 'Video Generation',
      'coding': 'Code Generation',
      'chat': 'Chat'
    };

    // Get recommended and default models
    const recommendedModels = await modelsService.getRecommendedModels();
    const defaultModel = await modelsService.getDefaultModel();

    // Build HTML
    let html = `
      <div class="models-selector">
        <h3 class="models-selector-title">Select AI Model</h3>
        <p class="models-selector-description">Choose your preferred AI model. Models are grouped by category.</p>
        
        <div class="models-selector-current-tier">
          <span class="tier-badge tier-${currentTier}">${currentTier.toUpperCase()}</span>
          <span class="tier-description">Current subscription tier</span>
        </div>

        <div class="models-category-tabs">
    `;

    // Category tabs
    const categoryOrder = ['llm', 'chat', 'coding', 'tts', 'image', 'video'];
    categoryOrder.forEach(cat => {
      if (modelsByCategory[cat] && modelsByCategory[cat].length > 0) {
        html += `<button class="category-tab" data-category="${cat}">${categoryNames[cat] || cat}</button>`;
      }
    });

    html += `
        </div>

        <div class="models-list">
    `;

    // Render models by category
    categoryOrder.forEach(category => {
      const models = modelsByCategory[category];
      if (!models || models.length === 0) return;

      html += `
        <div class="models-category-section" data-category="${category}">
          <h4 class="category-section-title">${categoryNames[category] || category}</h4>
          <div class="models-grid">
      `;
      
      models.forEach(model => {
        const isSelected = this.selectedModel === model.id;
        const isRecommended = recommendedModels.includes(model.id);
        const isDefault = defaultModel === model.id;
        
        html += `
          <div class="model-card ${isSelected ? 'selected' : ''}" 
               data-model-id="${model.id}">
            <div class="model-card-header">
              <input type="radio" 
                     name="selectedModel" 
                     value="${model.id}" 
                     id="model-${model.id}"
                     ${isSelected ? 'checked' : ''}>
              <label for="model-${model.id}" class="model-name">${model.name}</label>
              ${isRecommended ? '<span class="recommended-badge">Recommended</span>' : ''}
              ${isDefault ? '<span class="default-badge">Default</span>' : ''}
            </div>
            <div class="model-card-body">
              <div class="model-provider">${model.providerName}</div>
              ${model.description ? `<div class="model-description">${model.description}</div>` : ''}
              <div class="model-specs">
                <span class="spec-item">Max tokens: ${model.maxTokens?.toLocaleString() || 'N/A'}</span>
                ${model.supportsStreaming ? '<span class="spec-item">Streaming</span>' : ''}
              </div>
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    html += `
        </div>
        
        <div class="models-selector-actions">
          <button class="btn btn-primary" id="saveModelSelection">Save Selection</button>
          <button class="btn" id="refreshModels">Refresh Models</button>
        </div>
      </div>
    `;

    this.container.innerHTML = html;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Category tabs
    const categoryTabs = this.container.querySelectorAll('.category-tab');
    categoryTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const category = tab.dataset.category;
        
        // Update active tab
        categoryTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Show/hide category sections
        this.container.querySelectorAll('.models-category-section').forEach(section => {
          if (section.dataset.category === category) {
            section.style.display = 'block';
          } else {
            section.style.display = 'none';
          }
        });
      });
    });

    // Activate first category by default
    if (categoryTabs.length > 0) {
      categoryTabs[0].click();
    }

    // Model selection
    const radioButtons = this.container.querySelectorAll('input[name="selectedModel"]');
    radioButtons.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const modelId = e.target.value;
        const modelCard = this.container.querySelector(`[data-model-id="${modelId}"]`);
        
        // Update UI
        this.container.querySelectorAll('.model-card').forEach(card => {
          card.classList.remove('selected');
        });
        if (modelCard) {
          modelCard.classList.add('selected');
        }
      });
    });

    // Save button
    const saveButton = this.container.querySelector('#saveModelSelection');
    if (saveButton) {
      saveButton.addEventListener('click', async () => {
        const selected = this.container.querySelector('input[name="selectedModel"]:checked');
        if (selected) {
          await this.saveSelectedModel(selected.value);
          this.showMessage('Model selection saved!', 'success');
        } else {
          this.showMessage('Please select a model', 'error');
        }
      });
    }

    // Refresh button
    const refreshButton = this.container.querySelector('#refreshModels');
    if (refreshButton) {
      refreshButton.addEventListener('click', async () => {
        refreshButton.disabled = true;
        refreshButton.textContent = 'Refreshing...';
        try {
          await this.loadModels();
          await this.render();
          this.attachEventListeners();
          this.showMessage('Models refreshed!', 'success');
        } catch (error) {
          this.showMessage('Failed to refresh models', 'error');
        } finally {
          refreshButton.disabled = false;
          refreshButton.textContent = 'Refresh Models';
        }
      });
    }
  }

  /**
   * Show message
   */
  showMessage(message, type = 'info') {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

