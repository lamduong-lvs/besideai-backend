/**
 * Models Selector Component
 * Displays and manages model selection from backend
 */

import { modelsService } from '../../subscription/models-service.js';
import { subscriptionManager } from '../../subscription/subscription-manager.js';

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
   * Save selected model to storage
   */
  async saveSelectedModel(modelId) {
    try {
      await chrome.storage.local.set({
        selectedModel: modelId,
        aiProvider: modelId // Keep for backward compatibility
      });
      this.selectedModel = modelId;
    } catch (error) {
      console.error('[ModelsSelector] Error saving model:', error);
    }
  }

  /**
   * Render component
   */
  async render() {
    if (!this.container) return;

    // Group models by tier
    const modelsByTier = {
      free: [],
      pro: [],
      premium: []
    };

    this.models.forEach(model => {
      if (modelsByTier[model.tier]) {
        modelsByTier[model.tier].push(model);
      }
    });

    // Get current tier
    let currentTier = 'free';
    try {
      await subscriptionManager.ensureInitialized();
      currentTier = await subscriptionManager.getTier();
    } catch (error) {
      console.warn('[ModelsSelector] Could not get tier:', error);
    }

    // Build HTML
    let html = `
      <div class="models-selector">
        <h3 class="models-selector-title">Select AI Model</h3>
        <p class="models-selector-description">Choose your preferred AI model. Available models depend on your subscription tier.</p>
        
        <div class="models-selector-current-tier">
          <span class="tier-badge tier-${currentTier}">${currentTier.toUpperCase()}</span>
          <span class="tier-description">Current subscription tier</span>
        </div>

        <div class="models-list">
    `;

    // Render models by tier
    const tierOrder = ['free', 'pro', 'premium'];
    tierOrder.forEach(tier => {
      const models = modelsByTier[tier];
      if (models.length === 0) return;

      const canAccess = ['free', 'pro', 'premium'].slice(0, tierOrder.indexOf(tier) + 1).includes(currentTier);
      
      html += `
        <div class="models-tier-section ${!canAccess ? 'tier-locked' : ''}">
          <h4 class="tier-section-title">
            ${tier.charAt(0).toUpperCase() + tier.slice(1)} Tier
            ${!canAccess ? '<span class="upgrade-badge">Upgrade Required</span>' : ''}
          </h4>
          <div class="models-grid">
      `;

      models.forEach(model => {
        const isSelected = this.selectedModel === model.id;
        const isRecommended = (await modelsService.getRecommendedModels()).includes(model.id);
        const isDefault = (await modelsService.getDefaultModel()) === model.id;
        
        html += `
          <div class="model-card ${isSelected ? 'selected' : ''} ${!canAccess ? 'disabled' : ''}" 
               data-model-id="${model.id}">
            <div class="model-card-header">
              <input type="radio" 
                     name="selectedModel" 
                     value="${model.id}" 
                     id="model-${model.id}"
                     ${isSelected ? 'checked' : ''}
                     ${!canAccess ? 'disabled' : ''}>
              <label for="model-${model.id}" class="model-name">${model.name}</label>
              ${isRecommended ? '<span class="recommended-badge">Recommended</span>' : ''}
              ${isDefault ? '<span class="default-badge">Default</span>' : ''}
            </div>
            <div class="model-card-body">
              <div class="model-provider">${model.providerName}</div>
              ${model.description ? `<div class="model-description">${model.description}</div>` : ''}
              <div class="model-specs">
                <span class="spec-item">Max tokens: ${model.maxTokens.toLocaleString()}</span>
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

