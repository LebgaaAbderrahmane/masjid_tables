import type {
  CircleColumn,
  CircleRow,
  CleaningRow,
  DocumentType,
  PlanningMode,
  PrayerRow,
  TableRow
} from '../../types';
import { getDocTypeConfig } from '../../docTypes/registry';
import { escapeHtml } from '../../utils/html';

interface DayDate {
  day: string;
  date: string;
}

export function renderTableRowsEditor(
  type: DocumentType,
  rows: TableRow[],
  _onChange: () => void,
  planningMode?: PlanningMode,
  columns: readonly CircleColumn[] = [],
  showMaghrib = false
): string {
  const config = getDocTypeConfig(type);
  const isWeekly = planningMode === 'weekly';

  let html = '';

  if (isWeekly) {
    html += '<div class="weekly-day-grid">';
    for (const day of config.weekdays) {
      const checked = rows.some(row => (row as DayDate).day === day);
      html += `
        <label class="weekly-day-checkbox ${checked ? 'checked' : ''}">
          <input type="checkbox" ${checked ? 'checked' : ''} onchange="window.app.toggleWeeklyDay('${day}')">
          ${day}
        </label>
      `;
    }
    html += '</div>';
  }

  return (
    html +
    rows
      .map((row, index) => {
        const controls = renderRowControls(index, rows.length);
        const rowTitle = isWeekly ? (row as DayDate).day : `صف ${index + 1}`;
        const dayDateFields = isWeekly ? '' : renderDayDateFields(row as DayDate, index);

        switch (type) {
          case 'cleaning':
            return renderCleaningRow(row as CleaningRow, index, rowTitle, controls, dayDateFields);
          case 'prayer':
            return renderPrayerRow(row as PrayerRow, index, rowTitle, controls, dayDateFields, showMaghrib);
          case 'circles':
            return renderCircleRow(row as CircleRow, index, columns, rowTitle, controls, dayDateFields);
          default:
            return '';
        }
      })
      .join('')
  );
}

function renderRowControls(index: number, total: number): string {
  return `
    <div class="row-controls">
      ${
        index > 0
          ? `<button class="btn-icon" data-action="moveUp" data-index="${index}" title="تحريك لأعلى" aria-label="تحريك الصف لأعلى">↑</button>`
          : ''
      }
      ${
        index < total - 1
          ? `<button class="btn-icon" data-action="moveDown" data-index="${index}" title="تحريك لأسفل" aria-label="تحريك الصف لأسفل">↓</button>`
          : ''
      }
      <button class="btn-icon delete" data-index="${index}" title="حذف الصف" aria-label="حذف الصف">×</button>
    </div>
  `;
}

function renderDayDateFields(row: DayDate, index: number): string {
  return `
    <div class="form-group">
      <label>اليوم</label>
      <input type="text" value="${escapeHtml(row.day ?? '')}" oninput="window.app.updateTableRowField(${index}, 'day', this.value)">
    </div>
    <div class="form-group">
      <label>التاريخ</label>
      <input type="text" value="${escapeHtml(row.date ?? '')}" oninput="window.app.updateTableRowField(${index}, 'date', this.value)">
    </div>
  `;
}

function renderCleaningRow(
  row: CleaningRow,
  index: number,
  rowTitle: string,
  controls: string,
  dayDateFields: string
): string {
  const personnel = Array.isArray(row.personnel) ? row.personnel : [];
  const tasks = Array.isArray(row.tasks) ? row.tasks : [];

  return `
    <div class="table-row-editor">
      <div class="table-row-header">
        <strong>${escapeHtml(rowTitle)}</strong>
        ${controls}
      </div>
      ${dayDateFields}
      <div class="form-group">
        <label>المكلفون (سطر لكل شخص)</label>
        <textarea oninput="window.app.updateTableRowArray(${index}, 'personnel', this.value)">${escapeHtml(personnel.join('\n'))}</textarea>
      </div>
      <div class="form-group">
        <label>المهام (سطر لكل مهمة)</label>
        <textarea oninput="window.app.updateTableRowArray(${index}, 'tasks', this.value)">${escapeHtml(tasks.join('\n'))}</textarea>
      </div>
    </div>
  `;
}

