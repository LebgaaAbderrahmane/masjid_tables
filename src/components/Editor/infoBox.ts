import type { CirclesInfoBox, CleaningInfoBox, DocumentType, InfoBoxData, PrayerInfoBox } from '../../types';
import { escapeHtml } from '../../utils/html';

export function renderInfoBoxEditor(
  type: DocumentType,
  infoBox: InfoBoxData,
  _onChange: () => void
): string {
  switch (type) {
    case 'cleaning': {
      const box = infoBox as CleaningInfoBox;
      return `
        ${field('عنوان الصندوق', box.title, 'title')}
        ${field('الفترة', box.period, 'period')}
        ${field('المسؤول', box.responsible, 'responsible')}
      `;
    }
    case 'prayer': {
      const box = infoBox as PrayerInfoBox;
      return `
        ${field('عنوان الصندوق', box.title, 'title')}
        ${field('الظهر', box.zuhr, 'zuhr')}
        ${field('العصر', box.asr, 'asr')}
        ${field('المغرب', box.maghrib, 'maghrib')}
      `;
    }
    case 'circles': {
      const box = infoBox as CirclesInfoBox;
      return `
        ${field('عنوان الصندوق', box.title, 'title')}
        ${field('المشرف', box.supervisor, 'supervisor')}
        ${field('المكان', box.location, 'location')}
      `;
    }
    default:
      return '';
  }
}

function field(label: string, value: string | undefined, key: string): string {
  return `
    <div class="form-group">
      <label>${escapeHtml(label)}</label>
      <input type="text" value="${escapeHtml(value ?? '')}" oninput="window.app.updateInfoBoxField('${key}', this.value)">
    </div>
  `;
}
