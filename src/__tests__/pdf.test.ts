// src/__tests__/pdf.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseMarkdown } from '../services/markdown';

// Mock fetch for Gotenberg
const originalFetch = global.fetch;

describe('PDF Export Service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Markdown Service', () => {
    it('should parse basic markdown', () => {
      const result = parseMarkdown('# Hello World');
      expect(result).toContain('<h1>Hello World</h1>');
    });

    it('should parse multiple paragraphs', () => {
      const result = parseMarkdown('First paragraph.\n\nSecond paragraph.');
      expect(result).toContain('<p>First paragraph.</p>');
      expect(result).toContain('<p>Second paragraph.</p>');
    });

    it('should parse lists', () => {
      const result = parseMarkdown('- Item 1\n- Item 2\n- Item 3');
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>Item 1</li>');
      expect(result).toContain('<li>Item 2</li>');
      expect(result).toContain('<li>Item 3</li>');
    });

    it('should parse code blocks', () => {
      const result = parseMarkdown('```\ncode here\n```');
      expect(result).toContain('<pre>');
      expect(result).toContain('code here');
    });

    it('should parse inline code', () => {
      const result = parseMarkdown('Use `npm install` to install');
      expect(result).toContain('<code>npm install</code>');
    });

    it('should parse bold and italic', () => {
      const result = parseMarkdown('**bold** and *italic*');
      expect(result).toContain('<strong>bold</strong>');
      expect(result).toContain('<em>italic</em>');
    });

    it('should parse KaTeX inline formulas', () => {
      const result = parseMarkdown('The formula $E=mc^2$ is famous');
      expect(result).toContain('katex-inline');
      expect(result).toContain('E=mc^2');
    });

    it('should parse KaTeX block formulas', () => {
      const result = parseMarkdown('$$\n\\int_0^1 x^2 dx\n$$');
      expect(result).toContain('katex-block');
    });

    it('should NOT allow raw HTML (security)', () => {
      const result = parseMarkdown('<script>alert("xss")</script>');
      // HTML tags should be escaped, not rendered as HTML
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });

    it('should escape HTML tags in text', () => {
      const result = parseMarkdown('Use <div> tags');
      // markdown-it escapes HTML when html: false
      expect(result).not.toContain('<div>');
    });
  });

  describe('Validation Logic', () => {
    // Test request validation logic
    const validateRequest = (body: any) => {
      if (!body.documents || !Array.isArray(body.documents)) {
        return { valid: false, error: 'INVALID_REQUEST' };
      }
      if (body.documents.length === 0) {
        return { valid: false, error: 'EMPTY_DOCUMENTS' };
      }
      if (body.documents.length > 50) {
        return { valid: false, error: 'TOO_MANY_DOCUMENTS' };
      }
      const totalSize = body.documents.reduce((sum: number, doc: any) => sum + (doc.markdown?.length || 0), 0);
      if (totalSize > 10 * 1024 * 1024) {
        return { valid: false, error: 'PAYLOAD_TOO_LARGE' };
      }
      for (let i = 0; i < body.documents.length; i++) {
        if (!body.documents[i].markdown) {
          return { valid: false, error: `documents[${i}].markdown is required` };
        }
      }
      return { valid: true };
    };

    it('should reject missing documents array', () => {
      const result = validateRequest({});
      expect(result.valid).toBe(false);
      expect(result.error).toBe('INVALID_REQUEST');
    });

    it('should reject empty documents array', () => {
      const result = validateRequest({ documents: [] });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('EMPTY_DOCUMENTS');
    });

    it('should reject more than 50 documents', () => {
      const documents = Array(51).fill({ markdown: 'test' });
      const result = validateRequest({ documents });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('TOO_MANY_DOCUMENTS');
    });

    it('should accept exactly 50 documents', () => {
      const documents = Array(50).fill({ markdown: 'test' });
      const result = validateRequest({ documents });
      expect(result.valid).toBe(true);
    });

    it('should reject documents without markdown', () => {
      const result = validateRequest({ documents: [{ title: 'No content' }] });
      expect(result.valid).toBe(false);
    });

    it('should accept valid request', () => {
      const result = validateRequest({
        documents: [
          { title: 'Section 1', markdown: '# Hello' },
          { title: 'Section 2', markdown: '## World' }
        ]
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('Gotenberg Service', () => {
    it('should call Gotenberg with correct parameters', async () => {
      // Create a mock PDF buffer with valid header and sufficient size
      const mockPdfContent = '%PDF-1.4\n' + 'x'.repeat(200) + '\n%%EOF';
      const mockBuffer = Buffer.from(mockPdfContent);
      const mockArrayBuffer = mockBuffer.buffer.slice(mockBuffer.byteOffset, mockBuffer.byteOffset + mockBuffer.byteLength);
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/pdf' : null
        },
        arrayBuffer: () => Promise.resolve(mockArrayBuffer)
      });

      // Import after mocking
      const { generatePDF } = await import('../services/gotenberg.js');

      const html = '<html><body>Test</body></html>';
      const result = await generatePDF(html);

      expect(global.fetch).toHaveBeenCalled();
      const call = (global.fetch as any).mock.calls[0];
      expect(call[0]).toContain('/forms/chromium/convert/html');
      expect(call[1].method).toBe('POST');
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle Gotenberg errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal error')
      });

      const { generatePDF } = await import('../services/gotenberg.js');

      await expect(generatePDF('<html></html>')).rejects.toThrow();
    });

    it('should validate PDF header', async () => {
      // Invalid PDF (wrong header) - must be > 100 bytes
      const invalidContent = 'Not a PDF file - ' + 'x'.repeat(150);
      const invalidBuffer = Buffer.from(invalidContent);
      const invalidArrayBuffer = invalidBuffer.buffer.slice(invalidBuffer.byteOffset, invalidBuffer.byteOffset + invalidBuffer.byteLength);
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/pdf' : null
        },
        arrayBuffer: () => Promise.resolve(invalidArrayBuffer)
      });

      const { generatePDF } = await import('../services/gotenberg.js');

      await expect(generatePDF('<html></html>')).rejects.toThrow();
    });
  });

  describe('Margin Parsing', () => {
    const parseMargin = (marginStr: string | undefined, defaultMm: number): number => {
      const mmToInch = (mm: number) => mm / 25.4;
      if (!marginStr) return mmToInch(defaultMm);

      const match = marginStr.match(/^(\d+(?:\.\d+)?)\s*(mm|in)?$/);
      if (!match) {
        return mmToInch(defaultMm);
      }

      const value = parseFloat(match[1]);
      if (isNaN(value)) {
        return mmToInch(defaultMm);
      }

      const unit = match[2] || 'mm';
      return unit === 'in' ? value : mmToInch(value);
    };

    it('should return default for undefined', () => {
      const result = parseMargin(undefined, 20);
      expect(result).toBeCloseTo(20 / 25.4, 4);
    });

    it('should parse mm values', () => {
      const result = parseMargin('25mm', 20);
      expect(result).toBeCloseTo(25 / 25.4, 4);
    });

    it('should parse inch values', () => {
      const result = parseMargin('1in', 20);
      expect(result).toBe(1);
    });

    it('should handle values without units (assume mm)', () => {
      const result = parseMargin('30', 20);
      expect(result).toBeCloseTo(30 / 25.4, 4);
    });

    it('should return default for invalid format', () => {
      const result = parseMargin('invalid', 20);
      expect(result).toBeCloseTo(20 / 25.4, 4);
    });

    it('should handle decimal values', () => {
      const result = parseMargin('15.5mm', 20);
      expect(result).toBeCloseTo(15.5 / 25.4, 4);
    });
  });

  describe('HTML Escape', () => {
    const escapeHtml = (text: string): string => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    });

    it('should escape ampersand', () => {
      expect(escapeHtml('a & b')).toBe('a &amp; b');
    });

    it('should escape quotes', () => {
      expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;');
    });

    it('should escape single quotes', () => {
      expect(escapeHtml("it's")).toBe('it&#039;s');
    });
  });
});
