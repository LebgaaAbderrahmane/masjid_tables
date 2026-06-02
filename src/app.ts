import type { DocumentType, DocumentData, CleaningRow, PrayerRow, PlanningMode } from './types';
import { getSavedDocumentType, saveDocumentType, getSavedDocumentData, saveDocumentData, clearDocumentData } from './utils/storage';
import { noteTemplates } from './utils/templates';
import { renderHeaderEditor } from './components/Editor/header';
import { renderInfoBoxEditor } from './components/Editor/infoBox';
import { renderTableRowsEditor } from './components/Editor/tableRows';
import { renderFooterNotesEditor } from './components/Editor/footer';
import { renderDocHeader } from './components/Preview/header';
import { renderInfoBox, renderTable } from './components/Preview/table';
import { renderFooter } from './components/Preview/footer';

export class App {
  private currentDocType: DocumentType | null = null;
  private documentData: DocumentData | null = null;
  private selectedMember: string | null = null;
  private dateRangeStart: string = '';
  private dateRangeEnd: string = '';

  constructor() {
    this.init();
  }

  private init(): void {
    const savedType = getSavedDocumentType();
    if (savedType) {
      this.selectType(savedType);
    }
  }

  selectType(type: DocumentType): void {
    this.currentDocType = type;
    saveDocumentType(type);

    document.getElementById('typeSelection')!.style.display = 'none';
    document.getElementById('editorLayout')!.classList.add('active');

    if (type === 'cleaning') {
      this.initCleaningDocument();
    } else {
      this.initPrayerDocument();
    }

    const saved = getSavedDocumentData(type);
    if (saved) {
      this.documentData = saved;
      if (!this.documentData.planningMode) {
        (this.documentData as { planningMode: PlanningMode }).planningMode = 'period';
      }
    }

    this.renderAll();
  }

  changeDocumentType(): void {
    if (confirm('هل أنت متأكد? سيتم حفظ البيانات الحالية.')) {
      if (this.currentDocType && this.documentData) {
        saveDocumentData(this.currentDocType, this.documentData);
      }
      document.getElementById('editorLayout')!.classList.remove('active');
      document.getElementById('typeSelection')!.style.display = 'flex';
    }
  }

  resetDocument(): void {
    if (!this.currentDocType) return;
    if (!confirm('هل أنت متأكد? سيتم حذف جميع التغييرات الحالية والعودة إلى الإعدادات الافتراضية.')) return;

    clearDocumentData(this.currentDocType);

    if (this.currentDocType === 'cleaning') {
      this.initCleaningDocument();
    } else {
      this.initPrayerDocument();
    }

    this.renderAll();
  }

  private initCleaningDocument(): void {
    document.getElementById('editorTitle')!.textContent = 'محرر برنامج النظافة';

    this.documentData = {
      header: {
        title: 'برنامج النظافة',
        subtitle: 'لفترة امتحانات السداسي الأول 26/25',
        version: '1.1'
      },
      infoBox: {
        title: 'جدول توزيع مهام النظافة',
        period: '25/01 - 29/01',
        responsible: 'إدارة المسجد'
      },
      tableRows: [
        {
          day: 'السبت',
          date: '24/01',
          personnel: [],
          tasks: []
        }
      ],
      footerNotes: [
        {
          title: 'ملاحظة مهمة',
          content: 'يرجى من جميع المعنيين الالتزام بالمهام الموكلة إليهم لضمان نظافة المصلى خلال فترة الامتحانات. في حال التعذر، يرجى التنسيق المسبق.',
          isVerse: false
        }
      ],
      planningMode: 'period'
    };
  }

  private initPrayerDocument(): void {
    document.getElementById('editorTitle')!.textContent = 'محرر برنامج الصلاة';

    this.documentData = {
      header: {
        title: 'برنامج الصلاة',
        subtitle: 'جدول توزيع المهام اليومية',
        version: '1.1'
      },
      infoBox: {
        title: 'أوقات الإقامة',
        zuhr: 'مباشرة',
        asr: '5 دقائق',
        maghrib: ''
      },
      tableRows: [
        {
          day: 'الاثنين',
          date: '',
          opening: '',
          zuhr: { imam: '', muezzin: '' },
          asr: { imam: '', muezzin: '' },
          closing: ''
        }
      ],
      footerNotes: [
        {
          title: 'ملاحظة مهمة',
          content: 'يرجى الالتزام بالتواجد قبل وقت الصلاة ب 10 دقائق على الأقل. في حالة عدم القدرة على الحضور، يرجى التواصل مع المسؤول لتحديد بديل.',
          isVerse: false
        }
      ],
      planningMode: 'period'
    };
  }

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

