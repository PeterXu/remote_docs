# remote_docs Thin Wrapper Design

## Overview

remote_docs is a minimal service that wraps Gotenberg for PDF generation. It converts multiple Markdown documents into a single PDF and returns it directly to the client.

## Design Principles

1. **Thin wrapper** - Minimal logic, delegate to Gotenberg
2. **No storage** - Return PDF directly, no persistence
3. **Stateless** - No database, easy horizontal scaling
4. **Simple auth** - Supabase JWT validation only

## Architecture

```
[ Supabase Edge Function ]
        ↓ (provides remote_docs URL to client)
[ Client ]
        ↓ POST /api/v1/pdf/export
        Authorization: Bearer <supabase_jwt>
        { documents: [...], template: "github" }
[ remote_docs ]
        ├─ Validate JWT
        ├─ Parse each markdown to HTML
        ├─ Combine with page breaks
        └─ Forward to Gotenberg
        ↓
[ Gotenberg ]
        ↓ PDF binary
[ Client receives PDF stream ]
```

## API Design

### POST /api/v1/pdf/export

**Request Headers**
```
Authorization: Bearer <supabase_jwt>
Content-Type: application/json
```

**Request Body**
```json
{
  "documents": [
    { "title": "Section 1", "markdown": "# Title\n\nContent..." },
    { "title": "Section 2", "markdown": "## Another\n\nMore content..." }
  ],
  "template": "github",
  "options": {
    "format": "A4",
    "margin": {
      "top": "20mm",
      "bottom": "20mm",
      "left": "15mm",
      "right": "15mm"
    }
  }
}
```

**Success Response**
- Status: 200
- Content-Type: application/pdf
- Body: PDF binary stream

**Error Response**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "documents array is required"
  }
}
```

### GET /api/v1/health

```json
{
  "status": "healthy",
  "services": {
    "gotenberg": "ok"
  }
}
```

### GET /api/v1/templates

```json
{
  "templates": [
    { "id": "base", "name": "Basic", "description": "Simple clean style" },
    { "id": "github", "name": "GitHub", "description": "GitHub markdown style" },
    { "id": "exam", "name": "Exam", "description": "Exam paper format" }
  ]
}
```

## Components

### 1. Auth Middleware (unchanged)
- Validates Supabase JWT
- Extracts user info
- Returns 401 on invalid token

### 2. PDF Route Handler
- Validates request body
- Converts each document's markdown to HTML
- Combines HTML with page break separators
- Calls Gotenberg service
- Streams PDF response back

### 3. Markdown Service
- Uses markdown-it with KaTeX for math formulas
- Returns HTML string for each markdown input

### 4. Gotenberg Service
- Builds multipart form data with HTML
- Sends to Gotenberg `/forms/chromium/convert/html`
- Returns PDF buffer

### 5. Template System (unchanged)
- base, github, exam templates
- CSS styles for PDF rendering

## Page Break Strategy

Each document in the array is separated by a CSS page break:

```html
<div style="page-break-after: always;"></div>
```

Combined HTML structure:
```html
<!DOCTYPE html>
<html>
<head>
  <style>${template.css}</style>
  <style>
    .document-section { page-break-after: always; }
    .document-section:last-child { page-break-after: auto; }
  </style>
</head>
<body>
  <div class="document-section">
    <h1 class="section-title">Section 1</h1>
    ${html_content_1}
  </div>
  <div class="document-section">
    <h1 class="section-title">Section 2</h1>
    ${html_content_2}
  </div>
</body>
</html>
```

## Environment Variables

```bash
# Authentication
SUPABASE_JWT_SECRET=your-jwt-secret

# Gotenberg
GOTENBERG_URL=http://gotenberg:3000

# Server
PORT=3000
NODE_ENV=production
```

## Docker Compose

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
    depends_on:
      - gotenberg
    restart: unless-stopped

  gotenberg:
    image: gotenberg/gotenberg:8
    restart: unless-stopped
```

## Code Changes

### Files to Modify

1. **src/types/index.ts**
   - Add `MultiPDFExportRequest` type
   - Remove `PDFExportResponse` storage-related fields

2. **src/routes/pdf.ts**
   - Change to handle multiple documents
   - Remove Supabase upload logic
   - Return PDF binary directly

3. **src/services/supabase.ts**
   - DELETE this file (no longer needed)

4. **src/services/gotenberg.ts**
   - Minor adjustments for multi-document HTML

5. **src/routes/health.ts**
   - Remove Supabase health check

6. **docker-compose.yml**
   - Remove Supabase environment variables

### Files to Keep Unchanged

- `src/index.ts` - Entry point
- `src/middleware/auth.ts` - JWT validation
- `src/services/markdown.ts` - Markdown parsing
- `src/templates/*` - Template system

## Request Flow

```
1. Client sends POST /api/v1/pdf/export with JWT and documents array
2. Auth middleware validates JWT
3. Route handler validates request body
4. For each document:
   - Convert markdown to HTML
5. Combine all HTML with page break divs
6. Wrap in full HTML document with template CSS
7. Send to Gotenberg as multipart form
8. Stream Gotenberg's PDF response to client
```

## Error Handling

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| UNAUTHORIZED | 401 | Missing/invalid JWT |
| INVALID_JSON | 400 | Malformed request body |
| INVALID_REQUEST | 400 | Missing documents array |
| EMPTY_DOCUMENTS | 400 | documents array is empty |
| PDF_GENERATION_FAILED | 500 | Gotenberg error |

## Performance Considerations

- Streaming response reduces memory usage
- No database I/O = faster response
- Gotenberg handles concurrent requests
- Consider timeout for large documents (60s default)
