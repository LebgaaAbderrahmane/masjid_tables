import type { FooterNote } from '../../types';
import { noteTemplates } from '../../utils/templates';
import { escapeHtml } from '../../utils/html';

export function renderFooterNotesEditor(notes: FooterNote[], _onChange: () => void): string {
  const templateOptions = Object.keys(noteTemplates)
    .map(key => `<option value="${escapeHtml(key)}">${escapeHtml(noteTemplates[key].title)}</option>`)
    .join('');

  return notes
    .map((note, index) => {
      const controls = `
        <div class="row-controls">
          ${
            index > 0
              ? `<button class="btn-icon" data-action="moveUp" data-index="${index}" title="تحريك لأعلى" aria-label="تحريك الملاحظة لأعلى">↑</button>`
              : ''
          }
          ${
            index < notes.length - 1
              ? `<button class="btn-icon" data-action="moveDown" data-index="${index}" title="تحريك لأسفل" aria-label="تحريك الملاحظة لأسفل">↓</button>`
              : ''
          }
          <button class="btn-icon delete" data-index="${index}" title="حذف الملاحظة" aria-label="حذف الملاحظة">×</button>
        </div>
      `;

      return `
        <div class="note-editor">
          <div class="table-row-header">
            <strong>ملاحظة ${index + 1}</strong>
            ${controls}
          </div>
          <select class="template-select" onchange="window.app.applyTemplate(${index}, this.value)">
            <option value="">-- اختر قالباً --</option>
            ${templateOptions}
          </select>
          <div class="form-group">
            <label>العنوان</label>
            <input type="text" value="${escapeHtml(note.title)}" oninput="window.app.updateNoteField(${index}, 'title', this.value)">
          </div>
          <div class="form-group">
            <label>المحتوى</label>
            <textarea oninput="window.app.updateNoteField(${index}, 'content', this.value)">${escapeHtml(note.content)}</textarea>
          </div>
          <div class="verse-toggle">
            <input type="checkbox" id="verse${index}" ${note.isVerse ? 'checked' : ''} onchange="window.app.updateNoteField(${index}, 'isVerse', this.checked)">
            <label for="verse${index}">نص آية أو حديث (تنسيق خاص)</label>
          </div>
        </div>
      `;
    })
    .join('');
}
