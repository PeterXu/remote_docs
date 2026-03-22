// src/services/markdown.ts
import MarkdownIt from 'markdown-it';
import katex from 'katex';

const md = new MarkdownIt({
  html: false, // Disable raw HTML for security
  linkify: true,
  typographer: true,
  breaks: true, // Convert \n to <br>
});

/** 分页标记 - 用于强制分页 */
export const PAGE_BREAK_MARKER = '<!-- PAGE_BREAK -->';
export const PAGE_BREAK_HTML = '<div class="page-break-before">&nbsp;</div>';

/** 分页占位符 - 在Markdown渲染后替换为HTML */
const PAGE_BREAK_PLACEHOLDER = '%%PAGE_BREAK%%';

export function parseMarkdown(content: string): string {
  // 先处理分页标记 - 使用占位符避免被Markdown HTML过滤
  let processed = content.replace(/<!--\s*PAGE_BREAK\s*-->/gi, PAGE_BREAK_PLACEHOLDER);

  // 然后处理LaTeX公式，避免Markdown解析器干扰LaTeX语法

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

  // 最后处理分页标记 - 在Markdown渲染后替换为HTML（处理所有出现）
  html = html.replaceAll(PAGE_BREAK_PLACEHOLDER, PAGE_BREAK_HTML);

  return html;
}
