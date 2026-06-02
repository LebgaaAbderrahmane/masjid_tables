import type { DocumentType, CleaningRow, PrayerRow, CleaningInfoBox, PrayerInfoBox, PlanningMode } from '../../types';

export function renderInfoBox(type: DocumentType, infoBox: CleaningInfoBox | PrayerInfoBox): string {
  if (type === 'cleaning') {
    const box = infoBox as CleaningInfoBox;
    return `
      <div class="info-box">
        <h2>${escapeHtml(box.title)}</h2>
        <div class="info-items">
          ${box.period ? `<div class="info-item"><span>الفترة:</span><span>${escapeHtml(box.period)}</span></div>` : ''}
          ${box.responsible ? `<div class="info-item"><span>المسؤول:</span><span>${escapeHtml(box.responsible)}</span></div>` : ''}
        </div>
      </div>
    `;
  } else {
    const box = infoBox as PrayerInfoBox;
    return `
      <div class="info-box">
        <h2>${escapeHtml(box.title)}</h2>
        <div class="info-items">
          ${box.zuhr ? `<div class="info-item"><span>الظهر:</span><span>${escapeHtml(box.zuhr)}</span></div>` : ''}
          ${box.asr ? `<div class="info-item"><span>العصر:</span><span>${escapeHtml(box.asr)}</span></div>` : ''}
          ${box.maghrib ? `<div class="info-item"><span>المغرب:</span><span>${escapeHtml(box.maghrib)}</span></div>` : ''}
        </div>
      </div>
    `;
  }
}

export function renderTable(type: DocumentType, rows: (CleaningRow | PrayerRow)[], planningMode?: PlanningMode): string {
  if (type === 'cleaning') {
    return renderCleaningTable(rows as CleaningRow[], planningMode);
  } else {
    return renderPrayerTable(rows as PrayerRow[], planningMode);
  }
}

function renderCleaningTable(rows: CleaningRow[], planningMode?: PlanningMode): string {
  const isWeekly = planningMode === 'weekly';
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
        ${rows.map(row => `
          <tr>
            <td class="date-cell">
              ${row.day ? `<div class="day">${escapeHtml(row.day)}</div>` : ''}
              ${row.date && !isWeekly ? `<div class="date">${escapeHtml(row.date)}</div>` : ''}
            </td>
            <td>
              ${row.personnel && row.personnel.length > 0 ? `
                <div class="personnel-list">
                  ${row.personnel.map(p => `<div class="personnel-item">${escapeHtml(p)}</div>`).join('')}
                </div>
              ` : ''}
            </td>
            <td>
              ${row.tasks && row.tasks.length > 0 ? `
                <div class="task-list">
                  ${row.tasks.map(t => `<div class="task-item">${escapeHtml(t)}</div>`).join('')}
                </div>
              ` : ''}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderPrayerTable(rows: PrayerRow[], planningMode?: PlanningMode): string {
  const isWeekly = planningMode === 'weekly';
  return `
    <table class="doc-table">
      <thead>
        <tr>
          <th style="width: 12%">${isWeekly ? 'اليوم' : 'التاريخ'}</th>
          <th style="width: 20%">الفتح</th>
          <th style="width: 22%">الظهر</th>
          <th style="width: 22%">العصر</th>
          <th style="width: 22%">الغلق</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(row => `
          <tr>
            <td class="date-cell">
              ${row.day ? `<div class="day">${escapeHtml(row.day)}</div>` : ''}
              ${row.date && !isWeekly ? `<div class="date">${escapeHtml(row.date)}</div>` : ''}
            </td>
            <td>${renderMultipleNames(row.opening)}</td>
            <td>
              ${row.zuhr && (row.zuhr.imam || row.zuhr.muezzin) ? `
                <div class="role-container">
                  ${row.zuhr.imam ? `<div class="role-row imam-row ${row.zuhr.imam === 'المتوفر' ? 'unavailable' : ''}"><span class="role-label">الإمام:</span> ${escapeHtml(row.zuhr.imam)}</div>` : ''}
                  ${row.zuhr.muezzin ? `<div class="role-row muezzin-row ${row.zuhr.muezzin === 'المتوفر' ? 'unavailable' : ''}"><span class="role-label">المؤذن:</span> ${escapeHtml(row.zuhr.muezzin)}</div>` : ''}
                </div>
              ` : ''}
            </td>
            <td>
              ${row.asr && (row.asr.imam || row.asr.muezzin) ? `
                <div class="role-container">
                  ${row.asr.imam ? `<div class="role-row imam-row ${row.asr.imam === 'المتوفر' ? 'unavailable' : ''}"><span class="role-label">الإمام:</span> ${escapeHtml(row.asr.imam)}</div>` : ''}
                  ${row.asr.muezzin ? `<div class="role-row muezzin-row ${row.asr.muezzin === 'المتوفر' ? 'unavailable' : ''}"><span class="role-label">المؤذن:</span> ${escapeHtml(row.asr.muezzin)}</div>` : ''}
                </div>
              ` : ''}
            </td>
            <td>${renderMultipleNames(row.closing)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderMultipleNames(names: string): string {
  if (!names) return '-';
  const nameList = names.split(/\s+/).filter(n => n.trim());
  return nameList.map(name => {
    const isUnavailable = name === 'المتوفر';
    return `<div class="${isUnavailable ? 'unavailable' : ''}">${escapeHtml(name)}</div>`;
  }).join('');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}