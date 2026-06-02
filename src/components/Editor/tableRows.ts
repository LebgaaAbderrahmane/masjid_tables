import type { DocumentType, CleaningRow, PrayerRow, PlanningMode } from '../../types';

const WEEKDAYS = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

export function renderTableRowsEditor(
  type: DocumentType,
  rows: (CleaningRow | PrayerRow)[],
  _onChange: () => void,
  planningMode?: PlanningMode
): string {
  let html = '';

  const isWeekly = planningMode === 'weekly';

  if (isWeekly) {
    html += '<div class="weekly-day-grid">';
    for (const day of WEEKDAYS) {
      const checked = (rows as Array<{ day: string }>).some(r => r.day === day);
      html += `
        <label class="weekly-day-checkbox ${checked ? 'checked' : ''}">
          <input type="checkbox" ${checked ? 'checked' : ''} onchange="window.app.toggleWeeklyDay('${day}')">
          ${day}
        </label>
      `;
    }
    html += '</div>';
  }

  html += rows.map((row, index) => {
    const controls = `
      <div class="row-controls">
        ${index > 0 ? `<button class="btn-icon" data-action="moveUp" data-index="${index}">↑</button>` : ''}
        ${index < rows.length - 1 ? `<button class="btn-icon" data-action="moveDown" data-index="${index}">↓</button>` : ''}
        <button class="btn-icon delete" data-index="${index}">×</button>
      </div>
    `;

    if (type === 'cleaning') {
      const cleaningRow = row as CleaningRow;
      return `
        <div class="table-row-editor">
          <div class="table-row-header">
            <strong>${isWeekly ? cleaningRow.day : `صف ${index + 1}`}</strong>
            ${controls}
          </div>
          ${isWeekly ? '' : `
          <div class="form-group">
            <label>اليوم</label>
            <input type="text" value="${escapeHtml(cleaningRow.day)}" oninput="window.app.updateTableRowField(${index}, 'day', this.value)">
          </div>
          <div class="form-group">
            <label>التاريخ</label>
            <input type="text" value="${escapeHtml(cleaningRow.date)}" oninput="window.app.updateTableRowField(${index}, 'date', this.value)">
          </div>
          `}
          <div class="form-group">
            <label>المكلفون (سطر لكل شخص)</label>
            <textarea oninput="window.app.updateTableRowArray(${index}, 'personnel', this.value)">${(cleaningRow.personnel || []).join('\n')}</textarea>
          </div>
          <div class="form-group">
            <label>المهام (سطر لكل مهمة)</label>
            <textarea oninput="window.app.updateTableRowArray(${index}, 'tasks', this.value)">${(cleaningRow.tasks || []).join('\n')}</textarea>
          </div>
        </div>
      `;
    } else {
      const prayerRow = row as PrayerRow;
      return `
        <div class="table-row-editor">
          <div class="table-row-header">
            <strong>${isWeekly ? prayerRow.day : `صف ${index + 1}`}</strong>
            ${controls}
          </div>
          ${isWeekly ? '' : `
          <div class="form-group">
            <label>اليوم</label>
            <input type="text" value="${escapeHtml(prayerRow.day)}" oninput="window.app.updateTableRowField(${index}, 'day', this.value)">
          </div>
          <div class="form-group">
            <label>التاريخ</label>
            <input type="text" value="${escapeHtml(prayerRow.date)}" oninput="window.app.updateTableRowField(${index}, 'date', this.value)">
          </div>
          `}
          <div class="form-group">
            <label>الفتح</label>
            <input type="text" value="${escapeHtml(prayerRow.opening)}" oninput="window.app.updateTableRowField(${index}, 'opening', this.value)">
          </div>
          <div class="form-group">
            <label>الظهر - الإمام</label>
            <input type="text" value="${escapeHtml(prayerRow.zuhr?.imam || '')}" oninput="window.app.updatePrayerSlot(${index}, 'zuhr', 'imam', this.value)">
          </div>
          <div class="form-group">
            <label>الظهر - المؤذن</label>
            <input type="text" value="${escapeHtml(prayerRow.zuhr?.muezzin || '')}" oninput="window.app.updatePrayerSlot(${index}, 'zuhr', 'muezzin', this.value)">
          </div>
          <div class="form-group">
            <label>العصر - الإمام</label>
            <input type="text" value="${escapeHtml(prayerRow.asr?.imam || '')}" oninput="window.app.updatePrayerSlot(${index}, 'asr', 'imam', this.value)">
          </div>
          <div class="form-group">
            <label>العصر - المؤذن</label>
            <input type="text" value="${escapeHtml(prayerRow.asr?.muezzin || '')}" oninput="window.app.updatePrayerSlot(${index}, 'asr', 'muezzin', this.value)">
          </div>
          <div class="form-group">
            <label>الغلق</label>
            <input type="text" value="${escapeHtml(prayerRow.closing)}" oninput="window.app.updateTableRowField(${index}, 'closing', this.value)">
          </div>
        </div>
      `;
    }
  }).join('');

  return html;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
