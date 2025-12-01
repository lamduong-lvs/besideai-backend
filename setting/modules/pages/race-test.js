// setting/modules/pages/race-test.js - Race test functionality

import { showToast } from '../core/toast.js';

export function initRaceTest() {
  const raceToggle = document.getElementById('enableRacingMode');
  const testSection = document.getElementById('race-test-section');
  const sendTestBtn = document.getElementById('race-test-send');
  const testInput = document.getElementById('race-test-input');
  const resultsBody = document.getElementById('race-test-results-body');
  const spinner = document.getElementById('race-test-spinner');
  
  // Đảm bảo spinner luôn ẩn khi khởi tạo
  if (spinner) {
    spinner.classList.add('d-none');
    spinner.style.display = '';
  }
  
  raceToggle?.addEventListener('change', (e) => {
    if (testSection) {
      if (e.target.checked) {
        testSection.classList.remove('d-none');
      } else {
        testSection.classList.add('d-none');
      }
    }
  });
  
  sendTestBtn?.addEventListener('click', async () => {
    const text = testInput?.value.trim();
    const selectedModels = Array.from(
      document.querySelectorAll('#racingModelChecklist input[name="racingModel"]:checked')
    ).map(cb => cb.value);
    
    if (!text) {
      showToast(window.Lang?.get('errorRaceTestNoInput') || 'Please enter test text', 'error');
      return;
    }
    if (selectedModels.length < 1) {
      showToast(window.Lang?.get('errorRaceTestNoModel') || 'Please select at least one model', 'error');
      return;
    }
    
    if (resultsBody) {
      resultsBody.innerHTML = `<tr class="placeholder-row"><td colspan="4">${window.Lang?.get('raceTestStatePreparing') || 'Preparing...'}</td></tr>`;
    }
    if (spinner) {
      spinner.classList.remove('d-none');
      spinner.style.display = 'flex';
    }
    if (sendTestBtn) sendTestBtn.disabled = true;
    if (testInput) testInput.disabled = true;
    
    try {
      const response = await chrome.runtime.sendMessage({ 
        action: 'testRaceCondition', 
        text, 
        models: selectedModels 
      });
      if (response?.success) {
        displayRaceTestResults(response.results);
      } else {
        throw new Error(response?.error || window.Lang?.get('errorRaceTestUnknown') || 'Unknown error');
      }
    } catch (error) {
      console.error('Error sending race test request:', error);
      showToast(window.Lang?.get('errorRaceTestFailed', { error: error.message }) || 'Test failed', 'error');
    } finally {
      if (spinner) {
        spinner.classList.add('d-none');
        spinner.style.display = '';
      }
      if (sendTestBtn) sendTestBtn.disabled = false;
      if (testInput) testInput.disabled = false;
    }
  });
}

function displayRaceTestResults(results) {
  const resultsBody = document.getElementById('race-test-results-body');
  if (!resultsBody || !window.Lang) return;
  resultsBody.innerHTML = '';
  
  if (!results || results.length === 0) {
    resultsBody.innerHTML = `<tr class="placeholder-row"><td colspan="4">${window.Lang.get('raceTestStateNoResult') || 'No results'}</td></tr>`;
    return;
  }
  
  results.sort((a, b) => (a.latency ?? Infinity) - (b.latency ?? Infinity));
  
  results.forEach(result => {
    const row = resultsBody.insertRow();
    row.insertCell().textContent = result.name || result.fullModelId?.split('/')[1] || 'N/A';
    row.insertCell().textContent = result.provider || result.fullModelId?.split('/')[0] || 'N/A';
    
    const latencyCell = row.insertCell();
    latencyCell.textContent = result.latency !== null ? `${result.latency} ms` : 'N/A';
    if (result.latency !== null) {
      latencyCell.style.fontWeight = '500';
      if (result.latency < 1000) latencyCell.className = 'status-ok';
      else if (result.latency < 3000) latencyCell.className = 'status-warning';
      else latencyCell.className = 'status-error';
    }
    
    const statusCell = row.insertCell();
    let statusText = result.status || 'Unknown';
    let statusClass = '';
    if (statusText === 'OK') statusClass = 'status-ok';
    else if (statusText.startsWith('Error')) statusClass = 'status-error';
    else if (statusText === 'Timeout') statusClass = 'status-timeout';
    else if (statusText === 'Aborted') statusClass = 'status-aborted';
    
    if (result.error && !statusText.includes(result.error)) {
      statusText += `: ${result.error}`;
    }
    statusCell.textContent = statusText;
    statusCell.className = statusClass;
    if (result.error) statusCell.title = result.error;
  });
}

