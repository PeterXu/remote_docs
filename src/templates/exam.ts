// src/templates/exam.ts
import type { PDFTemplate } from '../types';

export const examTemplate: PDFTemplate = {
  id: 'exam',
  name: '试卷模板',
  description: '教育试卷专用，含密封线、答题区，支持CSS变量配置',
  css: `
    /* ===== CSS 变量系统 - 可通过 options.cssVars 覆盖 ===== */
    :root {
      /* 布局参数 */
      --page-margin: 15mm;
      --content-width: 100%;

      /* 字体参数 */
      --font-title: 'SimHei', 'STHeiti', 'Heiti SC', sans-serif;
      --font-body: 'SimSun', 'STSong', 'Songti SC', 'Noto Serif SC', serif;
      --font-size-title: 22px;
      --font-size-h2: 16px;
      --font-size-h3: 14px;
      --font-size-body: 14px;
      --font-size-small: 12px;

      /* 间距参数 */
      --line-height: 1.8;
      --paragraph-gap: 10px;
      --question-gap: 18px;
      --option-gap: 8px;

      /* 答题区参数 */
      --answer-border-color: #999;
      --answer-bg-color: #fafafa;
      --answer-min-height: 80px;

      /* 边框颜色 */
      --border-color: #000;
      --border-light: #ccc;
    }

    @page {
      size: A4;
      margin: var(--page-margin);
    }

    body {
      font-family: var(--font-body);
      font-size: var(--font-size-body);
      line-height: var(--line-height);
      color: #000;
      max-width: var(--content-width);
      padding: 0;
    }

    /* ===== 试卷标题 ===== */
    h1 {
      font-family: var(--font-title);
      text-align: center;
      font-size: var(--font-size-title);
      font-weight: bold;
      margin: 0 0 5px 0;
      padding-bottom: 10px;
      border-bottom: 3px double var(--border-color);
    }

    /* ===== 大题标题 (一、二、三) ===== */
    h2 {
      font-family: var(--font-title);
      font-size: var(--font-size-h2);
      font-weight: bold;
      margin: 25px 0 15px 0;
      padding: 0;
      border: none;
      counter-increment: section;
      counter-reset: question;
    }
    h2::before {
      content: counter(section, cjk-ideographic) "、 ";
    }
    /* 大题标题后紧跟的内容不换页 */
    h2 + .question,
    h2 + p,
    h2 + ol,
    h2 + ul {
      page-break-before: avoid;
    }

    /* ===== 小题标题 ===== */
    h3 {
      font-size: var(--font-size-h3);
      font-weight: bold;
      margin: 15px 0 8px 0;
      padding: 0;
      border: none;
    }

    /* ===== 段落 ===== */
    p {
      margin: var(--paragraph-gap) 0;
      text-indent: 0;
    }

    /* ===== 题目完整性保护 ===== */
    .question {
      page-break-inside: avoid;
      break-inside: avoid;
      margin-bottom: var(--question-gap);
      counter-increment: question;
    }
    /* 题号样式 - 小题自动编号 */
    .question::before {
      content: counter(question) ". ";
      font-weight: bold;
    }
    /* 子题编号 */
    .sub-question {
      page-break-inside: avoid;
      margin-bottom: calc(var(--question-gap) * 0.6);
      counter-increment: sub-question;
    }
    .sub-question::before {
      content: "(" counter(sub-question) ") ";
      font-weight: normal;
    }

    /* ===== 选择题选项 ===== */
    /* Markdown 列表自动转为横排选项 */
    p + ul,
    p + ol {
      margin-top: 8px;
    }
    /* 选择题选项横排 - 默认两列 */
    ul, ol {
      display: flex;
      flex-wrap: wrap;
      list-style: none;
      padding: 0;
      margin: var(--option-gap) 0;
      page-break-inside: avoid;
    }
    ul li, ol li {
      width: 47%;
      min-width: 100px;
      margin: 6px 1.5%;
      padding: 4px 8px;
      text-indent: 0;
      page-break-inside: avoid;
      line-height: 1.6;
      background: #f8f8f8;
      border-radius: 4px;
    }
    /* 单列列表 - 添加 single-col 类或在 ol 时使用 */
    ol li,
    ul.single-col li {
      width: 100%;
      margin: 4px 0;
    }
    /* 行内选项 - 用于 A. xxx    B. xxx 格式 */
    p:has(+ ul):has(+ ol) {
      margin-bottom: 4px;
    }

    /* ===== 普通列表 ===== */
    ul, ol {
      margin: var(--paragraph-gap) 0;
      padding-left: 2em;
    }
    li {
      text-indent: 0;
      page-break-inside: avoid;
    }

    /* ===== 答题区 ===== */
    .answer-area {
      border: 1px solid var(--answer-border-color);
      min-height: var(--answer-min-height);
      margin: var(--paragraph-gap) 0;
      padding: 10px;
      page-break-inside: avoid;
      background: var(--answer-bg-color);
    }
    /* 大答题区 */
    .answer-area.large {
      min-height: 150px;
    }
    /* 作文答题区 */
    .answer-area.essay {
      min-height: 400px;
    }

    /* ===== 填空题下划线 ===== */
    .blank {
      display: inline-block;
      min-width: 60px;
      border-bottom: 1px solid var(--border-color);
      margin: 0 4px;
      text-align: center;
    }
    .blank.short { min-width: 40px; }
    .blank.long { min-width: 120px; }

    /* ===== 数学公式 ===== */
    .katex-block {
      text-align: center;
      margin: 15px 0;
      font-size: 1.1em;
      font-family: 'Times New Roman', serif;
      font-style: italic;
      page-break-inside: avoid;
    }
    .katex-inline {
      font-style: normal;
      font-family: 'Times New Roman', serif;
    }

    /* ===== 分数栏 ===== */
    .score-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .score-table th,
    .score-table td {
      border: 1px solid var(--border-color);
      padding: 8px;
      text-align: center;
      width: 60px;
    }
    .score-table th {
      background: #f0f0f0;
      font-weight: normal;
    }

    /* ===== 考生信息栏 ===== */
    .student-info {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      margin-bottom: 20px;
      padding: 10px 0;
      border-bottom: 1px solid var(--border-color);
    }
    .student-info span {
      margin-right: 30px;
      white-space: nowrap;
    }
    .student-info .blank {
      min-width: 80px;
      border-bottom: 1px solid var(--border-color);
      display: inline-block;
    }

    /* ===== 注意事项 ===== */
    .notice {
      border: 1px solid var(--border-color);
      padding: 10px 12px;
      margin: 15px 0;
      font-size: var(--font-size-small);
      background: #f9f9f9;
      page-break-inside: avoid;
    }
    .notice-title {
      font-weight: bold;
      margin-bottom: 5px;
    }

    /* ===== 表格 ===== */
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 15px 0;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid var(--border-color);
      padding: 8px;
    }
    th {
      background: #f0f0f0;
      font-weight: normal;
    }

    /* ===== 分值标注 ===== */
    .score {
      font-size: var(--font-size-small);
      color: #666;
      margin-left: 8px;
    }

    /* ===== 计数器初始化 ===== */
    body {
      counter-reset: section question sub-question;
    }
  `,
};
