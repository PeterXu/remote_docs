// src/services/markdown.ts
import MarkdownIt from 'markdown-it';
import katex from 'katex';

const md = new MarkdownIt({
  html: false, // Disable raw HTML for security
  linkify: true,
  typographer: true,
  breaks: true, // Convert \n to <br>
});

// 使用KaTeX渲染LaTeX公式
function renderKatex(html: string): string {
  // 先处理块级公式 $$...$$
  html = html.replace(/\$\$([\s\S]+?)\$\$/g, (_, formula) => {
    try {
      const rendered = katex.renderToString(formula.trim(), {
        displayMode: true,
        throwOnError: false,
        output: 'html',
      });
      return `<div class="katex-block">${rendered}</div>`;
    } catch (e) {
      // 渲染失败时显示原始公式
      return `<div class="katex-block katex-error">${formula.trim()}</div>`;
    }
  });

  // 再处理行内公式 $...$（避免匹配货币符号）
  html = html.replace(/(?<![a-zA-Z])\$([^\$\n]+?)\$(?![a-zA-Z])/g, (_, formula) => {
    try {
      const rendered = katex.renderToString(formula.trim(), {
        displayMode: false,
        throwOnError: false,
        output: 'html',
      });
      return `<span class="katex-inline">${rendered}</span>`;
    } catch (e) {
      // 渲染失败时显示原始公式
      return `<span class="katex-inline katex-error">${formula.trim()}</span>`;
    }
  });

  return html;
}

export function parseMarkdown(content: string): string {
  // 先处理LaTeX公式，再进行Markdown渲染
  // 这样可以避免Markdown解析器干扰LaTeX语法
  let processed = content;

  // 临时替换块级公式以保护它们
  const blockFormulas: string[] = [];
  processed = processed.replace(/\$\$([\s\S]+?)\$\$/g, (_, formula) => {
    const index = blockFormulas.length;
    blockFormulas.push(formula.trim());
    return `%%BLOCK_FORMULA_${index}%%`;
  });

  // 临时替换行内公式以保护它们
  const inlineFormulas: string[] = [];
  processed = processed.replace(/(?<![a-zA-Z])\$([^\$\n]+?)\$(?![a-zA-Z])/g, (_, formula) => {
    const index = inlineFormulas.length;
    inlineFormulas.push(formula.trim());
    return `%%INLINE_FORMULA_${index}%%`;
  });

  // 渲染Markdown
  let html = md.render(processed);

  // 恢复并渲染块级公式
  blockFormulas.forEach((formula, index) => {
    try {
      const rendered = katex.renderToString(formula, {
        displayMode: true,
        throwOnError: false,
        output: 'html',
      });
      html = html.replace(`%%BLOCK_FORMULA_${index}%%`, rendered);
    } catch (e) {
      html = html.replace(`%%BLOCK_FORMULA_${index}%%`, formula);
    }
  });

  // 恢复并渲染行内公式
  inlineFormulas.forEach((formula, index) => {
    try {
      const rendered = katex.renderToString(formula, {
        displayMode: false,
        throwOnError: false,
        output: 'html',
      });
      html = html.replace(`%%INLINE_FORMULA_${index}%%`, rendered);
    } catch (e) {
      html = html.replace(`%%INLINE_FORMULA_${index}%%`, formula);
    }
  });

  return html;
}
