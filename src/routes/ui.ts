// src/routes/ui.ts
import { Context } from 'hono';
import { getTemplateList } from '../templates';

// Serve the management UI
export function serveUI(c: Context) {
  const templates = getTemplateList();

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>remote_docs - PDF Generator</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container { max-width: 900px; margin: 0 auto; }
    header { text-align: center; color: white; margin-bottom: 30px; }
    header h1 { font-size: 2rem; margin-bottom: 8px; }
    header p { opacity: 0.9; }
    .card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      padding: 24px;
      margin-bottom: 20px;
    }
    .card-title {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 16px;
      color: #333;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .card-title::before {
      content: '';
      width: 4px;
      height: 20px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-radius: 2px;
    }
    label { display: block; font-size: 0.9rem; font-weight: 500; color: #555; margin-bottom: 6px; }
    input, select, textarea {
      width: 100%;
      padding: 12px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 0.95rem;
      transition: border-color 0.2s;
    }
    input:focus, select:focus, textarea:focus { outline: none; border-color: #667eea; }
    textarea { font-family: 'SF Mono', Monaco, monospace; font-size: 0.85rem; line-height: 1.5; resize: vertical; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .form-group { margin-bottom: 16px; }
    .document-item {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
      position: relative;
    }
    .document-item .remove-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      background: #ff4757;
      color: white;
      border: none;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 1.2rem;
      line-height: 1;
      opacity: 0.8;
      transition: opacity 0.2s;
    }
    .document-item .remove-btn:hover { opacity: 1; }
    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-primary { background: linear-gradient(135deg, #667eea, #764ba2); color: white; }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
    .btn-secondary { background: #f0f0f0; color: #333; }
    .btn-secondary:hover { background: #e0e0e0; }
    .btn-group { display: flex; gap: 12px; margin-top: 20px; }
    .status { padding: 12px 16px; border-radius: 8px; margin-top: 16px; display: none; }
    .status.show { display: block; }
    .status.loading { background: #e3f2fd; color: #1565c0; }
    .status.success { background: #e8f5e9; color: #2e7d32; }
    .status.error { background: #ffebee; color: #c62828; }
    .health-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      background: #e8f5e9;
      color: #2e7d32;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 500;
    }
    .health-badge::before {
      content: '';
      width: 8px;
      height: 8px;
      background: #4caf50;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .help-text { font-size: 0.8rem; color: #888; margin-top: 4px; }
    footer { text-align: center; color: rgba(255,255,255,0.7); margin-top: 30px; font-size: 0.85rem; }
    footer a { color: white; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>remote_docs</h1>
      <p>Markdown to PDF Generator</p>
    </header>

    <div class="card">
      <div class="card-title">Authentication</div>
      <div class="form-group">
        <label for="token">Supabase JWT Token</label>
        <input type="password" id="token" placeholder="Bearer token for authentication">
        <p class="help-text">Get your token from Supabase Auth session</p>
      </div>
      <div class="health-badge" id="healthStatus">Checking...</div>
    </div>

    <div class="card">
      <div class="card-title">Documents</div>
      <div id="documents"></div>
      <button class="btn btn-secondary" onclick="addDocument()">+ Add Document</button>
    </div>

    <div class="card">
      <div class="card-title">Options</div>
      <div class="form-row">
        <div class="form-group">
          <label for="template">Template</label>
          <select id="template">
            ${templates.map(t => `<option value="${t.id}">${t.name} - ${t.description}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label for="format">Paper Size</label>
          <select id="format">
            <option value="A4">A4</option>
            <option value="Letter">Letter</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="marginTop">Top Margin</label>
          <input type="text" id="marginTop" value="20mm" placeholder="20mm">
        </div>
        <div class="form-group">
          <label for="marginBottom">Bottom Margin</label>
          <input type="text" id="marginBottom" value="20mm" placeholder="20mm">
        </div>
        <div class="form-group">
          <label for="marginLeft">Left Margin</label>
          <input type="text" id="marginLeft" value="15mm" placeholder="15mm">
        </div>
        <div class="form-group">
          <label for="marginRight">Right Margin</label>
          <input type="text" id="marginRight" value="15mm" placeholder="15mm">
        </div>
      </div>

      <div class="btn-group">
        <button class="btn btn-primary" id="generateBtn" onclick="generatePDF()">Generate PDF</button>
        <button class="btn btn-secondary" onclick="loadSample()">Load Sample</button>
      </div>

      <div class="status" id="status"></div>
    </div>

    <footer>
      Powered by <a href="https://gotenberg.dev" target="_blank">Gotenberg</a> |
      <a href="/api/v1/health">API Health</a>
    </footer>
  </div>

  <script>
    let docCount = 0;

    function addDocument(title = '', markdown = '') {
      docCount++;
      const container = document.getElementById('documents');
      const div = document.createElement('div');
      div.className = 'document-item';
      div.id = 'doc-' + docCount;
      div.innerHTML = '<button class="remove-btn" onclick="removeDocument(' + docCount + ')">×</button>' +
        '<div class="form-group"><label>Title (optional)</label>' +
        '<input type="text" class="doc-title" placeholder="Document title"></div>' +
        '<div class="form-group"><label>Markdown Content</label>' +
        '<textarea class="doc-markdown" rows="8" placeholder="# Your markdown here..."></textarea></div>';
      container.appendChild(div);
      div.querySelector('.doc-title').value = title;
      div.querySelector('.doc-markdown').value = markdown;
    }

    function removeDocument(id) {
      const doc = document.getElementById('doc-' + id);
      if (doc && document.querySelectorAll('.document-item').length > 1) {
        doc.remove();
      }
    }

    async function checkHealth() {
      const badge = document.getElementById('healthStatus');
      try {
        const res = await fetch('/api/v1/health');
        const data = await res.json();
        badge.textContent = data.status === 'healthy' ? 'Service: Healthy' : 'Service: ' + data.status;
      } catch (e) {
        badge.textContent = 'Service: Error';
        badge.style.background = '#ffebee';
        badge.style.color = '#c62828';
      }
    }

    async function generatePDF() {
      const token = document.getElementById('token').value.trim();
      const statusEl = document.getElementById('status');
      const btn = document.getElementById('generateBtn');

      if (!token) {
        showStatus('error', 'Please enter your JWT token');
        return;
      }

      const documents = [];
      document.querySelectorAll('.document-item').forEach(item => {
        const title = item.querySelector('.doc-title').value.trim();
        const markdown = item.querySelector('.doc-markdown').value.trim();
        if (markdown) documents.push({ title, markdown });
      });

      if (documents.length === 0) {
        showStatus('error', 'Please add at least one document with content');
        return;
      }

      const requestBody = {
        documents,
        template: document.getElementById('template').value,
        options: {
          format: document.getElementById('format').value,
          margin: {
            top: document.getElementById('marginTop').value,
            bottom: document.getElementById('marginBottom').value,
            left: document.getElementById('marginLeft').value,
            right: document.getElementById('marginRight').value
          }
        }
      };

      btn.disabled = true;
      btn.textContent = 'Generating...';
      showStatus('loading', 'Generating PDF...');

      try {
        const res = await fetch('/api/v1/pdf/export', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error?.message || 'Request failed');
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'export.pdf';
        a.click();
        URL.revokeObjectURL(url);

        showStatus('success', 'PDF generated successfully! (' + (blob.size / 1024).toFixed(1) + ' KB)');
      } catch (e) {
        showStatus('error', 'Error: ' + e.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Generate PDF';
      }
    }

    function showStatus(type, message) {
      const statusEl = document.getElementById('status');
      statusEl.className = 'status show ' + type;
      statusEl.textContent = message;
    }

    function loadSample() {
      document.getElementById('documents').innerHTML = '';
      docCount = 0;
      addDocument('Chapter 1: Introduction', '# Introduction\\n\\n## What is remote_docs?\\n\\nremote_docs is a **lightweight PDF generation service**.\\n\\n### Features\\n\\n- Multiple document merging\\n- Automatic page breaks\\n- LaTeX math support\\n- Multiple templates');
      addDocument('Chapter 2: Math', '# Math Formulas\\n\\nInline: $E = mc^2$\\n\\nBlock:\\n\\n$$\\\\int_0^1 x^2 \\\\, dx = \\\\frac{1}{3}$$');
    }

    addDocument();
    checkHealth();
    setInterval(checkHealth, 30000);
  </script>
</body>
</html>`;

  return c.html(html);
}
