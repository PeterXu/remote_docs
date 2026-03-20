// src/services/gotenberg.ts
import type { PDFOptions } from '../types';

const GOTENBERG_URL = process.env.GOTENBERG_URL || 'http://localhost:3001';
const REQUEST_TIMEOUT = parseInt(process.env.GOTENBERG_TIMEOUT || '60000');

function mmToInch(mm: number): number {
  return mm / 25.4;
}

function parseMargin(marginStr: string | undefined, defaultMm: number): number {
  if (!marginStr) return mmToInch(defaultMm);

  // Extract numeric value with optional unit
  const match = marginStr.match(/^(\d+(?:\.\d+)?)\s*(mm|in)?$/);
  if (!match) {
    console.warn(`Invalid margin format: ${marginStr}, using default ${defaultMm}mm`);
    return mmToInch(defaultMm);
  }

  const value = parseFloat(match[1]);
  if (isNaN(value)) {
    return mmToInch(defaultMm);
  }

  // If unit is 'in', value is already in inches
  const unit = match[2] || 'mm';
  return unit === 'in' ? value : mmToInch(value);
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

  let response: Response;
  try {
    response = await fetch(`${GOTENBERG_URL}/forms/chromium/convert/html`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });
  } catch (error) {
    // Handle timeout specifically
    if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('abort'))) {
      throw new Error('PDF generation timed out');
    }
    throw error;
  }

  if (!response.ok) {
    const text = await response.text();
    // Log full error for debugging, but don't expose to client
    console.error('Gotenberg error:', response.status, text);
    throw new Error('Gotenberg service error');
  }

  // Validate response is actually a PDF
  const contentType = response.headers.get('content-type');
  if (contentType && !contentType.includes('application/pdf')) {
    console.error('Gotenberg returned non-PDF content-type:', contentType);
    throw new Error('Gotenberg returned invalid response');
  }

  const arrayBuffer = await response.arrayBuffer();

  // Validate minimum PDF size
  if (arrayBuffer.byteLength < 100) {
    console.error('PDF buffer too small:', arrayBuffer.byteLength);
    throw new Error('Generated PDF is invalid');
  }

  // Validate PDF header
  const header = new Uint8Array(arrayBuffer, 0, 4);
  const pdfHeader = String.fromCharCode(...header);
  if (pdfHeader !== '%PDF') {
    console.error('Invalid PDF header:', pdfHeader);
    throw new Error('Response is not a valid PDF');
  }

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