  updateInfoBoxField(field: string, value: string): void {
    if (!this.documentData || !this.currentDocType) return;

    const infoBox = this.documentData.infoBox as unknown as Record<string, string>;
    infoBox[field] = value;
    this.renderPreview();
  }

  updateTableRowField(index: number, field: string, value: string): void {
    if (!this.documentData) return;
    const row = this.documentData.tableRows[index] as unknown as Record<string, unknown>;
    row[field] = value;
    this.renderPreview();
  }

  updateTableRowArray(index: number, field: string, value: string): void {
    if (!this.documentData) return;
    const row = this.documentData.tableRows[index] as unknown as Record<string, unknown>;
    (row[field] as string[]) = value.split('\n').filter(x => x.trim()).map(x => x.trim());
    this.renderPreview();
  }

  updatePrayerSlot(rowIndex: number, slot: 'zuhr' | 'asr', role: 'imam' | 'muezzin', value: string): void {
    if (!this.documentData) return;
    const row = this.documentData.tableRows[rowIndex] as PrayerRow;
    if (!row[slot]) {
      row[slot] = { imam: '', muezzin: '' };
    }
    row[slot][role] = value;
    this.renderPreview();
  }

  addTableRow(): void {
    if (!this.documentData || !this.currentDocType) return;

    if (this.currentDocType === 'cleaning') {
      this.documentData.tableRows.push({
        day: '',
        date: '',
        personnel: [],
        tasks: []
      } as CleaningRow);
    } else {
      this.documentData.tableRows.push({
        day: '',
        date: '',
        opening: '',
        zuhr: { imam: '', muezzin: '' },
        asr: { imam: '', muezzin: '' },
        closing: ''
      } as PrayerRow);
    }

    this.renderEditor();
    this.renderPreview();
  }

  deleteRow(index: number): void {
    if (!this.documentData) return;
    if (!confirm('هل تريد حذف هذا الصف?')) return;

    this.documentData.tableRows.splice(index, 1);
    this.renderEditor();
    this.renderPreview();
  }

  moveRowUp(index: number): void {
    if (!this.documentData || index === 0) return;
    [this.documentData.tableRows[index], this.documentData.tableRows[index - 1]] =
      [this.documentData.tableRows[index - 1], this.documentData.tableRows[index]];
    this.renderEditor();
    this.renderPreview();
  }

  moveRowDown(index: number): void {
    if (!this.documentData || index >= this.documentData.tableRows.length - 1) return;
    [this.documentData.tableRows[index], this.documentData.tableRows[index + 1]] =
      [this.documentData.tableRows[index + 1], this.documentData.tableRows[index]];
    this.renderEditor();
    this.renderPreview();
  }

  setPlanningMode(mode: PlanningMode): void {
    if (!this.documentData) return;
    this.documentData.planningMode = mode;
    this.renderAll();
  }

