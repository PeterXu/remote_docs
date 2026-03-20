# remote_docs Thin Wrapper Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor remote_docs to be a minimal Gotenberg wrapper that accepts multiple markdown documents, merges them with page breaks, and returns PDF directly.

**Architecture:** Client (JWT) → remote_docs (auth + markdown conversion) → Gotenberg → PDF binary response

**Tech Stack:** Node.js 20, Hono, markdown-it, KaTeX, Gotenberg

---

## Chunk 1: Types and Cleanup

### Task 1: Update Type Definitions

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Update types for multi-document support**

Replace the entire file content:

```typescript
// src/types/index.ts
export interface User {
  id: string;
  email: string;
}

export interface DocumentSection {
  title?: string;
  markdown: string;
}

export interface MultiPDFExportRequest {
  documents: DocumentSection[];
  template?: 'base' | 'github' | 'exam';
  options?: PDFOptions;
}

export interface PDFOptions {
  format?: 'A4' | 'Letter';
  margin?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export interface PDFTemplate {
  id: string;
  name: string;
  description: string;
  css: string;
  header?: string;
  footer?: string;
}

export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  services: {
    gotenberg: 'ok' | 'error';
  };
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts && git commit -m "refactor: update types for multi-document PDF export"
```

---

### Task 2: Remove Supabase Service

**Files:**
- Delete: `src/services/supabase.ts`

- [ ] **Step 1: Delete Supabase service file**

```bash
rm src/services/supabase.ts
```

- [ ] **Step 2: Remove Supabase dependency**

```bash
npm uninstall @supabase/supabase-js
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "refactor: remove Supabase storage and database dependencies"
```

---

## Chunk 2: Service Updates

### Task 3: Update Gotenberg Service

**Files:**
- Modify: `src/services/gotenberg.ts`

- [ ] **Step 1: Simplify Gotenberg service**

Replace the entire file content:

```typescript
// src/services/gotenberg.ts
import type { PDFOptions } from '../types';

const GOTENBERG_URL = process.env.GOTENBERG_URL || 'http://localhost:3001';
const REQUEST_TIMEOUT = parseInt(process.env.GOTENBERG_TIMEOUT || '60000');

function mmToInch(mm: number): number {
  return mm / 25.4;
}

function parseMargin(marginStr: string | undefined, defaultMm: number): number {
  if (!marginStr) return mmToInch(defaultMm);
  const num = parseInt(marginStr.replace(/mm/, '').replace('in', '').trim(), 10);
  return mmToInch(num);
}

export async function generatePDF(html: string, options?: PDFOptions): Promise<Buffer> {
  const formData = new FormData();

  // HTML file
  const htmlBlob = new Blob([html], { type: 'text/html' });
  formData.append('file', htmlBlob, 'index.html');

  // PDF options
  const format = options?.format || 'A4';
  const paperWidth = format === 'A4' ? 8.27 : 8.5;
  const paperHeight = format === 'A4' ? 11.69 : 11;

  const margin = options?.margin || {};
  const marginTop = parseMargin(margin.top, 20);
  const marginBottom = parseMargin(margin.bottom, 20);
  const marginLeft = parseMargin(margin.left, 15);
  const marginRight = parseMargin(margin.right, 15);

  // Gotenberg API options
  formData.append('paperWidth', paperWidth.toString());
  formData.append('paperHeight', paperHeight.toString());
  formData.append('marginTop', marginTop.toString());
  formData.append('marginBottom', marginBottom.toString());
  formData.append('marginLeft', marginLeft.toString());
  formData.append('marginRight', marginRight.toString());
  formData.append('printBackground', 'true');
  formData.append('preferCssPageSize', 'true');

  const response = await fetch(`${GOTENBERG_URL}/forms/chromium/convert/html`, {
    method: 'POST',
    body: formData,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gotenberg error: ${response.status}: ${text}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function checkGotenbergHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${GOTENBERG_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/services/gotenberg.ts && git commit -m "refactor: simplify gotenberg service, add timeout config"
```

---

## Chunk 3: Route Updates

### Task 4: Update PDF Route

**Files:**
- Modify: `src/routes/pdf.ts`

- [ ] **Step 1: Rewrite PDF route for multi-document support**

