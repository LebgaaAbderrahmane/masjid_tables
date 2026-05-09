import type { HeaderData } from '../../types';

export function renderHeaderEditor(data: HeaderData, _onChange: () => void): string {
  return `
    <div class="form-group">
      <label>عنوان البرنامج</label>
      <input type="text" id="headerTitle" value="${escapeHtml(data.title)}" oninput="window.app.updateHeaderTitle(this.value)">
    </div>
    <div class="form-group">
      <label>العنوان الفرعي</label>
      <input type="text" id="headerSubtitle" value="${escapeHtml(data.subtitle)}" oninput="window.app.updateHeaderSubtitle(this.value)">
    </div>
    <div class="form-group">
      <label>رقم الإصدار</label>
      <input type="text" id="headerVersion" value="${escapeHtml(data.version)}" oninput="window.app.updateHeaderVersion(this.value)">
    </div>
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}