  toggleWeeklyDay(day: string): void {
    if (!this.documentData || !this.currentDocType) return;
    const idx = this.documentData.tableRows.findIndex(r => (r as { day: string }).day === day);
    if (idx >= 0) {
      if (this.currentDocType === 'cleaning') {
        const row = this.documentData.tableRows[idx] as CleaningRow;
        if (row.personnel.length > 0 || row.tasks.length > 0) {
          if (!confirm(`هل تريد حذف يوم ${day}?`)) return;
        }
      } else {
        const row = this.documentData.tableRows[idx] as PrayerRow;
        if (row.opening || row.zuhr.imam || row.zuhr.muezzin || row.asr.imam || row.asr.muezzin || row.closing) {
          if (!confirm(`هل تريد حذف يوم ${day}?`)) return;
        }
      }
      this.documentData.tableRows.splice(idx, 1);
    } else {
      if (this.currentDocType === 'cleaning') {
        this.documentData.tableRows.push({ day, date: '', personnel: [], tasks: [] } as CleaningRow);
      } else {
        this.documentData.tableRows.push({
          day,
          date: '',
          opening: '',
          zuhr: { imam: '', muezzin: '' },
          asr: { imam: '', muezzin: '' },
          closing: ''
        } as PrayerRow);
      }
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
    if (!this.documentData || !this.currentDocType) return;
    if (!this.dateRangeStart || !this.dateRangeEnd) {
      alert('يرجى اختيار تاريخ البداية والنهاية');
      return;
    }
    const parseDate = (s: string): Date | null => {
      const parts = s.split('-').map(Number);
      if (parts.length !== 3 || parts.some(isNaN)) return null;
      return new Date(parts[0], parts[1] - 1, parts[2]);
    };
    const start = parseDate(this.dateRangeStart);
    const end = parseDate(this.dateRangeEnd);
    if (!start || !end || start > end) {
      alert('يرجى إدخال تاريخ بداية ونهاية صحيحين');
      return;
    }
    const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const rows: (CleaningRow | PrayerRow)[] = [];
    const current = new Date(start);
    while (current <= end) {
      const dd = String(current.getDate()).padStart(2, '0');
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      if (this.currentDocType === 'cleaning') {
        rows.push({
          day: dayNames[current.getDay()],
          date: `${dd}/${mm}`,
          personnel: [],
          tasks: []
        } as CleaningRow);
      } else {
        rows.push({
          day: dayNames[current.getDay()],
          date: `${dd}/${mm}`,
          opening: '',
          zuhr: { imam: '', muezzin: '' },
          asr: { imam: '', muezzin: '' },
          closing: ''
        } as PrayerRow);
      }
      current.setDate(current.getDate() + 1);
    }
    this.documentData.tableRows = rows;
    this.renderAll();
  }

  updateNoteField(index: number, field: string, value: unknown): void {
    if (!this.documentData) return;
    const note = this.documentData.footerNotes[index] as unknown as Record<string, unknown>;
    note[field] = value;
    this.renderPreview();
  }

  addFooterNote(): void {
    if (!this.documentData) return;

    this.documentData.footerNotes.push({
      title: 'ملاحظة جديدة',
      content: '',
      isVerse: false
    });

    this.renderEditor();
    this.renderPreview();
  }

  deleteNote(index: number): void {
    if (!this.documentData) return;
    if (!confirm('هل تريد حذف هذه الملاحظة?')) return;

    this.documentData.footerNotes.splice(index, 1);
    this.renderEditor();
    this.renderPreview();
  }

  moveNoteUp(index: number): void {
    if (!this.documentData || index === 0) return;
    [this.documentData.footerNotes[index], this.documentData.footerNotes[index - 1]] =
      [this.documentData.footerNotes[index - 1], this.documentData.footerNotes[index]];
    this.renderEditor();
    this.renderPreview();
  }

  moveNoteDown(index: number): void {
    if (!this.documentData || index >= this.documentData.footerNotes.length - 1) return;
    [this.documentData.footerNotes[index], this.documentData.footerNotes[index + 1]] =
      [this.documentData.footerNotes[index + 1], this.documentData.footerNotes[index]];
    this.renderEditor();
    this.renderPreview();
  }

  applyTemplate(index: number, templateKey: string): void {
    if (!this.documentData || !templateKey || !noteTemplates[templateKey]) return;

    this.documentData.footerNotes[index] = { ...noteTemplates[templateKey] };
    this.renderEditor();
    this.renderPreview();
  }

  private renderAll(): void {
    this.renderEditor();
    this.renderPreview();
  }

  private renderEditor(): void {
    if (!this.documentData || !this.currentDocType) return;

    this.selectedMember = null;

    const headerSection = document.getElementById('headerSection');
    if (headerSection) {
      headerSection.innerHTML = renderHeaderEditor(this.documentData.header, () => this.renderPreview());
    }

    const infoBoxFields = document.getElementById('infoBoxFields');
    if (infoBoxFields) {
      infoBoxFields.innerHTML = renderInfoBoxEditor(this.currentDocType, this.documentData.infoBox, () => this.renderPreview());
    }

    const cleaningModeSection = document.getElementById('cleaningModeSection');
    if (cleaningModeSection && this.currentDocType) {
      const mode = (this.documentData as DocumentData & { planningMode: PlanningMode }).planningMode;
      cleaningModeSection.innerHTML = `
        <div class="cleaning-mode-toggle">
          <button class="mode-btn ${mode === 'period' ? 'active' : ''}" onclick="window.app.setPlanningMode('period')">📅 برنامج بمدة</button>
          <button class="mode-btn ${mode === 'weekly' ? 'active' : ''}" onclick="window.app.setPlanningMode('weekly')">📋 برنامج أسبوعي</button>
        </div>
        ${mode === 'period' ? `
          <div class="date-range-picker">
            <input type="date" id="dateRangeStart" placeholder="تاريخ البداية" value="${this.escapeHtml(this.dateRangeStart)}" onchange="window.app.setDateRangeStart(this.value)">
            <input type="date" id="dateRangeEnd" placeholder="تاريخ النهاية" value="${this.escapeHtml(this.dateRangeEnd)}" onchange="window.app.setDateRangeEnd(this.value)">
            <button class="btn-add" onclick="window.app.generateDateRange()">توليد الأيام</button>
          </div>
        ` : ''}
      `;
    } else if (cleaningModeSection) {
      cleaningModeSection.innerHTML = '';
    }

    const tableRowsEditor = document.getElementById('tableRowsEditor');
    if (tableRowsEditor) {
      const mode = (this.documentData as DocumentData & { planningMode: PlanningMode }).planningMode;
      tableRowsEditor.innerHTML = renderTableRowsEditor(this.currentDocType, this.documentData.tableRows, () => this.renderPreview(), mode);
    }

    const footerNotesEditor = document.getElementById('footerNotesEditor');
    if (footerNotesEditor) {
      footerNotesEditor.innerHTML = renderFooterNotesEditor(this.documentData.footerNotes, () => this.renderPreview());
    }

    this.renderMembersList();
    this.setupTableEventListeners();
  }

  private setupTableEventListeners(): void {
    const tableEditor = document.getElementById('tableRowsEditor');
    if (tableEditor) {
      const handler = (e: Event) => {
        const target = e.target as HTMLElement;
        const btn = target.closest('[data-index]') as HTMLElement | null;
        if (!btn) return;
        const index = parseInt(btn.dataset.index ?? '', 10);
        if (isNaN(index)) return;
        const action = btn.dataset.action ?? 'delete';
        if (action === 'delete') {
          this.deleteRow(index);
        } else if (action === 'moveUp') {
          this.moveRowUp(index);
        } else if (action === 'moveDown') {
          this.moveRowDown(index);
        }
      };
      tableEditor.removeEventListener('click', handler);
      tableEditor.addEventListener('click', handler);
    }

    const footerEditor = document.getElementById('footerNotesEditor');
    if (footerEditor) {
      const handler = (e: Event) => {
        const target = e.target as HTMLElement;
        const btn = target.closest('[data-index]') as HTMLElement | null;
        if (!btn) return;
        const index = parseInt(btn.dataset.index ?? '', 10);
        if (isNaN(index)) return;
        const action = btn.dataset.action ?? 'delete';
        if (action === 'delete') {
          this.deleteNote(index);
        } else if (action === 'moveUp') {
          this.moveNoteUp(index);
        } else if (action === 'moveDown') {
          this.moveNoteDown(index);
        }
      };
      footerEditor.removeEventListener('click', handler);
      footerEditor.addEventListener('click', handler);
    }
  }

  private renderMembersList(): void {
    const membersList = document.getElementById('membersList');
    if (!membersList) return;

    if (!this.documentData || !this.currentDocType) {
      membersList.innerHTML = '';
      return;
    }

    let personnel: string[] = [];
    if (this.currentDocType === 'cleaning') {
      personnel = this.extractCleaningPersonnel();
    } else {
      personnel = this.extractPrayerPersonnel();
    }

    if (personnel.length === 0) {
      membersList.innerHTML = '<p style="color: #888; font-size: 13px;">لا يوجد أفراد</p>';
      return;
    }

    let html = personnel.map(person => `
      <div class="member-tag ${this.selectedMember === person ? 'active' : ''}" onclick="window.app.previewMember('${this.escapeHtml(person)}')">
        ${this.escapeHtml(person)}
      </div>
    `).join('');

    if (this.selectedMember) {
      html += `<button class="btn-clear-preview" onclick="window.app.clearMemberPreview()">↺ العودة للوثيقة الكاملة</button>`;
    }

    membersList.innerHTML = html;
  }

  previewMember(personName: string): void {
    if (!this.documentData || !this.currentDocType) return;

    this.selectedMember = personName;
    this.renderMembersList();

    const previewPage = document.getElementById('previewPage');
    if (!previewPage) return;

    previewPage.style.minHeight = 'auto';
    previewPage.style.backgroundColor = 'white';
    previewPage.className = '';

    previewPage.innerHTML = '';

    let html = '';
    if (this.currentDocType === 'cleaning') {
      const rows = this.filterRowsForPerson(personName);
      const mode = (this.documentData as DocumentData & { planningMode: PlanningMode }).planningMode;
      html = this.renderIndividualProgram(personName, rows, mode);
    } else {
      const rows = this.filterPrayerRowsForPerson(personName);
      html = this.renderPrayerIndividualProgram(personName, rows);
    }

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

  private renderPreview(): void {
    if (!this.documentData || !this.currentDocType) return;

    const page = document.getElementById('previewPage');
    if (!page) return;

    if (this.selectedMember) {
      return;
    }

    page.style.minHeight = '';
    page.className = 'a4-page';

    let html = renderDocHeader(this.documentData.header);
    html += renderInfoBox(this.currentDocType, this.documentData.infoBox);
    html += renderTable(this.currentDocType, this.documentData.tableRows, (this.documentData as DocumentData & { planningMode: PlanningMode }).planningMode);
    html += renderFooter(this.documentData.footerNotes);

    page.innerHTML = html;

    this.saveCurrentState();
  }

  private saveCurrentState(): void {
    if (this.currentDocType && this.documentData) {
      saveDocumentData(this.currentDocType, this.documentData);
    }
  }

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
      const link = document.createElement('a');
      link.download = `${this.documentData?.header.title || 'document'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      alert('فشل تصدير الصورة. يرجى المحاولة مرة أخرى.');
      console.error('Image export error:', error);
    }
  }

  async exportIndividualPrograms(): Promise<void> {
    if (!this.documentData || !this.currentDocType) {
      alert('الرجاء اختيار نوع الوثيقة أولاً');
      return;
    }

    try {
      if (this.currentDocType === 'cleaning') {
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
    if (!this.documentData) return;

    const personnelList = this.extractCleaningPersonnel();
    if (personnelList.length === 0) {
      alert('لا يوجد أشخاص في الجدول');
      return;
    }

    const zip = new window.JSZip();

    const mode = (this.documentData as DocumentData & { planningMode: PlanningMode }).planningMode;
    for (const person of personnelList) {
      try {
        const personRows = this.filterRowsForPerson(person);
        const html = this.renderIndividualProgram(person, personRows, mode);
        const imageBlob = await this.generateImageBlob(html);
        zip.file(`${person}.png`, imageBlob);
      } catch (error) {
        console.error(`Failed to export for ${person}:`, error);
      }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    this.downloadBlob(content, 'برامج_الأفراد.zip');
    alert(`تم تصدير ${personnelList.length} برنامج بنجاح`);
  }

  private async exportPrayerIndividualPrograms(): Promise<void> {
    if (!this.documentData) return;

    const personnelList = this.extractPrayerPersonnel();
    if (personnelList.length === 0) {
      alert('لا يوجد أشخاص في الجدول');
      return;
    }

    const zip = new window.JSZip();

    for (const person of personnelList) {
      try {
        const personRows = this.filterPrayerRowsForPerson(person);
        const html = this.renderPrayerIndividualProgram(person, personRows);
        const imageBlob = await this.generateImageBlob(html);
        zip.file(`${person}.png`, imageBlob);
      } catch (error) {
        console.error(`Failed to export for ${person}:`, error);
      }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    this.downloadBlob(content, 'برامج_الأفراد.zip');
    alert(`تم تصدير ${personnelList.length} برنامج بنجاح`);
  }

  private async generateImageBlob(html: string): Promise<Blob> {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = '210mm';
    document.body.appendChild(tempDiv);

    const a4Page = tempDiv.querySelector('.a4-page') as HTMLElement;
    a4Page.style.backgroundColor = 'white';

    try {
      const canvas = await html2canvas(a4Page, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      const base64 = dataUrl.split(',')[1];
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return new Blob([bytes], { type: 'image/jpeg' });
    } finally {
      document.body.removeChild(tempDiv);
    }
  }

  private extractCleaningPersonnel(): string[] {
    if (!this.documentData) return [];

    const personnelSet = new Set<string>();

    for (const row of this.documentData.tableRows) {
      const cleaningRow = row as CleaningRow;
      for (const p of cleaningRow.personnel) {
        const trimmed = p.trim();
        if (trimmed && trimmed !== 'المتوفر' && trimmed !== '-') {
          personnelSet.add(trimmed);
        }
      }
    }

    return Array.from(personnelSet).sort();
  }

  private extractPrayerPersonnel(): string[] {
    if (!this.documentData) return [];

    const personnelSet = new Set<string>();

    for (const row of this.documentData.tableRows) {
      const prayerRow = row as PrayerRow;

      for (const name of prayerRow.opening.split(' ')) {
        if (name.trim() && name.trim() !== 'المتوفر') {
          personnelSet.add(name.trim());
        }
      }

      if (prayerRow.zuhr.imam && prayerRow.zuhr.imam !== 'المتوفر') {
        personnelSet.add(prayerRow.zuhr.imam);
      }
      if (prayerRow.zuhr.muezzin && prayerRow.zuhr.muezzin !== 'المتوفر') {
        personnelSet.add(prayerRow.zuhr.muezzin);
      }

      if (prayerRow.asr.imam && prayerRow.asr.imam !== 'المتوفر') {
        personnelSet.add(prayerRow.asr.imam);
      }
      if (prayerRow.asr.muezzin && prayerRow.asr.muezzin !== 'المتوفر') {
        personnelSet.add(prayerRow.asr.muezzin);
      }

      for (const name of prayerRow.closing.split(' ')) {
        if (name.trim() && name.trim() !== 'المتوفر') {
          personnelSet.add(name.trim());
        }
      }
    }

    return Array.from(personnelSet).sort();
  }

  private filterRowsForPerson(personName: string): CleaningRow[] {
    if (!this.documentData) return [];

    return (this.documentData.tableRows as CleaningRow[])
      .filter(row => row.personnel.includes(personName))
      .map(row => {
        const personIdx = row.personnel.indexOf(personName);
        let personTasks: string[];
        if (personIdx >= 0 && row.tasks.length === row.personnel.length) {
          personTasks = [row.tasks[personIdx]];
        } else {
          personTasks = row.tasks.filter(t => t.trim() !== '');
        }
        return {
          day: row.day,
          date: row.date,
          personnel: row.personnel,
          tasks: personTasks
        };
      }) as CleaningRow[];
  }

  private filterPrayerRowsForPerson(personName: string): PrayerRow[] {
    if (!this.documentData) return [];

    return (this.documentData.tableRows as PrayerRow[])
      .filter(row => {
        const openingNames = row.opening.split(' ').map(n => n.trim());
        const closingNames = row.closing.split(' ').map(n => n.trim());

        return (
          openingNames.includes(personName) ||
          closingNames.includes(personName) ||
          row.zuhr.imam === personName ||
          row.zuhr.muezzin === personName ||
          row.asr.imam === personName ||
          row.asr.muezzin === personName
        );
      })
      .map(row => ({
        day: row.day,
        date: row.date,
        opening: row.opening,
        zuhr: row.zuhr,
        asr: row.asr,
        closing: row.closing
      }));
  }

  private renderPrayerIndividualProgram(personName: string, rows: PrayerRow[]): string {
    if (!this.documentData) return '';
    const header = this.documentData.header;

    return `
      <div class="a4-page">
        <div class="doc-header">
          <div class="doc-logo">
            <svg width="50" height="50" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="60" height="60" rx="8" fill="#243245"/>
              <path d="M42.7626 50.8839V54.9995H27.8633V29.8248C27.8633 25.9693 29.2212 22.3202 31.677 19.5207C33.0075 17.9981 34.5719 16.695 36.3558 15.6104C37.289 16.6258 38.1804 17.7237 38.9345 18.8764C37.3164 19.7952 35.9167 20.9205 34.764 22.251C32.9669 24.282 31.9789 26.9704 31.9789 29.8248V50.8839H42.7626Z" fill="#0DE9C3"/>
              <path d="M44.6279 54.9999H40.5123V23.4434C40.5123 22.2179 40.208 21.033 39.6328 20.0175C37.053 15.4603 32.1961 11.581 30.0007 9.97362C27.8051 11.5846 22.9389 15.4735 20.3662 20.0175C19.791 21.033 19.4867 22.2179 19.4867 23.4434V54.9999H15.3711V23.4434C15.3711 21.5079 15.8603 19.6225 16.7839 17.9889C20.6561 11.1502 28.5401 5.95344 28.873 5.73506L29.9983 5L31.1236 5.73506C31.4577 5.95224 39.3405 11.1502 43.2127 17.9889C44.1375 19.6213 44.6255 21.5079 44.6255 23.4434V54.9999H44.6279Z" fill="white"/>
            </svg>
          </div>
          <div class="doc-title">
            <h1>${this.escapeHtml(header.title)} - ${this.escapeHtml(personName)}</h1>
            <p>${this.escapeHtml(header.subtitle)}</p>
          </div>
          <div class="doc-version">${this.escapeHtml(header.version)}</div>
        </div>
        <div class="info-box">
          <h2>جدول مهام ${this.escapeHtml(personName)}</h2>
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
            ${rows.map(row => `
              <tr>
                <td class="date-cell">
                  ${row.day ? `<div class="day">${this.escapeHtml(row.day)}</div>` : ''}
                  ${row.date ? `<div class="date">${this.escapeHtml(row.date)}</div>` : ''}
                </td>
                <td>${this.highlightPerson(row.opening, personName)}</td>
                <td>${this.renderPrayerDuty(row.zuhr, personName)}</td>
                <td>${this.renderPrayerDuty(row.asr, personName)}</td>
                <td>${this.highlightPerson(row.closing, personName)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  private highlightPerson(cell: string, personName: string): string {
    const names = cell.split(' ').map(n => n.trim()).filter(Boolean);
    const isAssigned = names.includes(personName);
    const displayHtml = names.length > 0 ? names.join('، ') : '-';
    return isAssigned ? `<strong style="color: var(--primary);">${displayHtml}</strong>` : displayHtml;
  }

  private renderPrayerDuty(slot: { imam: string; muezzin: string }, personName: string): string {
    const parts: string[] = [];
    if (slot.imam === personName) {
      parts.push(`<strong style="color: var(--primary);">الإمام: ${this.escapeHtml(slot.imam)}</strong>`);
    } else if (slot.imam) {
      parts.push(`الإمام: ${this.escapeHtml(slot.imam)}`);
    }

    if (slot.muezzin === personName) {
      parts.push(`<strong style="color: var(--secondary);">المؤذن: ${this.escapeHtml(slot.muezzin)}</strong>`);
    } else if (slot.muezzin) {
      parts.push(`المؤذن: ${this.escapeHtml(slot.muezzin)}`);
    }

    return parts.length > 0 ? parts.join('<br>') : '-';
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  handleFileImport(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.csv')) {
      this.parseCSV(file);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
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
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
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
          const rows = (jsonData as object[]).map(row => headers.map(h => (row as Record<string, unknown>)[h] as string));
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
    } catch (error) {
      alert('حدث خطأ غير متوقع');
      console.error('Excel parse error:', error);
    }
  }

  private processImportedData(data: string[][]): void {
    if (!this.documentData || !this.currentDocType || data.length < 2) {
      alert('الملف فارغ أو غير صالح');
      return;
    }

    const headers = data[0].map(h => h.trim().toLowerCase());
    const rows = data.slice(1).filter(row => row.some(cell => cell.trim()));

    if (this.currentDocType === 'cleaning') {
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

    const tableRows: CleaningRow[] = rows.map(row => ({
      day: dayIdx >= 0 ? row[dayIdx]?.trim() || '' : '',
      date: dateIdx >= 0 ? row[dateIdx]?.trim() || '' : '',
      personnel: personnelIdx >= 0 ? row[personnelIdx]?.split(/[,،\n\r]+/).map(p => p.trim()).filter(Boolean) || [] : [],
      tasks: tasksIdx >= 0 ? row[tasksIdx]?.split(/[,،\n\r]+/).map(t => t.trim()).filter(Boolean) || [] : []
    })).filter(row => row.day || row.date || row.personnel.length || row.tasks.length);

    if (tableRows.length > 0 && this.documentData) {
      this.documentData.tableRows = tableRows;
      const hasDates = tableRows.some(r => r.date && r.date.trim());
      (this.documentData as { planningMode: PlanningMode }).planningMode = hasDates ? 'period' : 'weekly';
    }
  }

  private importPrayerData(rows: string[][]): void {
    const tableRows: PrayerRow[] = rows.map(row => {
      const dayDateCell = row[0]?.trim() || '';
      const openingCell = row[1]?.trim() || '';
      const zuhrCell = row[2]?.trim() || '';
      const asrCell = row[3]?.trim() || '';
      const closingCell = row[4]?.trim() || '';

      const { day, date } = this.parseDayDate(dayDateCell);
      const opening = this.parseSimpleNames(openingCell);
      const closing = this.parseSimpleNames(closingCell);
      const zuhr = this.parsePrayerSlot(zuhrCell);
      const asr = this.parsePrayerSlot(asrCell);

      return {
        day,
        date,
        opening,
        zuhr,
        asr,
        closing
      };
    }).filter(row => row.day || row.date || row.opening || row.closing || row.zuhr.imam || row.zuhr.muezzin || row.asr.imam || row.asr.muezzin);

    if (tableRows.length > 0 && this.documentData) {
      this.documentData.tableRows = tableRows;
    }
  }

  private parseDayDate(cell: string): { day: string; date: string } {
    const match = cell.match(/^([^\d]+)\s*(\d+\s+\w+)?$/);
    if (match) {
      return {
        day: match[1]?.trim() || '',
        date: match[2]?.trim() || ''
      };
    }
    return { day: cell, date: '' };
  }

  private parseSimpleNames(cell: string): string {
    if (!cell) return '';
    return cell.split(/\s+/).filter(name => name.trim()).join(' ');
  }

  private parsePrayerSlot(cell: string): { imam: string; muezzin: string } {
    const result = { imam: '', muezzin: '' };

    if (!cell) return result;

    // Handle formats:
    // "الإمام: بوفيس, المؤذن: نمري" (comma separator)
    // "الإمام: بوفيس المؤذن: نمري" (space separator)
    // "الإمام : بوفيس المؤذن : نمري"

    // Try comma format first
    const commaFormat = cell.match(/الإمام\s*:\s*([^,]+)\s*,?\s*المؤذن\s*:\s*(.+)/);
    if (commaFormat) {
      result.imam = commaFormat[1]?.trim() || '';
      result.muezzin = commaFormat[2]?.trim() || '';
      return result;
    }

    // Fallback to original format
    const imamMatch = cell.match(/الإمام\s*:\s*([^\nالمؤذن]+)/);
    const muezzinMatch = cell.match(/المؤذن\s*:\s*([^\n]+)/);

    if (imamMatch) {
      result.imam = imamMatch[1]?.trim() || '';
    }
    if (muezzinMatch) {
      result.muezzin = muezzinMatch[1]?.trim() || '';
    }

    return result;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private renderIndividualProgram(personName: string, rows: CleaningRow[], mode?: PlanningMode): string {
    if (!this.documentData) return '';
    const header = this.documentData.header;

    return `
      <div class="a4-page">
        <div class="doc-header">
          <div class="doc-logo">
            <svg width="50" height="50" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="60" height="60" rx="8" fill="#243245"/>
              <path d="M42.7626 50.8839V54.9995H27.8633V29.8248C27.8633 25.9693 29.2212 22.3202 31.677 19.5207C33.0075 17.9981 34.5719 16.695 36.3558 15.6104C37.289 16.6258 38.1804 17.7237 38.9345 18.8764C37.3164 19.7952 35.9167 20.9205 34.764 22.251C32.9669 24.282 31.9789 26.9704 31.9789 29.8248V50.8839H42.7626Z" fill="#0DE9C3"/>
              <path d="M44.6279 54.9999H40.5123V23.4434C40.5123 22.2179 40.208 21.033 39.6328 20.0175C37.053 15.4603 32.1961 11.581 30.0007 9.97362C27.8051 11.5846 22.9389 15.4735 20.3662 20.0175C19.791 21.033 19.4867 22.2179 19.4867 23.4434V54.9999H15.3711V23.4434C15.3711 21.5079 15.8603 19.6225 16.7839 17.9889C20.6561 11.1502 28.5401 5.95344 28.873 5.73506L29.9983 5L31.1236 5.73506C31.4577 5.95224 39.3405 11.1502 43.2127 17.9889C44.1375 19.6213 44.6255 21.5079 44.6255 23.4434V54.9999H44.6279Z" fill="white"/>
            </svg>
          </div>
          <div class="doc-title">
            <h1>${this.escapeHtml(header.title)} - ${this.escapeHtml(personName)}</h1>
            <p>${this.escapeHtml(header.subtitle)}</p>
          </div>
          <div class="doc-version">${this.escapeHtml(header.version)}</div>
        </div>
        <div class="info-box">
          <h2>جدول مهام ${this.escapeHtml(personName)}</h2>
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
            ${rows.map(row => `
              <tr>
                <td class="date-cell">
                  ${row.day ? `<div class="day">${this.escapeHtml(row.day)}</div>` : ''}
                  ${row.date && mode !== 'weekly' ? `<div class="date">${this.escapeHtml(row.date)}</div>` : ''}
                </td>
                <td>
                  ${row.tasks.length > 0 ? `
                    <div class="task-list">
                      ${row.tasks.map(t => `<div class="task-item">${this.escapeHtml(t)}</div>`).join('')}
                    </div>
                  ` : '-'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
}

declare global {
  interface Window {
    app: App;
  }
}