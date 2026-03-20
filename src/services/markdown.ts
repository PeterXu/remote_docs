// src/services/markdown.ts
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({
  html: false, // Disable raw HTML for security
  linkify: true,
  typographer: true,
});

// 简单的KaTeX占位符替换（行内 $...$ 和块级 $$...$$）
// 实际渲染将在浏览器/Gotenberg中通过KaTeX CSS完成
function replaceKatex(html: string): string {
  // 块级公式 $$...$$
  html = html.replace(/\$\$([\s\S]+?)\$\$/g, (_, formula) => {
    return `<div class="katex-block" data-formula="${formula.trim()}">${formula.trim()}</div>`;
  });

  // 行内公式 $...$（避免匹配货币符号）
  html = html.replace(/(?<![a-zA-Z])\$([^\$\n]+?)\$(?![a-zA-Z])/g, (_, formula) => {
    return `<span class="katex-inline" data-formula="${formula.trim()}">${formula.trim()}</span>`;
  });

  return html;
}

export function parseMarkdown(content: string): string {
  const html = md.render(content);
  return replaceKatex(html);
}
