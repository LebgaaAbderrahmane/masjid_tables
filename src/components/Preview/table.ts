import type {
  CircleCell,
  CircleColumn,
  CircleRow,
  CirclesInfoBox,
  CleaningInfoBox,
  CleaningRow,
  DocumentType,
  InfoBoxData,
  PlanningMode,
  PrayerInfoBox,
  PrayerRow,
  TableRow
} from '../../types';
import { escapeHtml } from '../../utils/html';

export function renderInfoBox(type: DocumentType, infoBox: InfoBoxData): string {
  const items = renderInfoItems(type, infoBox);

  return `
    <div class="info-box">
      <h2>${escapeHtml(infoBox.title ?? '')}</h2>
      ${items ? `<div class="info-items">${items}</div>` : ''}
    </div>
  `;
}

function renderInfoItems(type: DocumentType, infoBox: InfoBoxData): string {
  switch (type) {
    case 'cleaning': {
      const box = infoBox as CleaningInfoBox;
      return [
        box.period ? item('الفترة', box.period) : '',
        box.responsible ? item('المسؤول', box.responsible) : ''
      ].join('');
    }
    case 'prayer': {
      const box = infoBox as PrayerInfoBox;
      return [
        box.zuhr ? item('الظهر', box.zuhr) : '',
        box.asr ? item('العصر', box.asr) : '',
        box.maghrib ? item('المغرب', box.maghrib) : ''
      ].join('');
    }
    case 'circles': {
      const box = infoBox as CirclesInfoBox;
      return [
        box.supervisor ? item('المشرف', box.supervisor) : '',
        box.location ? item('المكان', box.location) : ''
      ].join('');
    }
    default:
      return '';
  }
}

function item(label: string, value: string): string {
  return `<div class="info-item"><span>${escapeHtml(label)}:</span><span>${escapeHtml(value)}</span></div>`;
}

export function renderTable(
  type: DocumentType,
  rows: TableRow[],
  planningMode?: PlanningMode,
  columns: readonly CircleColumn[] = [],
  showMaghrib = false
): string {
  const isWeekly = planningMode === 'weekly';

  switch (type) {
    case 'cleaning':
      return renderCleaningTable(rows, isWeekly);
    case 'prayer':
      return renderPrayerTable(rows, isWeekly, showMaghrib);
    case 'circles':
      return renderCirclesTable(rows, columns, isWeekly);
    default:
      return '';
  }
}

