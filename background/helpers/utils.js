// background/helpers/utils.js
// Utility functions

import { getLang } from './i18n.js';

export function debugLog(context, message, data = null) {
    const timestamp = new Date().toISOString().substr(11, 12);
    console.log(`[${timestamp}] [${context}]`, message, data || '');
}

export function buildTranslationPrompt(title, description, targetLang = 'en') {
    const langName = targetLang === 'en' ? getLang('translateLangEn') : getLang('translateLangVi');
    
    return `${getLang('promptTranslateTitle', { langName: langName })}

${getLang('promptTranslateReq1')}
${getLang('promptTranslateReq2')}
${getLang('promptTranslateReq3')}

${getLang('promptTranslateTarget', { langName: langName })}

${getLang('promptTranslateInput')}
{
  "title": "${title}",
  "description": "${description}"
}

${getLang('promptTranslateOutput')}
{
  "title": "...",
  "description": "..."
}

${getLang('promptTranslateStart')}`;
}

export function buildRewritePrompt(text, context) {
    let instruction = '';

    // Yêu cầu 5: Nếu context là 'description'
    if (context && context.toLowerCase().includes('description')) {
        // Yêu cầu AI viết dạng email
        instruction = `${getLang('promptRewriteDescTitle')}
${getLang('promptRewriteDescReq1')}
${getLang('promptRewriteDescReq2')}
${getLang('promptRewriteDescReq3')}
${getLang('promptRewriteDescReq4')}`;
        
    } else {
        // Yêu cầu viết lại thông thường (cho Tiêu đề)
        const defaultContext = getLang('promptRewriteDefault');
        const fullContext = context ? `${context}` : defaultContext;
        instruction = getLang('promptRewriteDefaultContext', { context: fullContext });
    }
    
    return `${getLang('promptRewriteTitle')}

${getLang('promptRewriteTask')}
${instruction}

${getLang('promptRewriteNote')}
${getLang('promptRewriteRule')}

${getLang('promptRewriteOriginal')}
"${text}"

${getLang('promptRewriteResult')}`;
}

