// src/routes/pdf.ts
import { Hono } from 'hono';
import { parseMarkdown } from '../services/markdown';
import { generatePDF } from '../services/gotenberg';
import { uploadPDF, updateExportStatus } from '../services/supabase';
import { getTemplate, getTemplateList } from '../templates';
import type { PDFExportRequest, User } from '../types';

export const pdfRouter = new Hono();

// POST /api/v1/pdf/export
pdfRouter.post('/export', async (c) => {
  const user = c.get('user') as User;
  let body: PDFExportRequest;

  try {
    body = await c.req.json();
  } catch {
    return c.json(
      {
        success: false,
        error: { code: 'INVALID_JSON', message: 'Invalid JSON body' },
      },
      400
    );
  }

  // 验证请求
  if (!body.markdown) {
    return c.json(
      {
        success: false,
        error: { code: 'INVALID_MARKDOWN', message: 'Markdown content is required' },
      },
      400
    );
  }

  if (!body.export_id) {
    return c.json(
      {
        success: false,
        error: { code: 'INVALID_EXPORT_ID', message: 'export_id is required' },
      },
      400
    );
  }

  try {
    // 1. 解析Markdown
    const contentHtml = parseMarkdown(body.markdown);

    // 2. 获取模板
    const template = getTemplate(body.template || 'base');

    // 3. 生成完整HTML
    const fullHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PDF Export</title>
  <style>${template.css}</style>
</head>
<body>
  ${contentHtml}
</body>
</html>`;

    // 4. 生成PDF
    const pdfBuffer = await generatePDF(fullHtml, body.options);

    // 5. 上传到Storage
    const storagePath = await uploadPDF(user.id, body.export_id, pdfBuffer);

    // 6. 更新数据库状态
    await updateExportStatus(body.export_id, 'completed', storagePath);

    // 7. 返回成功响应
    return c.json({
      success: true,
      data: {
        export_id: body.export_id,
        storage_path: storagePath,
        status: 'completed',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    // 尝试更新失败状态
    try {
      await updateExportStatus(body.export_id, 'failed', undefined, message);
    } catch {
      // 忽略数据库更新错误
    }

    return c.json(
      {
        success: false,
        error: { code: 'PDF_GENERATION_FAILED', message },
      },
      500
    );
  }
});

// GET /api/v1/pdf/templates
pdfRouter.get('/templates', (c) => {
  return c.json({
    templates: getTemplateList(),
  });
});