function renderCirclesTable(
  rows: TableRow[],
  columns: readonly CircleColumn[],
  isWeekly: boolean
): string {
  const circleRows = rows as CircleRow[];

  if (columns.length === 0) {
    return '<p class="hint-text">لم تُضَف أي أعمدة بعد.</p>';
  }

  const dayWidth = 12;
  const columnWidth = Math.floor((100 - dayWidth) / columns.length);

  return `
    <table class="doc-table circles-table">
      <thead>
        <tr>
          <th style="width: ${dayWidth}%">${isWeekly ? 'اليوم' : 'التاريخ'}</th>
          ${columns
            .map(
              column =>
                `<th class="circle-col-head" style="width: ${columnWidth}%">${escapeHtml(column.title)}</th>`
            )
            .join('')}
        </tr>
      </thead>
      <tbody>
        ${circleRows
          .map(
            row => `
          <tr>
            <td class="date-cell">
              ${row.day ? `<div class="day">${escapeHtml(row.day)}</div>` : ''}
              ${row.date && !isWeekly ? `<div class="date">${escapeHtml(row.date)}</div>` : ''}
            </td>
            ${columns.map(column => renderCircleCell(row.cells?.[column.id])).join('')}
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

/** Two-tier cell: what is taught on top, who teaches it underneath. */
function renderCircleCell(cell: CircleCell | undefined): string {
  const lesson = cell?.lesson?.trim() ?? '';
  const person = cell?.person?.trim() ?? '';

  if (!lesson && !person) {
    return '<td class="circle-cell is-empty"><span aria-hidden="true">–</span></td>';
  }

  // The lesson is kept verbatim: a single pre-wrap block reproduces the
  // editor's spacing exactly (multiple spaces, newlines, blank lines).
  // Presenters are split one-per-line so each gets its own chip.
  const presenters = person
    .split('\n')
    .map(name => name.trim())
    .filter(Boolean);

  return `
    <td class="circle-cell">
      ${lesson ? `<div class="cell-lesson">${escapeHtml(lesson)}</div>` : ''}
      ${
        presenters.length > 0
          ? `<div class="cell-person">${presenters.map(name => `<span class="cell-chip">${escapeHtml(name)}</span>`).join('')}</div>`
          : ''
      }
    </td>
  `;
}

function renderCleaningTable(rows: TableRow[], isWeekly: boolean): string {
  const cleaningRows = rows as CleaningRow[];

  return `
    <table class="doc-table">
      <thead>
        <tr>
          ${isWeekly ? '<th style="width: 12%">اليوم</th>' : '<th style="width: 12%">التاريخ</th>'}
          <th style="width: 30%">المكلفون</th>
          <th style="width: 58%">المهام</th>
        </tr>
      </thead>
      <tbody>
        ${cleaningRows
          .map(
            row => `
          <tr>
            <td class="date-cell">
              ${row.day ? `<div class="day">${escapeHtml(row.day)}</div>` : ''}
              ${row.date && !isWeekly ? `<div class="date">${escapeHtml(row.date)}</div>` : ''}
            </td>
            <td>
              ${
                row.personnel && row.personnel.length > 0
                  ? `
                <div class="personnel-list">
                  ${row.personnel.map(p => `<div class="personnel-item">${escapeHtml(p)}</div>`).join('')}
                </div>
              `
                  : ''
              }
            </td>
            <td>
              ${
                row.tasks && row.tasks.length > 0
                  ? `
                <div class="task-list">
                  ${row.tasks.map(t => `<div class="task-item">${escapeHtml(t)}</div>`).join('')}
                </div>
              `
                  : ''
              }
            </td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function renderPrayerTable(rows: TableRow[], isWeekly: boolean, showMaghrib: boolean): string {
  const prayerRows = rows as PrayerRow[];

  // Widths are spread across whatever columns are actually shown, so the
  // table still fills the page whether or not المغرب is included. The
  // remainder is handed to the last column so the total lands exactly on 100.
  const fixedWidth = 12;
  // الفتح + الظهر + العصر (+ المغرب) + الغلق
  const sideCols = showMaghrib ? 5 : 4;
  const sideWidth = Math.floor((100 - fixedWidth) / sideCols);
  const closingWidth = 100 - fixedWidth - sideWidth * (sideCols - 1);

  return `
    <table class="doc-table">
      <thead>
        <tr>
          <th style="width: ${fixedWidth}%">${isWeekly ? 'اليوم' : 'التاريخ'}</th>
          <th style="width: ${sideWidth}%">الفتح</th>
          <th style="width: ${sideWidth}%">الظهر</th>
          <th style="width: ${sideWidth}%">العصر</th>
          ${showMaghrib ? `<th style="width: ${sideWidth}%">المغرب</th>` : ''}
          <th style="width: ${closingWidth}%">الغلق</th>
        </tr>
      </thead>
      <tbody>
        ${prayerRows
          .map(
            row => `
          <tr>
            <td class="date-cell">
              ${row.day ? `<div class="day">${escapeHtml(row.day)}</div>` : ''}
              ${row.date && !isWeekly ? `<div class="date">${escapeHtml(row.date)}</div>` : ''}
            </td>
            <td>${renderMultipleNames(row.opening)}</td>
            <td>${renderSlot(row.zuhr)}</td>
            <td>${renderSlot(row.asr)}</td>
            ${showMaghrib ? `<td>${renderSlot(row.maghrib)}</td>` : ''}
            <td>${renderMultipleNames(row.closing)}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function renderSlot(slot: { imam: string; muezzin: string } | undefined): string {
  if (!slot || !(slot.imam || slot.muezzin)) return '';

  return `
    <div class="role-container">
      ${slot.imam ? roleRow('imam-row', 'الإمام', slot.imam) : ''}
      ${slot.muezzin ? roleRow('muezzin-row', 'المؤذن', slot.muezzin) : ''}
    </div>
  `;
}

function roleRow(modifier: string, label: string, name: string): string {
  const unavailable = name === 'المتوفر' ? ' unavailable' : '';
  return `
    <div class="role-row ${modifier}${unavailable}">
      <span class="role-label">${escapeHtml(label)}:</span> ${escapeHtml(name)}
    </div>
  `;
}

function renderMultipleNames(names: string | undefined): string {
  if (!names) return '-';
  return names
    .split(/\s+/)
    .filter(name => name.trim())
    .map(name => `<div class="${name === 'المتوفر' ? 'unavailable' : ''}">${escapeHtml(name)}</div>`)
    .join('');
}
