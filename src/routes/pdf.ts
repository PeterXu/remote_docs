// src/routes/pdf.ts
import { Hono } from 'hono';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseMarkdown } from '../services/markdown';
import { generatePDF } from '../services/gotenberg';
import { getTemplate, getTemplateList } from '../templates';
import type {
  MultiPDFExportRequest,
  User,
  PDFConfig,
  ChapterItem,
  ContentItem,
  WatermarkConfig
} from '../types';

export const pdfRouter = new Hono();

// Sanitize CSS variable name (allow only alphanumeric, hyphen, underscore)
const sanitizeKey = (key: string): string => {
  return key.replace(/[^a-zA-Z0-9-_]/g, '');
};

// Sanitize CSS variable value (escape special chars)
const sanitizeValue = (value: string): string => {
  // Remove quotes and escape special characters
  return value.replace(/['"]/g, '').replace(/;/g, '\\3b ');
};

// Type guard for ChapterItem
function isChapterItem(item: any): item is ChapterItem {
  return item && typeof item.chapter === 'string';
}

// Type guard for ContentItem
function isContentItem(item: any): item is ContentItem {
  return item && Array.isArray(item.items);
}

// Generate config header HTML
function generateConfigHeader(config: PDFConfig, isFirstContent = false): string {
  if (!config || (!config.caption && !config.subtitle)) {
    return '';
  }

  const parts: string[] = [];

  // Main caption
  if (config.caption) {
    parts.push(`<h1 class="doc-caption">${escapeHtml(config.caption)}</h1>`);
  }

  // Subtitle
  if (config.subtitle) {
    parts.push(`<h2 class="doc-subtitle">${escapeHtml(config.subtitle)}</h2>`);
  }

  // Metadata row
  const metaParts: string[] = [];
  if (config.author) metaParts.push(`<span class="doc-meta">作者：${escapeHtml(config.author)}</span>`);
  if (config.date) metaParts.push(`<span class="doc-meta">日期：${escapeHtml(config.date)}</span>`);

  if (metaParts.length > 0) {
    parts.push(`<div class="doc-meta-row">${metaParts.join(' | ')}</div>`);
  }

  // Add separator if not first content (first content shares page with caption)
  if (!isFirstContent && parts.length > 0) {
    return `<div class="config-header">${parts.join('\n')}</div><hr class="doc-separator">`;
  }

  return `<div class="config-header">${parts.join('\n')}</div>`;
}

// Generate footer text for CSS content (returns plain text, not HTML)
function generateFooterText(config: PDFConfig, showPageNumber: boolean, pageNumberFormat?: string): string {
  const parts: string[] = [];

  if (config.copyright) {
    parts.push(config.copyright);
  }

  if (showPageNumber) {
    // Page number will be handled by CSS counter(page)
    parts.push('{page}');
  }

  return parts.length > 0 ? parts.join(' | ') : '';
}

// Generate watermark CSS
function generateWatermarkCSS(watermarkConfig?: WatermarkConfig): string {
  if (!watermarkConfig || !watermarkConfig.text) {
    return '';
  }

  const wm = watermarkConfig;
  const opacity = wm.opacity ?? 0.1;
  const color = wm.color ?? '#999';
  const fontSize = wm.fontSize ?? '48px';
  const angle = wm.angle ?? -30;
  const density = wm.density ?? 'normal';

  // Determine grid spacing based on density
  const gridSpacing = density === 'sparse' ? 2 : density === 'dense' ? 1 : 1.5;
  const width = 100 * gridSpacing;
  const height = 100 * gridSpacing;

  return `
/* Watermark styles */
.watermark-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1000;
  overflow: hidden;
}

.watermark {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(${angle}deg);
  font-size: ${fontSize};
  color: ${color};
  opacity: ${opacity};
  font-weight: bold;
  white-space: nowrap;
  user-select: none;
}

/* Create watermark grid based on density */
@page {
  margin: 0;
}

.watermark-grid {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 1000;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(${width}mm, 1fr));
  grid-template-rows: repeat(auto-fit, minmax(${height}mm, 1fr));
}

.watermark-item {
  display: flex;
  align-items: center;
  justify-content: center;
}

.watermark-item span {
  font-size: ${fontSize};
  color: ${color};
  opacity: ${opacity};
  font-weight: bold;
  transform: rotate(${angle}deg);
  white-space: nowrap;
}`;
}

// Generate watermark HTML
function generateWatermarkHTML(watermarkConfig?: WatermarkConfig): string {
  if (!watermarkConfig || !watermarkConfig.text) {
    return '';
  }

  const text = escapeHtml(watermarkConfig.text);
  const density = watermarkConfig.density ?? 'normal';

  // Calculate number of watermarks based on density
  const count = density === 'sparse' ? 4 : density === 'dense' ? 16 : 9;

  let watermarks = '';
  for (let i = 0; i < count; i++) {
    watermarks += `<div class="watermark-item"><span>${text}</span></div>`;
  }

  return `<div class="watermark-grid">${watermarks}</div>`;
}

// 加载 KaTeX CSS（启动时缓存）
let katexCss: string;
try {
  katexCss = readFileSync(join(process.cwd(), 'node_modules/katex/dist/katex.min.css'), 'utf-8');
} catch {
  console.warn('KaTeX CSS not found, formulas may not render correctly');
  katexCss = '';
}

// POST /api/v1/pdf/export
pdfRouter.post('/export', async (c) => {
  const user = c.get('user') as User;
  let body: MultiPDFExportRequest;

  try {
    body = await c.req.json();
  } catch {
    return c.json(
      {
        success: false,
        error: { code: 'INVALID_JSON', message: 'Invalid JSON body' },
      },
      400
    );
  }

  // Validate documents array
  if (!body.documents || !Array.isArray(body.documents)) {
    return c.json(
      {
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'documents array is required' },
      },
      400
    );
  }

  if (body.documents.length === 0) {
    return c.json(
      {
        success: false,
        error: { code: 'EMPTY_DOCUMENTS', message: 'documents array cannot be empty' },
      },
      400
    );
  }

  // Validate document count limit
  if (body.documents.length > 50) {
    return c.json(
      {
        success: false,
        error: { code: 'TOO_MANY_DOCUMENTS', message: 'Maximum 50 documents allowed' },
      },
      400
    );
  }

  // Validate total content size (10MB limit)
  let totalSize = 0;
  for (const doc of body.documents) {
    if (isContentItem(doc)) {
      for (const item of doc.items) {
        totalSize += (item?.length || 0);
      }
    } else if (isChapterItem(doc)) {
      totalSize += doc.chapter.length;
    }
  }

  if (totalSize > 10 * 1024 * 1024) {
    return c.json(
      {
        success: false,
        error: { code: 'PAYLOAD_TOO_LARGE', message: 'Total content size exceeds 10MB limit' },
      },
      413
    );
  }

  // Validate each document item
  for (let i = 0; i < body.documents.length; i++) {
    const doc = body.documents[i];
    if (!isChapterItem(doc) && !isContentItem(doc)) {
      return c.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: `documents[${i}] must be a chapter item (with 'chapter') or content item (with 'items' array)` },
        },
        400
      );
    }

    if (isContentItem(doc) && (!doc.items || doc.items.length === 0)) {
      return c.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: `documents[${i}].items array cannot be empty` },
        },
        400
      );
    }
  }

  // Validate template
  const templateId = body.template || 'base';
  const template = getTemplate(templateId);
  if (!template) {
    return c.json(
      {
        success: false,
        error: { code: 'INVALID_TEMPLATE', message: `Template "${templateId}" does not exist` },
      },
      400
    );
  }

  const config = body.config || {};
  const options = body.options || {};
  const showPageNumber = options.showPageNumber !== false; // default true

  try {
    const sections: string[] = [];
    let isFirstContent = true;
    let hasSeenFirstChapter = false;

    // Generate config header at the start
    const configHeader = generateConfigHeader(config, true);
    if (configHeader) {
      sections.push(`<div class="config-section">${configHeader}</div>`);
    }

    // Process each document item
    for (const doc of body.documents) {
      if (isChapterItem(doc)) {
        // Chapter item - creates a section header
        const pageBreakClass = hasSeenFirstChapter ? 'page-break-before' : '';
        hasSeenFirstChapter = true;
        isFirstContent = false;

        sections.push(`
  <div class="chapter-section ${pageBreakClass}">
    <h1 class="chapter-title">${escapeHtml(doc.chapter)}</h1>
  </div>`);
      } else if (isContentItem(doc)) {
        // Content item - renders title + concatenated items
        const contentParts: string[] = [];

        // Optional title
        if (doc.title) {
          contentParts.push(`<h2 class="content-title">${escapeHtml(doc.title)}</h2>`);
        }

        // Concatenate all items (directly joined)
        for (const item of doc.items) {
          contentParts.push(parseMarkdown(item));
        }

        const pageBreakClass = hasSeenFirstChapter ? 'page-break-before' : '';
        if (hasSeenFirstChapter) {
          isFirstContent = false;
        }

        sections.push(`
  <div class="content-section ${pageBreakClass}">
    ${contentParts.join('\n')}
  </div>`);
      }
    }

    // Generate CSS variables override
    const cssVarsOverride = body.options?.cssVars
      ? `:root { ${Object.entries(body.options.cssVars)
          .map(([key, value]) => `--${sanitizeKey(key)}: ${sanitizeValue(value)};`)
          .join(' ')} }`
      : '';

    // Generate footer text for CSS content
    const footerText = generateFooterText(config, showPageNumber, options.pageNumberFormat);
    // Build page CSS - handle counter() functions outside quotes
    let pageCSS = '';
    if (showPageNumber && footerText) {
      // Split by {page} and {total} to properly handle CSS counters
      const parts: string[] = [];
      let remaining = footerText;
      let placeholderIndex: number;
      let hasPageNumber = false;

      while ((placeholderIndex = remaining.indexOf('{page}')) !== -1) {
        // Add text before placeholder (escaped)
        if (placeholderIndex > 0) {
          parts.push(`"${remaining.slice(0, placeholderIndex).replace(/"/g, '\\"')}"`);
        }
        // Add CSS counter
        parts.push('counter(page)');
        hasPageNumber = true;
        remaining = remaining.slice(placeholderIndex + 6); // {page} is 6 chars
      }

      // Handle {total} placeholder
      while ((placeholderIndex = remaining.indexOf('{total}')) !== -1) {
        if (placeholderIndex > 0) {
          parts.push(`"${remaining.slice(0, placeholderIndex).replace(/"/g, '\\"')}"`);
        }
        parts.push('counter(pages)');
        remaining = remaining.slice(placeholderIndex + 7); // {total} is 7 chars
      }

      // Add remaining text
      if (remaining) {
        parts.push(`"${remaining.replace(/"/g, '\\"')}"`);
      }

      const contentValue = parts.join(' ');

      pageCSS = `
@page {
  @bottom-center {
    content: ${contentValue};
    font-size: 10px;
    color: #888;
  }
}
`;
    }

    // Generate watermark CSS and HTML (now from options)
    const watermarkCSS = generateWatermarkCSS(options.watermark);
    const watermarkHTML = generateWatermarkHTML(options.watermark);

    // Build complete HTML
    const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.caption ? escapeHtml(config.caption) : 'PDF Export'}</title>
  <style>
