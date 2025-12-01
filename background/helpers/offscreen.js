// background/helpers/offscreen.js
// Offscreen document helpers

import { getLang } from './i18n.js';

let creating;

export async function setupOffscreenDocument(path) {
    const offscreenUrl = chrome.runtime.getURL(path);
    const existingContexts = await chrome.runtime.getContexts({ 
        contextTypes: ['OFFSCREEN_DOCUMENT'], 
        documentUrls: [offscreenUrl] 
    });
    if (existingContexts.length > 0) return;
    
    if (creating) {
        await creating;
    } else {
        creating = chrome.offscreen.createDocument({ 
            url: path, 
            reasons: ['DOM_PARSER'], 
            justification: 'To crop and stitch screenshot images with a canvas.' 
        });
        await creating;
        creating = null;
    }
}

export async function processOffscreen(payload) {
    await setupOffscreenDocument('modules/screenshot-editor/offscreen.html');
    return await chrome.runtime.sendMessage(payload);
}

export async function captureFullPage(tabId) {
    const imageURIs = [];
    
    async function executeScript(func, args = []) {
        const results = await chrome.scripting.executeScript({ target: { tabId }, func: func, args: args });
        if (chrome.runtime.lastError) {
            console.error('Scripting Error:', chrome.runtime.lastError.message);
            return null;
        }
        return results[0].result;
    }
    
    await executeScript(() => {
        document.documentElement.style.overflow = 'hidden';
        window.scrollTo(0, 0);
    });
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const pageDetails = await executeScript(() => ({
        viewHeight: window.innerHeight,
        totalWidth: document.documentElement.scrollWidth
    }));
    
    if (!pageDetails || !pageDetails.viewHeight) {
        console.error(getLang('errorGetPageInfo'));
        await executeScript(() => {
            document.documentElement.style.overflow = '';
        });
        return null;
    }
    
    const { viewHeight, totalWidth } = pageDetails;
    let isEndOfPage = false;
    
    while (!isEndOfPage) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
        imageURIs.push(dataUrl);
        const lastScrollY = await executeScript(() => window.scrollY);
        await executeScript((vh) => window.scrollBy(0, vh), [viewHeight]);
        await new Promise(resolve => setTimeout(resolve, 500));
        const newScrollY = await executeScript(() => window.scrollY);
        if (newScrollY <= lastScrollY + 10) {
            isEndOfPage = true;
        }
    }
    
    const finalHeight = await executeScript(() => document.documentElement.scrollHeight);
    await executeScript(() => {
        document.documentElement.style.overflow = '';
        window.scrollTo(0, 0);
    });
    
    return { imageURIs, totalWidth, totalHeight: finalHeight, viewHeight };
}

