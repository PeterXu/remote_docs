// src/templates/base.ts
import type { PDFTemplate } from '../types';

export const baseTemplate: PDFTemplate = {
  id: 'base',
  name: '基础样式',
  description: '简洁的黑白样式',
  css: `
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #24292f;
    }
    h1, h2, h3 { margin-top: 24px; margin-bottom: 16px; font-weight: 600; line-height: 1.25; }
    h1 { font-size: 2em; border-bottom: 1px solid #d0d7de; padding-bottom: .3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #d0d7de; padding-bottom: .3em; }
    h3 { font-size: 1.25em; }
    p { margin: 16px 0; }
    code { background: rgba(175,184,193,0.2); padding: 2px 6px; border-radius: 6px; font-size: 85%; font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace; }
    pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow: auto; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 4px solid #d0d7de; margin: 0; padding-left: 16px; color: #57606a; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid #d0d7de; padding: 8px 12px; }
    th { background: #f6f8fa; }
    ul, ol { margin: 16px 0; padding-left: 2em; }
    li { margin: 4px 0; }
    a { color: #0969da; text-decoration: none; }
    hr { border: none; border-top: 1px solid #d0d7de; margin: 24px 0; }
    img { max-width: 100%; height: auto; }

    /* KaTeX公式样式 */
    .katex-block {
      text-align: center;
      margin: 20px 0;
      padding: 10px;
      background: #f6f8fa;
      border-radius: 6px;
      font-size: 1.1em;
      font-family: 'Times New Roman', serif;
      font-style: italic;
    }
    .katex-inline {
      background: rgba(175,184,193,0.2);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Times New Roman', serif;
      font-style: italic;
    }
  `,
};
