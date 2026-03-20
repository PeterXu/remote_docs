// src/routes/pdf.ts
import { Hono } from 'hono';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseMarkdown } from '../services/markdown';
import { generatePDF } from '../services/gotenberg';
import { getTemplate, getTemplateList } from '../templates';
import type { MultiPDFExportRequest, User } from '../types';

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

  // Validate total markdown size (10MB limit)
  const totalSize = body.documents.reduce((sum, doc) => sum + (doc.markdown?.length || 0), 0);
  if (totalSize > 10 * 1024 * 1024) {
    return c.json(
      {
        success: false,
        error: { code: 'PAYLOAD_TOO_LARGE', message: 'Total markdown size exceeds 10MB limit' },
      },
      413
    );
  }

  // Validate each document
  for (let i = 0; i < body.documents.length; i++) {
    if (!body.documents[i].markdown) {
      return c.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: `documents[${i}].markdown is required` },
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

  try {
    // Build HTML sections with page breaks
    const sections: string[] = [];

    for (const doc of body.documents) {
      const contentHtml = parseMarkdown(doc.markdown);

      // Add title if provided
      const titleHtml = doc.title
        ? `<h1 class="section-title">${escapeHtml(doc.title)}</h1>`
        : '';

      sections.push(`
  <div class="document-section">
    ${titleHtml}
    ${contentHtml}
  </div>`);
    }

    // Generate CSS variables override if provided
    const cssVarsOverride = body.options?.cssVars
      ? `:root { ${Object.entries(body.options.cssVars)
          .map(([key, value]) => `--${sanitizeKey(key)}: ${sanitizeValue(value)};`)
          .join(' ')} }`
      : '';

    // Generate complete HTML with page break styles
    const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PDF Export</title>
  <style>
/* KaTeX 样式 */
${katexCss}

/* 模板样式 */
${template.css}

/* CSS 变量覆盖 */
${cssVarsOverride}

    /* Page break between sections */
    .document-section {
      page-break-after: always;
    }
    .document-section:last-child {
      page-break-after: auto;
    }
    .section-title {
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
${sections.join('\n')}
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
