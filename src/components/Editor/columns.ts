import type { CircleColumn } from '../../types';
import { escapeHtml } from '../../utils/html';

/**
 * Column manager for the circles program. Only rendered for the circles type;
 * every other program type has a fixed column set.
 */
export function renderColumnsEditor(columns: readonly CircleColumn[]): string {
  if (columns.length === 0) return '';

  const list = columns
    .map((column, index) => {
      const controls = `
        <div class="row-controls">
          ${
            index > 0
              ? `<button class="btn-icon" data-action="colUp" data-index="${index}" title="تحريك لأعلى" aria-label="تحريك العمود لأعلى">↑</button>`
              : ''
          }
          ${
            index < columns.length - 1
              ? `<button class="btn-icon" data-action="colDown" data-index="${index}" title="تحريك لأسفل" aria-label="تحريك العمود لأسفل">↓</button>`
              : ''
          }
          <button class="btn-icon delete" data-action="colDelete" data-index="${index}" title="حذف العمود" aria-label="حذف العمود">×</button>
        </div>
      `;

      return `
        <div class="column-editor">
          <div class="column-editor-header">
            <strong>عمود ${index + 1}</strong>
            ${controls}
          </div>
          <div class="form-group">
            <label>عنوان العمود</label>
            <input
              type="text"
              value="${escapeHtml(column.title)}"
              placeholder="مثال: درس قبل الظهر"
              oninput="window.app.updateColumnTitle(${index}, this.value)">
          </div>
        </div>
      `;
    })
    .join('');

  return `
    <div class="column-list">${list}</div>
    <button class="btn-add" onclick="window.app.addColumn()">+ إضافة عمود جديد</button>
  `;
}
