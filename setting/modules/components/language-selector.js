// setting/modules/components/language-selector.js - Language selector component

import { SUPPORTED_LANGUAGES } from '../../constants.js';

export function initLanguageSelector() {
    const wrapper = document.getElementById('setting-language-selector-wrapper');
    const trigger = document.getElementById('setting-language-selector-trigger');
    const selectedValueSpan = document.getElementById('setting-language-selected-value');
    const menu = document.getElementById('setting-language-selector-menu');

    if (!wrapper || !trigger || !selectedValueSpan || !menu || !window.Lang) return;

    const currentLang = window.Lang.getCurrentLanguage();
    menu.innerHTML = ''; // Clear previous items

    let currentLangName = '';
    let currentIconFile = '';

    SUPPORTED_LANGUAGES.forEach(lang => {
        const langName = window.Lang.get(lang.name_key); 
        const iconFile = lang.icon_file; 
        const iconUrl = chrome.runtime.getURL(`icons/svg/lang/${iconFile}.svg`);

        const li = document.createElement('li');
        li.dataset.value = lang.code;
        li.innerHTML = `<img src="${iconUrl}" class="lang-flag-icon" alt="${iconFile}"> <span>${langName}</span>`; 

        if (lang.code === currentLang) {
            li.classList.add('selected');
            currentLangName = langName;
            currentIconFile = iconFile; 
        }

        menu.appendChild(li);
    });

    // Update selected value in trigger
    const currentIconUrl = chrome.runtime.getURL(`icons/svg/lang/${currentIconFile}.svg`);
    selectedValueSpan.innerHTML = `<img src="${currentIconUrl}" class="lang-flag-icon" alt="${currentIconFile}"> <span>${currentLangName}</span>`;

    // Setup event listeners
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        // Close other dropdowns
        document.querySelectorAll('.custom-select-wrapper.open').forEach(w => {
            if (w.id !== 'setting-language-selector-wrapper') w.classList.remove('open');
        });
        wrapper.classList.toggle('open');
    });

    menu.addEventListener('click', async (e) => {
        const targetLi = e.target.closest('li');
        if (targetLi) {
            const newLangCode = targetLi.dataset.value;
            if (newLangCode && newLangCode !== window.Lang.getCurrentLanguage()) {
                try {
                    // Use i18n.js setLanguage function to save and reload
                    await window.Lang.setLanguage(newLangCode);
                } catch (err) {
                    console.error('i18n (Setting): Không thể lưu ngôn ngữ', err);
                    const { showToast } = await import('../core/toast.js');
                    showToast("Lỗi khi đổi ngôn ngữ", "error");
                }
            }
        }
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            wrapper.classList.remove('open');
        }
    });
}

