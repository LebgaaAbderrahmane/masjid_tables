import type { DocumentType, CleaningInfoBox, PrayerInfoBox } from '../../types';

export function renderInfoBoxEditor(
  type: DocumentType,
  infoBox: CleaningInfoBox | PrayerInfoBox,
  _onChange: () => void
): string {
  if (type === 'cleaning') {
    const box = infoBox as CleaningInfoBox;
    return `
      <div class="form-group">
        <label>عنوان الصندوق</label>
        <input type="text" value="${escapeHtml(box.title)}" oninput="window.app.updateInfoBoxField('title', this.value)">
      </div>
      <div class="form-group">
        <label>الفترة</label>
        <input type="text" value="${escapeHtml(box.period)}" oninput="window.app.updateInfoBoxField('period', this.value)">
      </div>
      <div class="form-group">
        <label>المسؤول</label>
        <input type="text" value="${escapeHtml(box.responsible)}" oninput="window.app.updateInfoBoxField('responsible', this.value)">
      </div>
    `;
  } else {
    const box = infoBox as PrayerInfoBox;
    return `
      <div class="form-group">
        <label>عنوان الصندوق</label>
        <input type="text" value="${escapeHtml(box.title)}" oninput="window.app.updateInfoBoxField('title', this.value)">
      </div>
      <div class="form-group">
        <label>الظهر</label>
        <input type="text" value="${escapeHtml(box.zuhr)}" oninput="window.app.updateInfoBoxField('zuhr', this.value)">
      </div>
      <div class="form-group">
        <label>العصر</label>
        <input type="text" value="${escapeHtml(box.asr)}" oninput="window.app.updateInfoBoxField('asr', this.value)">
      </div>
      <div class="form-group">
        <label>المغرب</label>
        <input type="text" value="${escapeHtml(box.maghrib)}" oninput="window.app.updateInfoBoxField('maghrib', this.value)">
      </div>
    `;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}