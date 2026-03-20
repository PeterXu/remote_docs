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