Replace the entire file content:

```typescript
// src/routes/pdf.ts
import { Hono } from 'hono';
import { parseMarkdown } from '../services/markdown';
import { generatePDF } from '../services/gotenberg';
import { getTemplate, getTemplateList } from '../templates';
import type { MultiPDFExportRequest, User } from '../types';

export const pdfRouter = new Hono();

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

    // Generate complete HTML with page break styles
    const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PDF Export</title>
  <style>
${template.css}

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
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="export.pdf"',
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('PDF generation error:', error);

    return c.json(
      {
        success: false,
        error: { code: 'PDF_GENERATION_FAILED', message },
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
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/routes/pdf.ts && git commit -m "refactor: support multiple documents, return PDF directly"
```

---

### Task 5: Update Health Route

**Files:**
- Modify: `src/routes/health.ts`

- [ ] **Step 1: Remove Supabase health check**

Replace the entire file content:

```typescript
// src/routes/health.ts
import { Hono } from 'hono';
import { checkGotenbergHealth } from '../services/gotenberg';

export const healthRouter = new Hono();

// GET /api/v1/health
healthRouter.get('/', async (c) => {
  const gotenbergOk = await checkGotenbergHealth();

  const allHealthy = gotenbergOk;

  return c.json(
    {
      status: allHealthy ? 'healthy' : 'unhealthy',
      services: {
        gotenberg: gotenbergOk ? 'ok' : 'error',
      },
    },
    allHealthy ? 200 : 503
  );
});
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/routes/health.ts && git commit -m "refactor: remove Supabase health check"
```

---

## Chunk 4: Configuration Updates

### Task 6: Update Docker Compose

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: Remove Supabase environment variables**

Replace the entire file content:

```yaml
version: '3.8'

services:
  remote_docs:
    build: .
    ports:
      - "3000:3000"
    environment:
      - SUPABASE_JWT_SECRET=${SUPABASE_JWT_SECRET}
      - GOTENBERG_URL=http://gotenberg:3000
      - PORT=3000
      - GOTENBERG_TIMEOUT=60000
    depends_on:
      - gotenberg
    restart: unless-stopped

  gotenberg:
    image: gotenberg/gotenberg:8
    restart: unless-stopped
    # Optional: Uncomment to expose Gotenberg directly
    # ports:
    #   - "3001:3000"
```

- [ ] **Step 2: Commit**

```bash
git add docker-compose.yml && git commit -m "refactor: simplify docker-compose, remove Supabase config"
```

---

### Task 7: Update .env.example

**Files:**
- Modify: `.env.example` (create if doesn't exist)

- [ ] **Step 1: Update environment variables example**

```bash
# Authentication
SUPABASE_JWT_SECRET=your-jwt-secret

# Gotenberg
GOTENBERG_URL=http://localhost:3001
GOTENBERG_TIMEOUT=60000

# Server
PORT=3000
NODE_ENV=development
```

- [ ] **Step 2: Commit**

```bash
git add .env.example && git commit -m "docs: update env example for thin wrapper"
```

---

## Chunk 5: Build and Verify

### Task 8: Build and Test

- [ ] **Step 1: Clean build**

```bash
rm -rf dist/
npm run build
```

- [ ] **Step 2: Verify build output**

```bash
ls -la dist/
```

Expected: See all compiled `.js` files including:
- `dist/index.js`
- `dist/routes/pdf.js`
- `dist/routes/health.js`
- `dist/services/gotenberg.js`
- `dist/services/markdown.js`

- [ ] **Step 3: Verify no Supabase imports remain**

```bash
grep -r "supabase" dist/ || echo "No supabase references found - OK"
```

Expected: "No supabase references found - OK"

- [ ] **Step 4: Final commit**

```bash
git add . && git commit -m "chore: build and verify thin wrapper refactor"
```

---

## Completion Checklist

- [ ] Types updated for multi-document support
- [ ] Supabase service removed
- [ ] Supabase dependency removed from package.json
- [ ] PDF route returns PDF binary directly
- [ ] Health check only checks Gotenberg
- [ ] Docker compose simplified
- [ ] Build succeeds without errors
- [ ] No Supabase references in compiled output
