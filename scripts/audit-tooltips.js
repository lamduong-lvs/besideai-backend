/**
 * Tooltip Audit Script
 * Scans all HTML and JS files to find interactive elements
 * and check if they have tooltip attributes
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  rootDir: path.join(__dirname, '..'),
  outputFile: path.join(__dirname, 'audit-tooltips-report.csv'),
  ignoreDirs: ['node_modules', '.git', 'icons', 'sounds', 'Chrome Extension.crx'],
  
  // Interactive element selectors to look for
  interactiveSelectors: [
    'button',
    'input[type="button"]',
    'input[type="submit"]',
    '[role="button"]',
    '[onclick]',
    '.btn',
    '.button',
    '.toolbar-action',
    '.toolbar-icon',
    '.menu-icon',
    '.icon-btn',
    'a.icon',
  ],
  
  // Tooltip attributes
  tooltipAttributes: [
    'data-tooltip',
    'data-tooltip-text',
    'title',
    'aria-label',
    'aria-describedby',
    'data-i18n-title',
  ],
  
  // Class patterns that indicate tooltip presence
  tooltipClasses: [
    'tooltip',
    'has-tooltip',
  ],
};

// Results storage
const results = {
  files: [],
  totalElements: 0,
  withTooltip: 0,
  missingTooltip: 0,
  byModule: {},
};

/**
 * Check if directory should be ignored
 */
function shouldIgnoreDir(dirPath) {
  return CONFIG.ignoreDirs.some(ignore => dirPath.includes(ignore));
}

/**
 * Get all HTML and JS files recursively
 */
function getAllFiles(dir, fileList = []) {
  if (shouldIgnoreDir(dir)) return fileList;
  
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    
    try {
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        getAllFiles(filePath, fileList);
      } else if (stat.isFile() && (file.endsWith('.html') || file.endsWith('.js'))) {
        fileList.push(filePath);
      }
    } catch (err) {
      console.error(`Error reading ${filePath}:`, err.message);
    }
  });
  
  return fileList;
}

/**
 * Extract module name from file path
 */
function getModuleName(filePath) {
  const relativePath = path.relative(CONFIG.rootDir, filePath);
  const parts = relativePath.split(path.sep);
  
  if (parts[0] === 'modules') {
    return parts[1] || 'modules';
  } else if (parts[0] === 'content') {
    return 'content-scripts';
  } else if (parts[0] === 'setting') {
    return 'settings';
  } else if (parts[0] === 'background') {
    return 'background';
  }
  
  return parts[0] || 'root';
}

/**
 * Check if element has tooltip attribute
 */
function hasTooltipAttribute(elementString) {
  return CONFIG.tooltipAttributes.some(attr => {
    const regex = new RegExp(`${attr}\\s*=`, 'i');
    return regex.test(elementString);
  });
}

/**
 * Check if element has tooltip class
 */
function hasTooltipClass(elementString) {
  return CONFIG.tooltipClasses.some(cls => {
    const regex = new RegExp(`class\\s*=\\s*["'][^"']*${cls}`, 'i');
    return regex.test(elementString);
  });
}

/**
 * Extract ID or class for identification
 */
function extractIdentifier(elementString) {
  // Try to extract id
  const idMatch = elementString.match(/id\s*=\s*["']([^"']+)["']/i);
  if (idMatch) return `#${idMatch[1]}`;
  
  // Try to extract first class
  const classMatch = elementString.match(/class\s*=\s*["']([^"']+)["']/i);
  if (classMatch) {
    const firstClass = classMatch[1].split(/\s+/)[0];
    return `.${firstClass}`;
  }
  
  return '[no-identifier]';
}

/**
 * Scan HTML file for interactive elements
 */
function scanHTMLFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileResults = [];
  
  // Simple regex-based extraction (not perfect but good enough for audit)
  const buttonRegex = /<button[^>]*>/gi;
  const inputButtonRegex = /<input[^>]*type\s*=\s*["'](button|submit)["'][^>]*>/gi;
  const roleButtonRegex = /<[^>]*role\s*=\s*["']button["'][^>]*>/gi;
  const onclickRegex = /<[^>]*onclick\s*=\s*["'][^"']*["'][^>]*>/gi;
  
  const allMatches = [
    ...content.matchAll(buttonRegex),
    ...content.matchAll(inputButtonRegex),
    ...content.matchAll(roleButtonRegex),
    ...content.matchAll(onclickRegex),
  ];
  
  allMatches.forEach(match => {
    const elementString = match[0];
    const lineNumber = content.substring(0, match.index).split('\n').length;
    
    const hasTooltip = hasTooltipAttribute(elementString) || hasTooltipClass(elementString);
    const identifier = extractIdentifier(elementString);
    
    fileResults.push({
      file: path.relative(CONFIG.rootDir, filePath),
      line: lineNumber,
      element: elementString.substring(0, 100), // First 100 chars
      identifier: identifier,
      hasTooltip: hasTooltip,
      module: getModuleName(filePath),
    });
    
    results.totalElements++;
    if (hasTooltip) {
      results.withTooltip++;
    } else {
      results.missingTooltip++;
    }
  });
  
  return fileResults;
}

/**
 * Scan JS file for dynamically created elements
 */
function scanJSFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileResults = [];
  
  // Look for createElement('button') patterns
  const createElementRegex = /createElement\s*\(\s*['"]button['"]\s*\)/gi;
  // Look for button in template strings
  const templateButtonRegex = /<button[^>]*>/gi;
  
  const allMatches = [
    ...content.matchAll(createElementRegex),
    ...content.matchAll(templateButtonRegex),
  ];
  
  allMatches.forEach(match => {
    const elementString = match[0];
    const lineNumber = content.substring(0, match.index).split('\n').length;
    
    // Check surrounding code for tooltip assignment
    const contextStart = Math.max(0, match.index - 200);
    const contextEnd = Math.min(content.length, match.index + 200);
    const context = content.substring(contextStart, contextEnd);
    
    const hasTooltip = CONFIG.tooltipAttributes.some(attr => {
      return context.includes(attr) || context.includes(`'${attr}'`) || context.includes(`"${attr}"`);
    });
    
    const identifier = extractIdentifier(elementString);
    
    fileResults.push({
      file: path.relative(CONFIG.rootDir, filePath),
      line: lineNumber,
      element: elementString.substring(0, 100),
      identifier: identifier,
      hasTooltip: hasTooltip,
      module: getModuleName(filePath),
    });
    
    results.totalElements++;
    if (hasTooltip) {
      results.withTooltip++;
    } else {
      results.missingTooltip++;
    }
  });
  
  return fileResults;
}

/**
 * Generate CSV report
 */
function generateCSVReport(allResults) {
  const header = 'Module,File,Line,Identifier,Element,Has Tooltip,Priority\n';
  
  const rows = allResults.map(result => {
    // Determine priority based on identifier and element
    let priority = 'P3';
    if (!result.hasTooltip) {
      if (result.identifier !== '[no-identifier]') {
        // Has identifier, likely important
        if (result.element.includes('delete') || result.element.includes('save') || 
            result.element.includes('send') || result.element.includes('close')) {
          priority = 'P1';
        } else {
          priority = 'P2';
        }
      } else {
        priority = 'P2';
      }
    } else {
      priority = '-';
    }
    
    return [
      result.module,
      result.file,
      result.line,
      result.identifier,
      `"${result.element.replace(/"/g, '""')}"`, // Escape quotes
      result.hasTooltip ? 'YES' : 'NO',
      priority,
    ].join(',');
  });
  
  return header + rows.join('\n');
}

/**
 * Generate summary report
 */
function generateSummary() {
  const percentage = results.totalElements > 0 
    ? ((results.withTooltip / results.totalElements) * 100).toFixed(1)
    : 0;
  
  const missingPercentage = results.totalElements > 0
    ? ((results.missingTooltip / results.totalElements) * 100).toFixed(1)
    : 0;
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 TOOLTIP AUDIT REPORT');
  console.log('='.repeat(60));
  console.log(`\nTotal Interactive Elements: ${results.totalElements}`);
  console.log(`With Tooltips: ${results.withTooltip} (${percentage}%)`);
  console.log(`Missing Tooltips: ${results.missingTooltip} (${missingPercentage}%) ⚠️`);
  
  // Group by module
  const byModule = {};
  results.files.forEach(fileResults => {
    fileResults.forEach(result => {
      if (!byModule[result.module]) {
        byModule[result.module] = { total: 0, withTooltip: 0 };
      }
      byModule[result.module].total++;
      if (result.hasTooltip) {
        byModule[result.module].withTooltip++;
      }
    });
  });
  
  console.log('\nBy Module:');
  Object.keys(byModule).sort().forEach(module => {
    const stats = byModule[module];
    const modulePercentage = ((stats.withTooltip / stats.total) * 100).toFixed(1);
    console.log(`├─ ${module}: ${stats.withTooltip}/${stats.total} (${modulePercentage}%)`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n✅ Report saved to: ${CONFIG.outputFile}`);
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Starting tooltip audit...\n');
  
  const allFiles = getAllFiles(CONFIG.rootDir);
  console.log(`Found ${allFiles.length} files to scan\n`);
  
  const allResults = [];
  
  allFiles.forEach(filePath => {
    try {
      if (filePath.endsWith('.html')) {
        const fileResults = scanHTMLFile(filePath);
        allResults.push(...fileResults);
        results.files.push(fileResults);
        
        if (fileResults.length > 0) {
          console.log(`✓ ${path.relative(CONFIG.rootDir, filePath)}: ${fileResults.length} elements`);
        }
      } else if (filePath.endsWith('.js')) {
        const fileResults = scanJSFile(filePath);
        allResults.push(...fileResults);
        results.files.push(fileResults);
        
        if (fileResults.length > 0) {
          console.log(`✓ ${path.relative(CONFIG.rootDir, filePath)}: ${fileResults.length} elements`);
        }
      }
    } catch (err) {
      console.error(`Error scanning ${filePath}:`, err.message);
    }
  });
  
  // Generate CSV report
  const csvContent = generateCSVReport(allResults);
  fs.writeFileSync(CONFIG.outputFile, csvContent, 'utf-8');
  
  // Generate summary
  generateSummary();
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main, scanHTMLFile, scanJSFile };

