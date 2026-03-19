// src/templates/github.ts
import type { PDFTemplate } from '../types';

export const githubTemplate: PDFTemplate = {
  id: 'github',
  name: 'GitHub风格',
  description: '仿GitHub markdown渲染',
  css: `
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
      line-height: 1.6;
      max-width: 980px;
      margin: 0 auto;
      padding: 45px;
      background: #ffffff;
      color: #1f2328;
      font-size: 16px;
    }

    /* GitHub风格标题 */
    h1 {
      font-size: 32px;
      font-weight: 600;
      border-bottom: 1px solid #d0d7de;
      padding-bottom: .3em;
      margin: 24px 0 16px;
    }
    h2 {
      font-size: 24px;
      font-weight: 600;
      border-bottom: 1px solid #d0d7de;
      padding-bottom: .3em;
      margin: 24px 0 16px;
    }
    h3 { font-size: 20px; font-weight: 600; margin: 24px 0 16px; }
    h4 { font-size: 16px; font-weight: 600; margin: 24px 0 16px; }
    h5 { font-size: 14px; font-weight: 600; margin: 24px 0 16px; }
    h6 { font-size: 13px; font-weight: 600; margin: 24px 0 16px; color: #656d76; }

    /* 段落 */
    p { margin: 16px 0; }

    /* 代码块 */
    code {
      background: rgba(175,184,193,0.2);
      padding: .2em .4em;
      border-radius: 6px;
      font-size: 85%;
      font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace;
    }
    pre {
      background: #f6f8fa;
      padding: 16px;
      border-radius: 6px;
      overflow: auto;
      line-height: 1.45;
      margin: 16px 0;
    }
    pre code {
      background: transparent;
      padding: 0;
      font-size: 85%;
    }

    /* 引用 */
    blockquote {
      border-left: .25em solid #d0d7de;
      margin: 16px 0;
      padding: 0 1em;
      color: #656d76;
    }

    /* 列表 */
    ul, ol { margin: 16px 0; padding-left: 2em; }
    li { margin: 4px 0; }
    li + li { margin-top: 4px; }

    /* 表格 */
    table { border-collapse: collapse; width: 100%; margin: 16px 0; display: block; overflow-x: auto; }
    th, td { border: 1px solid #d0d7de; padding: 8px 14px; }
    th { background: #f6f8fa; font-weight: 600; }
    tr:nth-child(2n) { background: #f6f8fa; }

    /* 链接 */
    a { color: #0969da; text-decoration: none; }
    a:hover { text-decoration: underline; }

    /* 分隔线 */
    hr { border: none; border-top: 2px solid #d0d7de; margin: 24px 0; }

    /* 图片 */
    img { max-width: 100%; height: auto; border-radius: 6px; }

    /* 数学公式 */
    .katex-block {
      text-align: center;
      margin: 20px 0;
      padding: 12px;
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

    /* 任务列表 */
    input[type="checkbox"] { margin-right: 8px; }
  `,
};