/** Legacy rows may carry a slot object missing one of its two names. */
function normaliseSlot(slot: PrayerRow['zuhr'] | undefined): { imam: string; muezzin: string } {
  return { imam: slot?.imam ?? '', muezzin: slot?.muezzin ?? '' };
}

function renderPrayerRow(
  row: PrayerRow,
  index: number,
  rowTitle: string,
  controls: string,
  dayDateFields: string,
  showMaghrib: boolean
): string {
  const zuhr = normaliseSlot(row.zuhr);
  const asr = normaliseSlot(row.asr);
  const maghrib = normaliseSlot(row.maghrib);

  return `
    <div class="table-row-editor">
      <div class="table-row-header">
        <strong>${escapeHtml(rowTitle)}</strong>
        ${controls}
      </div>
      ${dayDateFields}
      <div class="form-group">
        <label>الفتح</label>
        <input type="text" value="${escapeHtml(row.opening ?? '')}" oninput="window.app.updateTableRowField(${index}, 'opening', this.value)">
      </div>
      <div class="form-group">
        <label>الظهر - الإمام</label>
        <input type="text" value="${escapeHtml(zuhr.imam)}" oninput="window.app.updatePrayerSlot(${index}, 'zuhr', 'imam', this.value)">
      </div>
      <div class="form-group">
        <label>الظهر - المؤذن</label>
        <input type="text" value="${escapeHtml(zuhr.muezzin)}" oninput="window.app.updatePrayerSlot(${index}, 'zuhr', 'muezzin', this.value)">
      </div>
      <div class="form-group">
        <label>العصر - الإمام</label>
        <input type="text" value="${escapeHtml(asr.imam)}" oninput="window.app.updatePrayerSlot(${index}, 'asr', 'imam', this.value)">
      </div>
      <div class="form-group">
        <label>العصر - المؤذن</label>
        <input type="text" value="${escapeHtml(asr.muezzin)}" oninput="window.app.updatePrayerSlot(${index}, 'asr', 'muezzin', this.value)">
      </div>
      ${
        showMaghrib
          ? `
      <div class="form-group maghrib-field">
        <label>المغرب - الإمام</label>
        <input type="text" value="${escapeHtml(maghrib.imam)}" oninput="window.app.updatePrayerSlot(${index}, 'maghrib', 'imam', this.value)">
      </div>
      <div class="form-group maghrib-field">
        <label>المغرب - المؤذن</label>
        <input type="text" value="${escapeHtml(maghrib.muezzin)}" oninput="window.app.updatePrayerSlot(${index}, 'maghrib', 'muezzin', this.value)">
      </div>
      `
          : ''
      }
      <div class="form-group">
        <label>الغلق</label>
        <input type="text" value="${escapeHtml(row.closing ?? '')}" oninput="window.app.updateTableRowField(${index}, 'closing', this.value)">
      </div>
    </div>
  `;
}

function renderCircleRow(
  row: CircleRow,
  index: number,
  columns: readonly CircleColumn[],
  rowTitle: string,
  controls: string,
  dayDateFields: string
): string {
  const cells = row.cells ?? {};

  const cellEditors = columns
    .map(column => {
      const cell = cells[column.id] ?? { lesson: '', person: '' };
      return `
        <div class="circle-cell-editor">
          <span class="cell-editor-label" title="${escapeHtml(column.title)}">${escapeHtml(column.title)}</span>
          <textarea
            rows="2"
            class="cell-input"
            placeholder="عنوان الدرس (سطر لكل درس)"
            oninput="window.app.updateCircleCell(${index}, '${column.id}', 'lesson', this.value)">${escapeHtml(cell.lesson ?? '')}</textarea>
          <textarea
            rows="2"
            class="cell-input"
            placeholder="اسم المحاضر (سطر لكل اسم)"
            oninput="window.app.updateCircleCell(${index}, '${column.id}', 'person', this.value)">${escapeHtml(cell.person ?? '')}</textarea>
        </div>
      `;
    })
    .join('');

  return `
    <div class="table-row-editor">
      <div class="table-row-header">
        <strong>${escapeHtml(rowTitle)}</strong>
        ${controls}
      </div>
      ${dayDateFields}
      <div class="circle-cells-editor">
        ${cellEditors || '<p class="hint-text">أضف عموداً من قسم الأعمدة أعلاه.</p>'}
      </div>
    </div>
  `;
}