/* KaTeX 样式 */
${katexCss}

/* 模板样式 */
${template.css}

/* CSS 变量覆盖 */
${cssVarsOverride}

/* 文档结构样式 */
.doc-caption {
  text-align: center;
  font-size: 24px;
  font-weight: bold;
  margin: 30px 0 15px;
  color: #333;
}

.doc-subtitle {
  text-align: center;
  font-size: 18px;
  font-weight: normal;
  margin: 10px 0 20px;
  color: #666;
}

.doc-meta-row {
  text-align: center;
  margin: 15px 0 30px;
  font-size: 14px;
  color: #888;
}

.doc-separator {
  border: none;
  border-top: 2px solid #333;
  margin: 30px 0;
}

.config-section {
  margin-bottom: 20px;
}

.chapter-section {
  margin-top: 30px;
}

.chapter-title {
  font-size: 22px;
  font-weight: bold;
  border-bottom: 2px solid #333;
  padding-bottom: 10px;
  margin: 20px 0 30px;
  color: #333;
}

.content-section {
  margin-bottom: 20px;
}

.content-title {
  font-size: 18px;
  font-weight: 600;
  margin: 20px 0 15px;
  color: #444;
  padding-left: 10px;
  border-left: 4px solid #667eea;
}

.page-break-before {
  page-break-before: always;
  break-before: page;
}

/* Page number styling (CSS counter) */
${pageCSS}

/* Watermark styling */
${watermarkCSS}
  </style>
</head>
<body>
${sections.join('\n')}
${watermarkHTML}
</body>
</html>`;

    // Generate PDF
    const pdfBuffer = await generatePDF(fullHtml, body.options);

    // Return PDF directly
    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="export.pdf"',
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    console.error('PDF generation error:', err);

    // Sanitize error message for client
    let clientMessage = 'PDF generation failed';
    if (err.message.includes('timed out') || err.name === 'AbortError') {
      clientMessage = 'PDF generation timed out. Try reducing document size.';
    } else if (err.message.includes('Gotenberg')) {
      clientMessage = 'PDF service error. Please try again later.';
    }

    return c.json(
      {
        success: false,
        error: { code: 'PDF_GENERATION_FAILED', message: clientMessage },
      },
      500
    );
  }
});

// GET /api/v1/pdf/templates
pdfRouter.get('/templates', (c) => {
  return c.json({
    templates: getTemplateList(),
  });
});

// Helper function to escape HTML in titles
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
