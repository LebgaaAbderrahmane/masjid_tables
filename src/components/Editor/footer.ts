import type { FooterNote } from '../../types';
import { noteTemplates } from '../../utils/templates';

export function renderFooterNotesEditor(notes: FooterNote[], _onChange: () => void): string {
  const templateOptions = Object.keys(noteTemplates)
    .map(key => `<option value="${key}">${noteTemplates[key].title}</option>`)
    .join('');

  return notes.map((note, index) => {
    const controls = `
      <div class="row-controls">
        ${index > 0 ? `<button class="btn-icon" data-action="moveUp" data-index="${index}" data-type="note">↑</button>` : ''}
        ${index < notes.length - 1 ? `<button class="btn-icon" data-action="moveDown" data-index="${index}" data-type="note">↓</button>` : ''}
        <button class="btn-icon delete" data-index="${index}" data-type="note">×</button>
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
  }).join('');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}