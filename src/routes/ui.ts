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
    .container { max-width: 1000px; margin: 0 auto; }
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
    label { display: block; font-size: 0.85rem; font-weight: 500; color: #555; margin-bottom: 6px; }
    input, select, textarea {
      width: 100%;
      padding: 10px 12px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 0.9rem;
      transition: border-color 0.2s;
    }
    input:focus, select:focus, textarea:focus { outline: none; border-color: #667eea; }
    textarea { font-family: 'SF Mono', Monaco, monospace; font-size: 0.85rem; line-height: 1.5; resize: vertical; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    .form-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    .form-row-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    .form-group { margin-bottom: 12px; }
    .checkbox-group { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
    .checkbox-group input[type="checkbox"] { width: auto; margin: 0; }
    .checkbox-group label { margin: 0; }
    .doc-item {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
      position: relative;
      border-left: 4px solid #667eea;
    }
    .doc-item.page-break-item { border-left-color: #ff6b6b; background: #fff5f5; }
    .doc-item .remove-btn {
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
    .doc-item .remove-btn:hover { opacity: 1; }
    .doc-item .type-badge {
      position: absolute;
      top: 12px;
      right: 50px;
      background: #667eea;
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.7rem;
      font-weight: 500;
    }
    .doc-item.page-break-item .type-badge { background: #ff6b6b; }
    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-primary { background: linear-gradient(135deg, #667eea, #764ba2); color: white; }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
    .btn-secondary { background: #f0f0f0; color: #333; }
    .btn-secondary:hover { background: #e0e0e0; }
    .btn-small { padding: 6px 12px; font-size: 0.8rem; }
    .btn-group { display: flex; gap: 12px; margin-top: 20px; flex-wrap: wrap; }
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
    .help-text { font-size: 0.75rem; color: #888; margin-top: 4px; }
    .section-header { font-size: 0.8rem; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin: 16px 0 8px; }
    footer { text-align: center; color: rgba(255,255,255,0.7); margin-top: 30px; font-size: 0.85rem; }
    footer a { color: white; }
    .divider { border-top: 1px solid #e0e0e0; margin: 20px 0; }
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
      <div class="card-title">Document Configuration</div>
      <div class="form-row">
        <div class="form-group">
          <label for="caption">Main Title (Caption)</label>
          <input type="text" id="caption" placeholder="Document main title">
        </div>
        <div class="form-group">
          <label for="subtitle">Subtitle</label>
          <input type="text" id="subtitle" placeholder="Optional subtitle">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="author">Author</label>
          <input type="text" id="author" placeholder="Author name">
        </div>
        <div class="form-group">
          <label for="date">Date</label>
          <input type="text" id="date" placeholder="YYYY-MM-DD (optional)">
        </div>
      </div>
      <div class="form-group">
        <label for="copyright">Copyright (Footer)</label>
        <input type="text" id="copyright" placeholder="© 2024 Company Name">
      </div>
    </div>

    <div class="card">
      <div class="card-title">
        Documents
        <span style="margin-left: auto; font-size: 0.8rem; font-weight: normal; color: #666;">
          Use headings (# ## ###) for structure. Use PAGE_BREAK button to force new pages.
        </span>
      </div>
      <div class="btn-group" style="margin-top: 0; margin-bottom: 16px;">
        <button class="btn btn-secondary btn-small" onclick="addDocument()">+ Add Content Block</button>
        <button class="btn btn-secondary btn-small" onclick="addPageBreak()">+ Add Page Break</button>
      </div>
      <div id="documents"></div>
    </div>

    <div class="card">
      <div class="card-title">Page Options</div>
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
      <div class="form-row-4">
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
    </div>

    <div class="card">
      <div class="card-title">Footer & Watermark</div>
      <div class="checkbox-group">
        <input type="checkbox" id="showPageNumber" checked>
        <label for="showPageNumber">Show page numbers</label>
      </div>
      <div class="form-group">
        <label for="pageNumberFormat">Page number format (supports {page}, {total})</label>
        <input type="text" id="pageNumberFormat" value="{page}" placeholder="{page} or Page {page} of {total}">
      </div>
      <div class="divider"></div>
      <div class="checkbox-group">
        <input type="checkbox" id="enableWatermark">
        <label for="enableWatermark">Enable watermark</label>
      </div>
      <div id="watermarkOptions" style="display: none;">
        <div class="form-row-3">
          <div class="form-group">
            <label for="watermarkText">Watermark Text</label>
            <input type="text" id="watermarkText" placeholder="CONFIDENTIAL">
          </div>
          <div class="form-group">
            <label for="watermarkColor">Color</label>
            <input type="text" id="watermarkColor" value="#999" placeholder="#999">
          </div>
          <div class="form-group">
            <label for="watermarkOpacity">Opacity (0-1)</label>
            <input type="number" id="watermarkOpacity" value="0.1" min="0" max="1" step="0.05">
          </div>
        </div>
        <div class="form-row-3">
          <div class="form-group">
            <label for="watermarkFontSize">Font Size</label>
            <input type="text" id="watermarkFontSize" value="48px" placeholder="48px">
          </div>
          <div class="form-group">
            <label for="watermarkAngle">Angle (degrees)</label>
            <input type="number" id="watermarkAngle" value="-30" placeholder="-30">
          </div>
          <div class="form-group">
            <label for="watermarkDensity">Density</label>
            <select id="watermarkDensity">
              <option value="sparse">Sparse</option>
              <option value="normal" selected>Normal</option>
              <option value="dense">Dense</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="btn-group">
        <button class="btn btn-primary" id="generateBtn" onclick="generatePDF()">Generate PDF</button>
        <button class="btn btn-secondary" onclick="loadSample()">Load Sample</button>
        <button class="btn btn-secondary" onclick="clearAll()">Clear All</button>
      </div>
      <div class="status" id="status"></div>
    </div>

    <footer>
      Powered by <a href="https://gotenberg.dev" target="_blank">Gotenberg</a> |
      <a href="/api/v1/pdf/health">API Health</a>
    </footer>
  </div>

  <script>
    let docCount = 0;

    function addDocument(content = '') {
      docCount++;
      const container = document.getElementById('documents');
      const div = document.createElement('div');
      div.className = 'doc-item';
      div.id = 'doc-' + docCount;
      div.innerHTML = '<button class="remove-btn" onclick="removeDocument(' + docCount + ')">×</button>' +
        '<span class="type-badge">Content</span>' +
        '<div class="form-group" style="margin-right: 50px;">' +
        '<label>Markdown Content</label>' +
        '<textarea class="doc-content" rows="6" placeholder="# Your markdown here...\\n\\nUse headings (# ## ###) for structure.\\nUse &lt;!-- PAGE_BREAK --&gt; to force a new page.">' + escapeHtml(content) + '</textarea></div>';
      container.appendChild(div);
    }

    function addPageBreak() {
      docCount++;
      const container = document.getElementById('documents');
      const div = document.createElement('div');
      div.className = 'doc-item page-break-item';
      div.id = 'doc-' + docCount;
      div.innerHTML = '<button class="remove-btn" onclick="removeDocument(' + docCount + ')">×</button>' +
        '<span class="type-badge">Page Break</span>' +
        '<div class="form-group" style="margin-right: 50px; padding: 8px 0; color: #666; font-style: italic;">&lt;!-- PAGE_BREAK --&gt;</div>';
      container.appendChild(div);
    }

    function removeDocument(id) {
      const doc = document.getElementById('doc-' + id);
      if (doc) {
        doc.remove();
      }
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    async function checkHealth() {
      const badge = document.getElementById('healthStatus');
      try {
        const res = await fetch('/api/v1/pdf/health');
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

      // Build documents array - simplified to string array
      const documents = [];
      document.querySelectorAll('.doc-item').forEach(item => {
        const isPageBreak = item.classList.contains('page-break-item');
        if (isPageBreak) {
          documents.push('<!-- PAGE_BREAK -->');
        } else {
          const content = item.querySelector('.doc-content')?.value.trim();
          if (content) {
            documents.push(content);
          }
        }
      });

      if (documents.length === 0) {
        showStatus('error', 'Please add at least one content block');
        return;
      }

      // Build config
      const config = {};
      const caption = document.getElementById('caption').value.trim();
      const subtitle = document.getElementById('subtitle').value.trim();
      const author = document.getElementById('author').value.trim();
      const date = document.getElementById('date').value.trim();
      const copyright = document.getElementById('copyright').value.trim();
      if (caption) config.caption = caption;
      if (subtitle) config.subtitle = subtitle;
      if (author) config.author = author;
      if (date) config.date = date;
      if (copyright) config.copyright = copyright;

      // Build options
      const options = {
        format: document.getElementById('format').value,
        margin: {
          top: document.getElementById('marginTop').value,
          bottom: document.getElementById('marginBottom').value,
          left: document.getElementById('marginLeft').value,
          right: document.getElementById('marginRight').value
        },
        showPageNumber: document.getElementById('showPageNumber').checked,
      };

      const pageNumberFormat = document.getElementById('pageNumberFormat').value.trim();
      if (pageNumberFormat) options.pageNumberFormat = pageNumberFormat;

      // Watermark
      if (document.getElementById('enableWatermark').checked) {
        const watermarkText = document.getElementById('watermarkText').value.trim();
        if (watermarkText) {
          options.watermark = {
            text: watermarkText,
            color: document.getElementById('watermarkColor').value || '#999',
            opacity: parseFloat(document.getElementById('watermarkOpacity').value) || 0.1,
            fontSize: document.getElementById('watermarkFontSize').value || '48px',
            angle: parseInt(document.getElementById('watermarkAngle').value) || -30,
            density: document.getElementById('watermarkDensity').value || 'normal'
          };
        }
      }

      const requestBody = {
        documents,
        config: Object.keys(config).length > 0 ? config : undefined,
        template: document.getElementById('template').value,
        options
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
      clearAll();
      // Add config
      document.getElementById('caption').value = 'My Document';
      document.getElementById('subtitle').value = 'A sample document';
      document.getElementById('author').value = 'John Doe';
      document.getElementById('date').value = new Date().toISOString().split('T')[0];
      document.getElementById('copyright').value = '© 2024 My Company';
      // Add documents
      addDocument('# Introduction\\n\\n## What is remote_docs?\\n\\nremote_docs is a **lightweight PDF generation service**.\\n\\n### Features\\n\\n- Multiple document merging\\n- Automatic page breaks\\n- LaTeX math support\\n- Multiple templates');
      addPageBreak();
      addDocument('# Math Formulas\\n\\nInline: $E = mc^2$\\n\\nBlock:\\n\\n$$\\\\int_0^1 x^2 \\\\, dx = \\\\frac{1}{3}$$');
    }

    function clearAll() {
      document.getElementById('documents').innerHTML = '';
      document.getElementById('caption').value = '';
      document.getElementById('subtitle').value = '';
      document.getElementById('author').value = '';
      document.getElementById('date').value = '';
      document.getElementById('copyright').value = '';
      document.getElementById('enableWatermark').checked = false;
      document.getElementById('watermarkOptions').style.display = 'none';
      docCount = 0;
    }

    // Watermark toggle
    document.getElementById('enableWatermark').addEventListener('change', function() {
      document.getElementById('watermarkOptions').style.display = this.checked ? 'block' : 'none';
    });

    // Initialize with one content section
    addDocument();
    checkHealth();
    setInterval(checkHealth, 30000);
  </script>
</body>
</html>`;

  return c.html(html);
}
