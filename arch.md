🏆 最优解（综合评分最高）

👉 Gotenberg + 自建 Doc Service（Node）+ Markdown → HTML（markdown-it + KaTeX）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 适用场景
- 教育试卷导出（选择题 / 填空题 / 解答题）
- Markdown 内容转 PDF（含 LaTeX 数学公式）
- Supabase Edge Functions 集成
- 可 Docker 化部署的自建文档服务

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧱 架构设计

[ Supabase Edge Function ]
            ↓ (HTTP)
[ Doc Service（Node） ]
  - Markdown 解析（markdown-it）
  - 数学公式渲染（KaTeX）
  - 套用试卷 HTML 模板
            ↓ (HTTP)
[ Gotenberg ]
            ↓
          PDF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚙️ 核心技术栈

- Markdown 解析：markdown-it
- 数学公式：KaTeX（无需转图片）
- PDF 渲染：Gotenberg（基于 Chromium）
- 服务层：Node.js（Express / Hono）
- 部署：Docker

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ 核心优势

✔ 完全兼容 Edge Functions（HTTP 调用，无需本地 Chromium）
✔ HTML + CSS 强排版能力（远强于 Pandoc / PDF库）
✔ 支持复杂试卷结构（分页 / 题号 / 页眉页脚 / 答题区）
✔ 数学公式高质量渲染（矢量，无失真）
✔ 易扩展（图片 / 表格 / 富文本 / 多模板）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧾 渲染流程

Markdown
  ↓
markdown-it + KaTeX
  ↓
HTML（试卷模板 + CSS）
  ↓
Gotenberg
  ↓
PDF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎨 排版能力（关键）

通过 CSS 可实现：

- 自动分页（@page）
- 题目不拆分（page-break-inside: avoid）
- 页眉页脚（考试信息 / 页码）
- 题号 & 选项布局（A/B/C/D 横排）
- 答题留白区域
- 密封线（考试场景）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🐳 Docker 部署（示例）

Gotenberg：
docker run -p 3000:3000 gotenberg/gotenberg:8

Doc Service：
- Node 服务容器化
- 与 Gotenberg 同网络

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 接口调用示例

Edge Function → Doc Service：

POST /render-pdf
{
  "markdown": "...试卷内容..."
}

Doc Service → Gotenberg：
- 发送 HTML 文件
- 返回 PDF 二进制流

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ 注意事项

- Gotenberg 单实例并发约 5~10，建议多实例扩展
- 建议引入任务队列（如 BullMQ）
- Markdown 建议结构化（便于题库扩展）
- 模板与内容分离（方便多试卷类型）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧠 一句话总结

👉 用 HTML/CSS 做排版，用 Gotenberg 做渲染，用 Node 做中间层，
是当前“试卷生成系统”最稳、最灵活、最可扩展的方案。
