import type { HeaderData } from '../../types';

export function renderDocHeader(data: HeaderData): string {
  return `
    <div class="doc-header">
      <div class="doc-logo">
        <svg width="50" height="50" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="60" rx="8" fill="#243245"/>
          <path d="M42.7626 50.8839V54.9995H27.8633V29.8248C27.8633 25.9693 29.2212 22.3202 31.677 19.5207C33.0075 17.9981 34.5719 16.695 36.3558 15.6104C37.289 16.6258 38.1804 17.7237 38.9345 18.8764C37.3164 19.7952 35.9167 20.9205 34.764 22.251C32.9669 24.282 31.9789 26.9704 31.9789 29.8248V50.8839H42.7626Z" fill="#0DE9C3"/>
          <path d="M44.6279 54.9999H40.5123V23.4434C40.5123 22.2179 40.208 21.033 39.6328 20.0175C37.053 15.4603 32.1961 11.581 30.0007 9.97362C27.8051 11.5846 22.9389 15.4735 20.3662 20.0175C19.791 21.033 19.4867 22.2179 19.4867 23.4434V54.9999H15.3711V23.4434C15.3711 21.5079 15.8603 19.6225 16.7839 17.9889C20.6561 11.1502 28.5401 5.95344 28.873 5.73506L29.9983 5L31.1236 5.73506C31.4577 5.95224 39.3405 11.1502 43.2127 17.9889C44.1375 19.6213 44.6255 21.5079 44.6255 23.4434V54.9999H44.6279Z" fill="white"/>
        </svg>
      </div>
      <div class="doc-title">
        <h1>${escapeHtml(data.title)}</h1>
        ${data.subtitle ? `<p>${escapeHtml(data.subtitle)}</p>` : ''}
      </div>
      <div class="doc-version">${escapeHtml(data.version)}</div>
    </div>
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}