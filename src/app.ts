import type {
  CircleCell,
  CircleColumn,
  CirclesDocument,
  CleaningRow,
  DocumentData,
  DocumentType,
  PrayerRow,
  TableRow
} from './types';
import {
  clearDocumentData,
  getSavedDocumentData,
  getSavedDocumentType,
  saveDocumentData,
  saveDocumentType
} from './utils/storage';
import { noteTemplates } from './utils/templates';
import { escapeHtml } from './utils/html';
import { createCell, createColumnId, getDocTypeConfig, type DocTypeConfig } from './docTypes/registry';
import { DAY_NAME_BY_INDEX } from './constants/days';
import { renderHeaderEditor } from './components/Editor/header';
import { renderInfoBoxEditor } from './components/Editor/infoBox';
import { renderTableRowsEditor } from './components/Editor/tableRows';
import { renderFooterNotesEditor } from './components/Editor/footer';
import { renderColumnsEditor } from './components/Editor/columns';
import { MOSQUE_LOGO, renderDocHeader } from './components/Preview/header';
import { renderInfoBox, renderTable } from './components/Preview/table';
import { renderFooter } from './components/Preview/footer';

/** `Date.parse`-free ISO reader that rejects rolled-over dates such as 2026-02-31. */
function parseIsoDate(value: string): Date | null {
  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  if (date.getFullYear() !== parts[0] || date.getMonth() !== parts[1] - 1 || date.getDate() !== parts[2]) {
    return null;
  }
  return date;
}

/**
 * `DocumentData` is a discriminated union, so each member has its own
 * `tableRows` element type and there is no single valid type to assign a mixed
 * `TableRow[]` to. This is the single place that bridges the gap.
 */
function setTableRows(doc: DocumentData, rows: TableRow[]): void {
  (doc as { tableRows: TableRow[] }).tableRows = rows;
}

/** Same union problem as {@link setTableRows}: `push` needs the intersected type. */
function pushTableRow(doc: DocumentData, row: TableRow): void {
  (doc as { tableRows: TableRow[] }).tableRows.push(row);
}

function setSectionVisible(id: string, visible: boolean): void {
  const element = document.getElementById(id);
  if (element) element.style.display = visible ? '' : 'none';
}

export class App {
  private currentDocType: DocumentType | null = null;
  private documentData: DocumentData | null = null;
  private selectedMember: string | null = null;
  private dateRangeStart = '';
  private dateRangeEnd = '';

  constructor() {
    this.init();
  }

  private init(): void {
    this.setupTableEventListeners();

    const savedType = getSavedDocumentType();
    if (savedType) {
      this.selectType(savedType);
    }
  }

  // ---------------------------------------------------------------- documents

  selectType(type: DocumentType): void {
    this.currentDocType = type;
    saveDocumentType(type);

    document.getElementById('typeSelection')!.style.display = 'none';
    document.getElementById('editorLayout')!.classList.add('active');

    const config = getDocTypeConfig(type);
    document.getElementById('editorTitle')!.textContent = config.editorTitle;

    this.documentData = getSavedDocumentData(type) ?? config.makeDefaultDocument();

    this.applyFeatureVisibility(config);
    this.renderAll();
  }

  changeDocumentType(): void {
    if (confirm('هل أنت متأكد? سيتم حفظ البيانات الحالية.')) {
      this.saveCurrentState();
      document.getElementById('editorLayout')!.classList.remove('active');
      document.getElementById('typeSelection')!.style.display = 'flex';
    }
  }

  resetDocument(): void {
    if (!this.currentDocType) return;
    if (!confirm('هل أنت متأكد? سيتم حذف جميع التغييرات الحالية والعودة إلى الإعدادات الافتراضية.')) return;

    clearDocumentData(this.currentDocType);
    this.documentData = getDocTypeConfig(this.currentDocType).makeDefaultDocument();
    this.renderAll();
  }

  private applyFeatureVisibility(config: DocTypeConfig): void {
    setSectionVisible('membersSection', config.features.members);
    setSectionVisible('importSection', config.features.import);

    const individualButton = document.getElementById('individualExportBtn');
    if (individualButton) individualButton.hidden = !config.features.individualExport;
  }

  private config(): DocTypeConfig | null {
    return this.currentDocType ? getDocTypeConfig(this.currentDocType) : null;
  }

  private circlesDoc(): CirclesDocument | null {
    const doc = this.documentData;
    return doc && doc.type === 'circles' ? doc : null;
  }

  // ------------------------------------------------------------------- header

  updateHeaderTitle(value: string): void {
    if (this.documentData) {
      this.documentData.header.title = value;
      this.renderPreview();
    }
  }

  updateHeaderSubtitle(value: string): void {
    if (this.documentData) {
      this.documentData.header.subtitle = value;
      this.renderPreview();
    }
  }

  updateHeaderVersion(value: string): void {
    if (this.documentData) {
      this.documentData.header.version = value;
      this.renderPreview();
    }
  }

  // ----------------------------------------------------------------- info box

