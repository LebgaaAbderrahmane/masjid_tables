import type { FooterNote } from '../../types';
import { escapeHtml } from '../../utils/html';

export function renderFooter(notes: FooterNote[]): string {
  if (notes.length === 0) return '';

  return `
    <div class="doc-footer">
      ${notes
        .map(
          note => `
        <div class="footer-note">
          <h3>${escapeHtml(note.title)}</h3>
          ${note.isVerse ? `<div class="verse">${escapeHtml(note.content)}</div>` : `<p>${escapeHtml(note.content)}</p>`}
        </div>
      `
        )
        .join('')}
    </div>
  `;
}
