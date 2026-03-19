// src/templates/exam.ts
import type { PDFTemplate } from '../types';

export const examTemplate: PDFTemplate = {
  id: 'exam',
  name: '试卷模板',
  description: '教育试卷专用，含密封线、答题区',
  css: `
    @page {
      size: A4;
      margin: 15mm;
    }

    body {
      font-family: 'SimSun', 'STSong', 'Songti SC', 'Noto Serif SC', serif;
      font-size: 14px;
      line-height: 1.8;
      color: #000;
      max-width: 100%;
      padding: 0;
    }

    /* 试卷标题 */
    h1 {
      text-align: center;
      font-size: 22px;
      font-weight: bold;
      margin-bottom: 20px;
      border: none;
      padding: 0;
    }

    h2 {
      font-size: 16px;
      font-weight: bold;
      margin: 20px 0 10px;
      border: none;
      padding: 0;
    }

    h3 {
      font-size: 14px;
      font-weight: bold;
      margin: 15px 0 8px;
      border: none;
      padding: 0;
    }

    /* 段落 */
    p { margin: 10px 0; text-indent: 2em; }

    /* 题目不拆分 */
    .question, li {
      page-break-inside: avoid;
      margin-bottom: 15px;
    }

    /* 选择题选项横排 */
    ul.options {
      display: flex;
      flex-wrap: wrap;
      list-style: none;
      padding: 0;
      margin: 10px 0;
    }
    ul.options li {
      width: 45%;
      margin: 5px 2.5%;
      padding: 0;
      text-indent: 0;
    }

    /* 普通列表 */
    ul, ol {
      margin: 10px 0;
      padding-left: 2em;
    }
    li { text-indent: 0; }

    /* 答题区 */
    .answer-area {
      border: 1px solid #ccc;
      min-height: 100px;
      margin: 10px 0;
      padding: 10px;
      page-break-inside: avoid;
    }

    /* 填空题下划线 */
    .blank {
      display: inline-block;
      width: 80px;
      border-bottom: 1px solid #000;
      margin: 0 4px;
    }

    /* 数学公式 */
    .katex-block {
      text-align: center;
      margin: 15px 0;
      font-size: 1.1em;
      font-family: 'Times New Roman', serif;
      font-style: italic;
    }
    .katex-inline {
      font-style: normal;
      font-family: 'Times New Roman', serif;
    }

    /* 分数栏 */
    .score-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .score-table th,
    .score-table td {
      border: 1px solid #000;
      padding: 8px;
      text-align: center;
      width: 60px;
    }
    .score-table th {
      background: #f0f0f0;
      font-weight: normal;
    }

    /* 考生信息栏 */
    .student-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      padding: 10px 0;
      border-bottom: 1px solid #000;
    }
    .student-info span {
      margin-right: 30px;
    }
    .student-info .blank {
      width: 100px;
      border-bottom: 1px solid #000;
      display: inline-block;
    }

    /* 注意事项 */
    .notice {
      border: 1px solid #000;
      padding: 10px;
      margin: 15px 0;
      font-size: 12px;
      background: #f9f9f9;
    }
    .notice-title {
      font-weight: bold;
      margin-bottom: 5px;
    }

    /* 表格 */
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 15px 0;
    }
    th, td {
      border: 1px solid #000;
      padding: 8px;
    }
    th {
      background: #f0f0f0;
      font-weight: normal;
    }
  `,
};