  updateInfoBoxField(field: string, value: string): void {
    const doc = this.documentData;
    if (!doc) return;

    // Every info box is a flat record of strings; the key set is validated by
    // the per-type editor that emits these handlers.
    const infoBox = doc.infoBox as unknown as Record<string, string>;
    infoBox[field] = value;
    this.renderPreview();
  }

  // -------------------------------------------------------------- table rows

  updateTableRowField(index: number, field: string, value: string): void {
    const doc = this.documentData;
    if (!doc) return;

    const row = doc.tableRows[index] as unknown as Record<string, unknown>;
    row[field] = value;

    this.renderPreview();
    // Opening/closing feed the prayer members panel; keep it in sync.
    this.renderMembersList();
  }

  updateTableRowArray(index: number, field: 'personnel' | 'tasks', value: string): void {
    const doc = this.documentData;
    if (!doc || doc.type !== 'cleaning') return;

    const row = doc.tableRows[index];
    row[field] = value
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);

    this.renderPreview();
    // The members panel derives from these fields, so it has to follow.
    this.renderMembersList();
  }

  updatePrayerSlot(
    rowIndex: number,
    slot: 'zuhr' | 'asr' | 'maghrib',
    role: 'imam' | 'muezzin',
    value: string
  ): void {
    const doc = this.documentData;
    if (!doc || doc.type !== 'prayer') return;

    const row = doc.tableRows[rowIndex];
    if (!row[slot]) {
      row[slot] = { imam: '', muezzin: '' };
    }
    row[slot][role] = value;
    this.renderPreview();
  }

  updateCircleCell(rowIndex: number, columnId: string, field: keyof CircleCell, value: string): void {
    const doc = this.circlesDoc();
    if (!doc) return;

    const row = doc.tableRows[rowIndex];
    if (!row) return;

    if (!row.cells) row.cells = {};
    const cell = row.cells[columnId] ?? createCell();
    cell[field] = value;
    row.cells[columnId] = cell;
    this.renderPreview();
  }

  addTableRow(): void {
    const doc = this.documentData;
    const config = this.config();
    if (!doc || !config) return;

    pushTableRow(doc, config.makeEmptyRow(doc));
    this.renderEditor();
    this.renderPreview();
  }

  deleteRow(index: number): void {
    const doc = this.documentData;
    if (!doc || !confirm('هل تريد حذف هذا الصف؟')) return;

    doc.tableRows.splice(index, 1);
    this.renderEditor();
    this.renderPreview();
  }

  moveRowUp(index: number): void {
    const rows = this.documentData?.tableRows;
    if (!rows || index <= 0) return;

    [rows[index], rows[index - 1]] = [rows[index - 1], rows[index]];
    this.renderEditor();
    this.renderPreview();
  }

  moveRowDown(index: number): void {
    const rows = this.documentData?.tableRows;
    if (!rows || index >= rows.length - 1) return;

    [rows[index], rows[index + 1]] = [rows[index + 1], rows[index]];
    this.renderEditor();
    this.renderPreview();
  }

  // ----------------------------------------------------------------- planning

  setPlanningMode(mode: 'period' | 'weekly'): void {
    if (!this.documentData) return;
    this.documentData.planningMode = mode;
    this.renderAll();
  }

  /**
   * Shows or hides the optional المغرب column. The per-row data is left
   * untouched, so switching it off and back on keeps whatever was typed.
   */
  toggleMaghrib(show: boolean): void {
    const doc = this.documentData;
    if (!doc || doc.type !== 'prayer') return;

    doc.showMaghrib = show;
    // The editor gains or loses two fields per row, so re-render it too.
    this.renderAll();
  }

  toggleWeeklyDay(day: string): void {
    const doc = this.documentData;
    const config = this.config();
    if (!doc || !config) return;

    const index = doc.tableRows.findIndex(row => (row as { day: string }).day === day);

    if (index >= 0) {
      if (config.rowHasContent(doc.tableRows[index]) && !confirm(`هل تريد حذف يوم ${day}?`)) return;
      doc.tableRows.splice(index, 1);
    } else {
      const row = config.makeEmptyRow(doc);
      (row as { day: string }).day = day;
      pushTableRow(doc, row);
    }

    this.renderAll();
  }

  setDateRangeStart(value: string): void {
    this.dateRangeStart = value;
  }

  setDateRangeEnd(value: string): void {
    this.dateRangeEnd = value;
  }

  generateDateRange(): void {
    const doc = this.documentData;
    const config = this.config();
    if (!doc || !config) return;

    if (!this.dateRangeStart || !this.dateRangeEnd) {
      alert('يرجى اختيار تاريخ البداية والنهاية');
      return;
    }

    const start = parseIsoDate(this.dateRangeStart);
    const end = parseIsoDate(this.dateRangeEnd);
    if (!start || !end || start > end) {
      alert('يرجى إدخال تاريخ بداية ونهاية صحيحين');
      return;
    }

    const excluded = config.excludedWeekdays;
    const rows: TableRow[] = [];
    const current = new Date(start);

    while (current <= end) {
      const weekday = current.getDay();

      if (!excluded.includes(weekday)) {
        const row = config.makeEmptyRow(doc);
        const dayRow = row as { day: string; date: string };
        dayRow.day = DAY_NAME_BY_INDEX[weekday] ?? '';
        dayRow.date = `${String(current.getDate()).padStart(2, '0')}/${String(current.getMonth() + 1).padStart(2, '0')}`;
        rows.push(row);
      }

      current.setDate(current.getDate() + 1);
    }

    if (rows.length === 0) {
      alert('لا توجد أيام صالحة ضمن الفترة المحددة.');
      return;
    }

    const hasExistingContent = doc.tableRows.some(row => config.rowHasContent(row));
    if (hasExistingContent && !confirm('سيتم استبدال الصفوف الحالية بالأيام المولّدة. هل تريد المتابعة؟')) {
      return;
    }

    setTableRows(doc, rows);
    this.renderAll();
  }

  // ----------------------------------------------------------------- columns

  addColumn(): void {
    const doc = this.circlesDoc();
    if (!doc) return;

    const column: CircleColumn = { id: createColumnId(), title: 'حصة جديدة' };
    doc.columns.push(column);

    for (const row of doc.tableRows) {
      if (!row.cells) row.cells = {};
      row.cells[column.id] = createCell();
    }

    this.renderAll();
  }

  updateColumnTitle(index: number, value: string): void {
    const doc = this.circlesDoc();
    const column = doc?.columns[index];
    if (!column) return;

    column.title = value;
    // Preview only: re-rendering the editor here would drop the caret mid-keystroke.
    this.renderPreview();
  }

  deleteColumn(index: number): void {
    const doc = this.circlesDoc();
    const column = doc?.columns[index];
    if (!doc || !column) return;

    const hasContent = doc.tableRows.some(row => {
      const cell = row.cells?.[column.id];
      return Boolean(cell && (cell.lesson.trim() || cell.person.trim()));
    });

    if (hasContent && !confirm(`العمود "${column.title}" يحتوي على بيانات. هل تريد حذفه؟`)) return;

    doc.columns.splice(index, 1);
    for (const row of doc.tableRows) {
      delete row.cells[column.id];
    }

    this.renderAll();
  }

  moveColumnUp(index: number): void {
    const columns = this.circlesDoc()?.columns;
    if (!columns || index <= 0) return;

    [columns[index], columns[index - 1]] = [columns[index - 1], columns[index]];
    this.renderAll();
  }

  moveColumnDown(index: number): void {
    const columns = this.circlesDoc()?.columns;
    if (!columns || index >= columns.length - 1) return;

    [columns[index], columns[index + 1]] = [columns[index + 1], columns[index]];
    this.renderAll();
  }

  // ------------------------------------------------------------ footer notes

  updateNoteField(index: number, field: string, value: unknown): void {
    const doc = this.documentData;
    if (!doc) return;

    const note = doc.footerNotes[index] as unknown as Record<string, unknown>;
    note[field] = value;
    this.renderPreview();
  }

  addFooterNote(): void {
    const doc = this.documentData;
    if (!doc) return;

    doc.footerNotes.push({ title: 'ملاحظة جديدة', content: '', isVerse: false });
    this.renderEditor();
    this.renderPreview();
  }

  deleteNote(index: number): void {
    const doc = this.documentData;
    if (!doc || !confirm('هل تريد حذف هذه الملاحظة؟')) return;

    doc.footerNotes.splice(index, 1);
    this.renderEditor();
    this.renderPreview();
  }

  moveNoteUp(index: number): void {
    const notes = this.documentData?.footerNotes;
    if (!notes || index <= 0) return;

    [notes[index], notes[index - 1]] = [notes[index - 1], notes[index]];
    this.renderEditor();
    this.renderPreview();
  }

  moveNoteDown(index: number): void {
    const notes = this.documentData?.footerNotes;
    if (!notes || index >= notes.length - 1) return;

    [notes[index], notes[index + 1]] = [notes[index + 1], notes[index]];
    this.renderEditor();
    this.renderPreview();
  }

  applyTemplate(index: number, templateKey: string): void {
    const doc = this.documentData;
    const template = templateKey ? noteTemplates[templateKey] : undefined;
    if (!doc || !template) return;

    doc.footerNotes[index] = { ...template };
    this.renderEditor();
    this.renderPreview();
  }

  // ----------------------------------------------------------------- render

  private renderAll(): void {
    this.renderEditor();
    this.renderPreview();
  }

  private renderEditor(): void {
    const doc = this.documentData;
    const type = this.currentDocType;
    if (!doc || !type) return;

    this.selectedMember = null;

    const headerSection = document.getElementById('headerSection');
    if (headerSection) {
      headerSection.innerHTML = renderHeaderEditor(doc.header, () => this.renderPreview());
    }

    const infoBoxFields = document.getElementById('infoBoxFields');
    if (infoBoxFields) {
      infoBoxFields.innerHTML = renderInfoBoxEditor(type, doc.infoBox, () => this.renderPreview());
    }

    const columnsSection = document.getElementById('columnsSection');
    const columnsEditor = document.getElementById('columnsEditor');
    if (columnsSection && columnsEditor) {
      const isCircles = doc.type === 'circles';
      columnsSection.style.display = isCircles ? '' : 'none';
      columnsEditor.innerHTML = isCircles ? renderColumnsEditor(doc.columns) : '';
    }

    const modeSection = document.getElementById('cleaningModeSection');
    if (modeSection) {
      modeSection.innerHTML = this.renderPlanningModeSection();
    }

    const tableRowsEditor = document.getElementById('tableRowsEditor');
    if (tableRowsEditor) {
      const columns = doc.type === 'circles' ? doc.columns : [];
      const showMaghrib = doc.type === 'prayer' ? doc.showMaghrib : false;
      tableRowsEditor.innerHTML = renderTableRowsEditor(type, doc.tableRows, () => this.renderPreview(), doc.planningMode, columns, showMaghrib);
    }

    const footerNotesEditor = document.getElementById('footerNotesEditor');
    if (footerNotesEditor) {
      footerNotesEditor.innerHTML = renderFooterNotesEditor(doc.footerNotes, () => this.renderPreview());
    }

    this.renderMembersList();
  }

  private renderPlanningModeSection(): string {
    const doc = this.documentData;
    if (!doc) return '';

    const mode = doc.planningMode ?? 'period';
    const showMaghrib = doc.type === 'prayer' ? doc.showMaghrib : false;

    return `
      <div class="cleaning-mode-toggle">
        <button class="mode-btn ${mode === 'period' ? 'active' : ''}" onclick="window.app.setPlanningMode('period')">📅 برنامج بمدة</button>
        <button class="mode-btn ${mode === 'weekly' ? 'active' : ''}" onclick="window.app.setPlanningMode('weekly')">📋 برنامج أسبوعي</button>
      </div>
      ${
        doc.type === 'prayer'
          ? `
        <label class="maghrib-toggle ${showMaghrib ? 'checked' : ''}">
          <input type="checkbox" ${showMaghrib ? 'checked' : ''} onchange="window.app.toggleMaghrib(this.checked)">
          إظهار عمود المغرب
        </label>
      `
          : ''
      }
      ${
        mode === 'period'
          ? `
        <div class="date-range-picker">
          <input type="date" id="dateRangeStart" value="${escapeHtml(this.dateRangeStart)}" onchange="window.app.setDateRangeStart(this.value)">
          <input type="date" id="dateRangeEnd" value="${escapeHtml(this.dateRangeEnd)}" onchange="window.app.setDateRangeEnd(this.value)">
          <button class="btn-add" onclick="window.app.generateDateRange()">توليد الأيام</button>
        </div>
      `
          : ''
      }
    `;
  }

  private setupTableEventListeners(): void {
    delegateRowActions('tableRowsEditor', action => {
      if (action.action === 'delete') this.deleteRow(action.index);
      else if (action.action === 'moveUp') this.moveRowUp(action.index);
      else if (action.action === 'moveDown') this.moveRowDown(action.index);
    });

    delegateRowActions('footerNotesEditor', action => {
      if (action.action === 'delete') this.deleteNote(action.index);
      else if (action.action === 'moveUp') this.moveNoteUp(action.index);
      else if (action.action === 'moveDown') this.moveNoteDown(action.index);
    });

    delegateRowActions('columnsEditor', action => {
      if (action.action === 'colDelete') this.deleteColumn(action.index);
      else if (action.action === 'colUp') this.moveColumnUp(action.index);
      else if (action.action === 'colDown') this.moveColumnDown(action.index);
    });
  }

  private renderMembersList(): void {
    const membersList = document.getElementById('membersList');
    if (!membersList) return;

    const config = this.config();
    if (!this.documentData || !this.currentDocType || !config?.features.members) {
      membersList.innerHTML = '';
      return;
    }

    const personnel = this.extractPersonnel();
    if (personnel.length === 0) {
      membersList.innerHTML = '<p class="hint-text">لا يوجد أفراد</p>';
      return;
    }

    let html = personnel
      .map(
        person => `
      <div class="member-tag ${this.selectedMember === person ? 'active' : ''}" data-person="${escapeHtml(person)}" role="button" tabindex="0" onclick="window.app.previewMember(this.dataset.person)" onkeydown="if(event.key==='Enter'||event.key===' '){window.app.previewMember(this.dataset.person)}">
        ${escapeHtml(person)}
      </div>`
      )
      .join('');

    if (this.selectedMember) {
      html += '<button class="btn-clear-preview" onclick="window.app.clearMemberPreview()">↺ العودة للوثيقة الكاملة</button>';
    }

    membersList.innerHTML = html;
  }

  private renderPreview(): void {
    const doc = this.documentData;
    const type = this.currentDocType;
    if (!doc || !type) return;

    const page = document.getElementById('previewPage');
    if (!page) return;

    if (this.selectedMember) return;

    const config = getDocTypeConfig(type);
    page.style.minHeight = '';
    page.className = `a4-page ${config.pageClass}`;

    const columns = doc.type === 'circles' ? doc.columns : [];
    const showMaghrib = doc.type === 'prayer' ? doc.showMaghrib : false;

    let html = renderDocHeader(doc.header);
    html += renderInfoBox(type, doc.infoBox);
    html += renderTable(type, doc.tableRows, doc.planningMode, columns, showMaghrib);
    html += renderFooter(doc.footerNotes);

    page.innerHTML = html;

    this.saveCurrentState();
  }

  private saveCurrentState(): void {
    if (this.currentDocType && this.documentData) {
      saveDocumentData(this.currentDocType, this.documentData);
    }
  }

  // ------------------------------------------------------------------ export

  async exportToPDF(): Promise<void> {
    try {
      const page = document.getElementById('previewPage');
      if (!page) {
        alert('لم يتم العثور على الصفحة');
        return;
      }

      const canvas = await html2canvas(page, { scale: 1.2 });
      const imgData = canvas.toDataURL('image/png');

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${this.documentData?.header.title || 'document'}.pdf`);
    } catch (error) {
      alert('فشل تصدير PDF. يرجى المحاولة مرة أخرى.');
      console.error('PDF export error:', error);
    }
  }

  async exportToImage(): Promise<void> {
    try {
      const page = document.getElementById('previewPage');
      if (!page) {
        alert('لم يتم العثور على الصفحة');
        return;
      }

      const canvas = await html2canvas(page, { scale: 1.2 });
      downloadBlob(await canvasToBlob(canvas, 'image/png'), `${this.documentData?.header.title || 'document'}.png`);
    } catch (error) {
      alert('فشل تصدير الصورة. يرجى المحاولة مرة أخرى.');
      console.error('Image export error:', error);
    }
  }

  async exportIndividualPrograms(): Promise<void> {
    const config = this.config();
    if (!this.documentData || !config) {
      alert('الرجاء اختيار نوع الوثيقة أولاً');
      return;
    }

    if (!config.features.individualExport) {
      alert('تصدير برامج الأفراد غير متاح لهذا النوع من الوثائق.');
      return;
    }

    try {
      if (config.id === 'cleaning') {
        await this.exportCleaningIndividualPrograms();
      } else {
        await this.exportPrayerIndividualPrograms();
      }
    } catch (error) {
      alert('حدث خطأ أثناء التصدير. يرجى المحاولة مرة أخرى.');
      console.error('Individual export error:', error);
    }
  }

  private async exportCleaningIndividualPrograms(): Promise<void> {
    const doc = this.documentData;
    if (!doc) return;

    const personnelList = this.extractPersonnel();
    if (personnelList.length === 0) {
      alert('لا يوجد أشخاص في الجدول');
      return;
    }

    const zip = new window.JSZip();

    for (const person of personnelList) {
      try {
        const personRows = this.filterRowsForPerson(person);
        const imageBlob = await this.generateImageBlob(this.renderIndividualProgram(person, personRows, doc.planningMode));
        zip.file(`${person}.jpg`, imageBlob);
      } catch (error) {
        console.error(`Failed to export for ${person}:`, error);
      }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    downloadBlob(content, 'برامج_الأفراد.zip');
    alert(`تم تصدير ${personnelList.length} برنامج بنجاح`);
  }

  private async exportPrayerIndividualPrograms(): Promise<void> {
    const doc = this.documentData;
    if (!doc) return;

    const personnelList = this.extractPersonnel();
    if (personnelList.length === 0) {
      alert('لا يوجد أشخاص في الجدول');
      return;
    }

    const zip = new window.JSZip();

    for (const person of personnelList) {
      try {
        const imageBlob = await this.generateImageBlob(this.renderPrayerIndividualProgram(person, this.filterPrayerRowsForPerson(person)));
        zip.file(`${person}.jpg`, imageBlob);
      } catch (error) {
        console.error(`Failed to export for ${person}:`, error);
      }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    downloadBlob(content, 'برامج_الأفراد.zip');
    alert(`تم تصدير ${personnelList.length} برنامج بنجاح`);
  }

  private async generateImageBlob(html: string): Promise<Blob> {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = '210mm';
    document.body.appendChild(tempDiv);

    const a4Page = tempDiv.querySelector('.a4-page') as HTMLElement | null;
    if (!a4Page) {
      document.body.removeChild(tempDiv);
      throw new Error('Preview markup missing');
    }
    a4Page.style.backgroundColor = 'white';

    try {
      const canvas = await html2canvas(a4Page, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      return canvasToBlob(canvas, 'image/jpeg', 0.9);
    } finally {
      document.body.removeChild(tempDiv);
    }
  }

  // ----------------------------------------------------------------- members

  private extractPersonnel(): string[] {
    const doc = this.documentData;
    const type = this.currentDocType;
    if (!doc || !type) return [];

    switch (type) {
      case 'cleaning':
        return this.extractCleaningPersonnel(doc.tableRows as CleaningRow[]);
      case 'prayer':
        return this.extractPrayerPersonnel(doc.tableRows as PrayerRow[]);
      default:
        return [];
    }
  }

  private extractCleaningPersonnel(rows: CleaningRow[]): string[] {
    const personnelSet = new Set<string>();

    for (const row of rows) {
      for (const person of row.personnel ?? []) {
        const trimmed = person.trim();
        if (trimmed && trimmed !== 'المتوفر' && trimmed !== '-') {
          personnelSet.add(trimmed);
        }
      }
    }

    return Array.from(personnelSet).sort();
  }

  private extractPrayerPersonnel(rows: PrayerRow[]): string[] {
    const personnelSet = new Set<string>();

    const add = (name: string | undefined): void => {
      const trimmed = name?.trim();
      if (trimmed && trimmed !== 'المتوفر') personnelSet.add(trimmed);
    };

    for (const row of rows) {
      for (const name of (row.opening ?? '').split(' ')) add(name);
      add(row.zuhr?.imam);
      add(row.zuhr?.muezzin);
      add(row.asr?.imam);
      add(row.asr?.muezzin);
      add(row.maghrib?.imam);
      add(row.maghrib?.muezzin);
      for (const name of (row.closing ?? '').split(' ')) add(name);
    }

    return Array.from(personnelSet).sort();
  }

  private filterRowsForPerson(personName: string): CleaningRow[] {
    const doc = this.documentData;
    if (!doc) return [];

    return (doc.tableRows as CleaningRow[])
      .filter(row => row.personnel?.includes(personName))
      .map(row => {
        const personIdx = row.personnel.indexOf(personName);
        const personTasks =
          personIdx >= 0 && row.tasks.length === row.personnel.length
            ? [row.tasks[personIdx]]
            : row.tasks.filter(task => task.trim() !== '');
        return { ...row, tasks: personTasks };
      });
  }

  private filterPrayerRowsForPerson(personName: string): PrayerRow[] {
    const doc = this.documentData;
    if (!doc) return [];

    return (doc.tableRows as PrayerRow[])
      .filter(row => {
        const opening = (row.opening ?? '').split(' ').map(n => n.trim());
        const closing = (row.closing ?? '').split(' ').map(n => n.trim());
        return (
          opening.includes(personName) ||
          closing.includes(personName) ||
          row.zuhr?.imam === personName ||
          row.zuhr?.muezzin === personName ||
          row.asr?.imam === personName ||
          row.asr?.muezzin === personName
        );
      })
      .map(row => ({ ...row }));
  }

  previewMember(personName: string): void {
    const doc = this.documentData;
    const config = this.config();
    if (!doc || !config?.features.members) return;

    this.selectedMember = personName;
    this.renderMembersList();

    const previewPage = document.getElementById('previewPage');
    if (!previewPage) return;

    previewPage.style.minHeight = 'auto';
    previewPage.style.backgroundColor = 'white';
    previewPage.className = '';

    const html =
      config.id === 'cleaning'
        ? this.renderIndividualProgram(personName, this.filterRowsForPerson(personName), doc.planningMode)
        : this.renderPrayerIndividualProgram(personName, this.filterPrayerRowsForPerson(personName));

    previewPage.innerHTML = html;
  }

  clearMemberPreview(): void {
    this.selectedMember = null;
    this.renderMembersList();

    const previewPage = document.getElementById('previewPage');
    if (previewPage) {
      previewPage.style.minHeight = '';
      previewPage.style.backgroundColor = '';
    }

    this.renderPreview();
  }

  // ------------------------------------------------------------------ import

  handleFileImport(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith('.csv')) {
      this.parseCSV(file);
    } else if (/\.(xlsx|xls)$/.test(file.name.toLowerCase())) {
      this.parseExcel(file);
    } else {
      alert('يرجى اختيار ملف CSV أو Excel');
    }

    input.value = '';
  }

  private parseCSV(file: File): void {
    window.Papa.parse(file, {
      complete: (results: { data: string[][] }) => {
        try {
          this.processImportedData(results.data);
        } catch (error) {
          alert('حدث خطأ أثناء قراءة الملف. يرجى التأكد من صحة البيانات.');
          console.error('CSV parse error:', error);
        }
      },
      error: (error: Error) => {
        alert('فشل قراءة الملف: ' + error.message);
        console.error('CSV parse error:', error);
      }
    });
  }

  private parseExcel(file: File): void {
    const reader = new FileReader();

    reader.onload = event => {
      try {
        const data = (event.target as FileReader).result;
        if (!data) {
          alert('فشل قراءة الملف');
          return;
        }

        const workbook = window.XLSX.read(data, { type: 'binary' });
        const firstSheet = workbook.SheetNames[0];
        const jsonData = window.XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);

        if (!jsonData || jsonData.length === 0) {
          alert('الملف فارغ أو لا يحتوي على بيانات');
          return;
        }

        const headers = Object.keys(jsonData[0] as object);
        const rows = (jsonData as object[]).map(row =>
          headers.map(header => String((row as Record<string, unknown>)[header] ?? ''))
        );
        this.processImportedData([headers, ...rows]);
      } catch (parseError) {
        alert('حدث خطأ أثناء تحليل الملف. يرجى التأكد من صحة التنسيق.');
        console.error('Excel parse error:', parseError);
      }
    };

    reader.onerror = () => {
      alert('فشل قراءة الملف');
      console.error('FileReader error');
    };

    reader.readAsBinaryString(file);
  }

  private processImportedData(data: string[][]): void {
    const doc = this.documentData;
    const type = this.currentDocType;
    const config = this.config();

    if (!doc || !type || !config) {
      alert('الملف فارغ أو غير صالح');
      return;
    }

    if (!config.features.import) {
      alert('استيراد البيانات غير مدعوم لهذا النوع من الوثائق.');
      return;
    }

    if (data.length < 2) {
      alert('الملف فارغ أو غير صالح');
      return;
    }

    const headers = data[0].map(h => h.trim().toLowerCase());
    const rows = data.slice(1).filter(row => row.some(cell => cell.trim()));

    if (type === 'cleaning') {
      this.importCleaningData(headers, rows);
    } else {
      this.importPrayerData(rows);
    }

    this.renderAll();
  }

  private importCleaningData(headers: string[], rows: string[][]): void {
    const dayIdx = headers.findIndex(h => h.includes('يوم') || h.includes('day'));
    const dateIdx = headers.findIndex(h => h.includes('تاريخ') || h.includes('date'));
    const personnelIdx = headers.findIndex(h => h.includes('مكلف') || h.includes('person') || h.includes('اسم'));
    const tasksIdx = headers.findIndex(h => h.includes('مهم') || h.includes('task') || h.includes('عمل'));

    const tableRows = rows
      .map(row => ({
        day: dayIdx >= 0 ? row[dayIdx]?.trim() || '' : '',
        date: dateIdx >= 0 ? row[dateIdx]?.trim() || '' : '',
        personnel: personnelIdx >= 0 ? splitList(row[personnelIdx]) : [],
        tasks: tasksIdx >= 0 ? splitList(row[tasksIdx]) : []
      }))
      .filter(row => row.day || row.date || row.personnel.length || row.tasks.length);

    if (tableRows.length === 0 || !this.documentData) return;

    setTableRows(this.documentData, tableRows);
    this.documentData.planningMode = tableRows.some(row => Boolean(row.date)) ? 'period' : 'weekly';
  }

  private importPrayerData(rows: string[][]): void {
    const tableRows = rows
      .map(row => {
        const { day, date } = this.parseDayDate(row[0]?.trim() || '');
        return {
          day,
          date,
          opening: normalizeNames(row[1]),
          zuhr: parsePrayerSlot(row[2]),
          asr: parsePrayerSlot(row[3]),
          // The import format has no column for المغرب; seed an empty slot so
          // the row is complete if the column is switched on later.
          maghrib: { imam: '', muezzin: '' },
          closing: normalizeNames(row[4])
        };
      })
      .filter(row => row.day || row.date || row.opening || row.closing || row.zuhr.imam || row.zuhr.muezzin || row.asr.imam || row.asr.muezzin);

    if (tableRows.length === 0 || !this.documentData) return;

    setTableRows(this.documentData, tableRows);
  }

  private parseDayDate(cell: string): { day: string; date: string } {
    const match = cell.match(/^([^\d]+)\s*(\d+\s+\w+)?$/);
    if (match) {
      return { day: match[1]?.trim() || '', date: match[2]?.trim() || '' };
    }
    return { day: cell, date: '' };
  }

  // ------------------------------------------------- individual program HTML

  private renderIndividualProgram(
    personName: string,
    rows: CleaningRow[],
    mode?: 'period' | 'weekly'
  ): string {
    const doc = this.documentData;
    if (!doc) return '';
    const header = doc.header;

    return `
      <div class="a4-page ${getDocTypeConfig('cleaning').pageClass}">
        ${renderIndividualHeader(header, personName)}
        <div class="info-box">
          <h2>جدول مهام ${escapeHtml(personName)}</h2>
          <div class="info-items">
            <div class="info-item"><span>عدد الأيام:</span><span>${rows.length}</span></div>
          </div>
        </div>
        <table class="doc-table">
          <thead>
            <tr>
              <th style="width: 15%">${mode === 'weekly' ? 'اليوم' : 'التاريخ'}</th>
              <th style="width: 85%">المهام</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                row => `
              <tr>
                <td class="date-cell">
                  ${row.day ? `<div class="day">${escapeHtml(row.day)}</div>` : ''}
                  ${row.date && mode !== 'weekly' ? `<div class="date">${escapeHtml(row.date)}</div>` : ''}
                </td>
                <td>
                  ${
                    row.tasks.length > 0
                      ? `<div class="task-list">${row.tasks.map(task => `<div class="task-item">${escapeHtml(task)}</div>`).join('')}</div>`
                      : '-'
                  }
                </td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  private renderPrayerIndividualProgram(personName: string, rows: PrayerRow[]): string {
    const doc = this.documentData;
    if (!doc) return '';

    return `
      <div class="a4-page ${getDocTypeConfig('prayer').pageClass}">
        ${renderIndividualHeader(doc.header, personName)}
        <div class="info-box">
          <h2>جدول مهام ${escapeHtml(personName)}</h2>
          <div class="info-items">
            <div class="info-item"><span>عدد الأيام:</span><span>${rows.length}</span></div>
          </div>
        </div>
        <table class="doc-table">
          <thead>
            <tr>
              <th style="width: 12%">التاريخ</th>
              <th style="width: 22%">الفتح</th>
              <th style="width: 22%">الظهر</th>
              <th style="width: 22%">العصر</th>
              <th style="width: 22%">الغلق</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                row => `
              <tr>
                <td class="date-cell">
                  ${row.day ? `<div class="day">${escapeHtml(row.day)}</div>` : ''}
                  ${row.date ? `<div class="date">${escapeHtml(row.date)}</div>` : ''}
                </td>
                <td>${highlightPerson(row.opening, personName)}</td>
                <td>${renderPrayerDuty(row.zuhr, personName)}</td>
                <td>${renderPrayerDuty(row.asr, personName)}</td>
                <td>${highlightPerson(row.closing, personName)}</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  }
}

// --------------------------------------------------------------- helpers

function renderIndividualHeader(header: { title: string; subtitle: string; version: string }, personName: string): string {
  return `
    <div class="doc-header">
      <div class="doc-logo">${MOSQUE_LOGO}</div>
      <div class="doc-title">
        <h1>${escapeHtml(header.title)} - ${escapeHtml(personName)}</h1>
        <p>${escapeHtml(header.subtitle)}</p>
      </div>
      <div class="doc-version">${escapeHtml(header.version)}</div>
    </div>
  `;
}

function highlightPerson(cell: string | undefined, personName: string): string {
  const names = (cell ?? '')
    .split(' ')
    .map(name => name.trim())
    .filter(Boolean);
  const displayHtml = names.length > 0 ? escapeHtml(names.join('، ')) : '-';
  return names.includes(personName) ? `<strong class="person-highlight">${displayHtml}</strong>` : displayHtml;
}

function renderPrayerDuty(slot: { imam: string; muezzin: string } | undefined, personName: string): string {
  if (!slot) return '-';

  const parts: string[] = [];

  if (slot.imam) {
    parts.push(
      slot.imam === personName
        ? `<strong class="highlight-imam">الإمام: ${escapeHtml(slot.imam)}</strong>`
        : `الإمام: ${escapeHtml(slot.imam)}`
    );
  }

  if (slot.muezzin) {
    parts.push(
      slot.muezzin === personName
        ? `<strong class="highlight-muezzin">المؤذن: ${escapeHtml(slot.muezzin)}</strong>`
        : `المؤذن: ${escapeHtml(slot.muezzin)}`
    );
  }

  return parts.length > 0 ? parts.join('<br>') : '-';
}

function splitList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[,،\n\r]+/)
    .map(item => item.trim())
    .filter(Boolean);
}

function normalizeNames(value: string | undefined): string {
  if (!value) return '';
  return value
    .split(/\s+/)
    .filter(name => name.trim())
    .join(' ');
}

/**
 * Handles the documented `الإمام: <name>` / `المؤذن: <name>` cell format,
 * with either a comma or a space between the two roles.
 */
function parsePrayerSlot(cell: string | undefined): { imam: string; muezzin: string } {
  const result = { imam: '', muezzin: '' };
  if (!cell) return result;

  const combined = cell.match(/الإمام\s*:\s*([^,]+)\s*,?\s*المؤذن\s*:\s*(.+)/);
  if (combined) {
    result.imam = combined[1]?.trim() || '';
    result.muezzin = combined[2]?.trim() || '';
    return result;
  }

  const imam = cell.match(/الإمام\s*:\s*([^\nالمؤذن]+)/);
  const muezzin = cell.match(/المؤذن\s*:\s*([^\n]+)/);

  if (imam) result.imam = imam[1]?.trim() || '';
  if (muezzin) result.muezzin = muezzin[1]?.trim() || '';

  return result;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Canvas conversion failed'))), type, quality);
  });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking synchronously cancels the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** One delegated listener per container; `data-action`/`data-index` drive the handler. */
function delegateRowActions(containerId: string, handler: (action: { index: number; action: string }) => void): void {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.addEventListener('click', (event: Event) => {
    const target = (event.target as HTMLElement).closest('[data-index]') as HTMLElement | null;
    if (!target) return;

    const index = parseInt(target.dataset.index ?? '', 10);
    if (Number.isNaN(index)) return;

    handler({ index, action: target.dataset.action ?? 'delete' });
  });
}

declare global {
  interface Window {
    app: App;
  }
}
