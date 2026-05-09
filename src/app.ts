import type { DocumentType, DocumentData, CleaningRow, PrayerRow } from './types';
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
      ]
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
      ]
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
    (row[field] as string[]) = value.split('\n').filter(x => x.trim());
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

    const headerSection = document.getElementById('headerSection');
    if (headerSection) {
      headerSection.innerHTML = renderHeaderEditor(this.documentData.header, () => this.renderPreview());
    }

    const infoBoxFields = document.getElementById('infoBoxFields');
    if (infoBoxFields) {
      infoBoxFields.innerHTML = renderInfoBoxEditor(this.currentDocType, this.documentData.infoBox, () => this.renderPreview());
    }

    const tableRowsEditor = document.getElementById('tableRowsEditor');
    if (tableRowsEditor) {
      tableRowsEditor.innerHTML = renderTableRowsEditor(this.currentDocType, this.documentData.tableRows, () => this.renderPreview());
    }

    const footerNotesEditor = document.getElementById('footerNotesEditor');
    if (footerNotesEditor) {
      footerNotesEditor.innerHTML = renderFooterNotesEditor(this.documentData.footerNotes, () => this.renderPreview());
    }
  }

  private renderPreview(): void {
    if (!this.documentData || !this.currentDocType) return;

    const page = document.getElementById('previewPage');
    if (!page) return;

    let html = renderDocHeader(this.documentData.header);
    html += renderInfoBox(this.currentDocType, this.documentData.infoBox);
    html += renderTable(this.currentDocType, this.documentData.tableRows);
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
    const page = document.getElementById('previewPage');
    if (!page) return;

    const canvas = await html2canvas(page, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${this.documentData?.header.title || 'document'}.pdf`);
  }

  async exportToImage(): Promise<void> {
    const page = document.getElementById('previewPage');
    if (!page) return;

    const canvas = await html2canvas(page, { scale: 2 });
    const link = document.createElement('a');
    link.download = `${this.documentData?.header.title || 'document'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
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
        this.processImportedData(results.data);
      }
    });
  }

  private parseExcel(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      if (!data) return;

      const workbook = window.XLSX.read(data, { type: 'binary' });
      const firstSheet = workbook.SheetNames[0];
      const jsonData = window.XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);

      const headers = Object.keys(jsonData[0] as object);
      const rows = (jsonData as object[]).map(row => headers.map(h => (row as Record<string, unknown>)[h] as string));
      this.processImportedData([headers, ...rows]);
    };
    reader.readAsBinaryString(file);
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
      this.importPrayerData(headers, rows);
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
      personnel: personnelIdx >= 0 ? row[personnelIdx]?.split(/[,،]/).map(p => p.trim()).filter(Boolean) || [] : [],
      tasks: tasksIdx >= 0 ? row[tasksIdx]?.split(/[,،]/).map(t => t.trim()).filter(Boolean) || [] : []
    })).filter(row => row.day || row.date || row.personnel.length || row.tasks.length);

    if (tableRows.length > 0 && this.documentData) {
      this.documentData.tableRows = tableRows;
    }
  }

  private importPrayerData(headers: string[], rows: string[][]): void {
    const dayIdx = headers.findIndex(h => h.includes('يوم') || h.includes('day'));
    const dateIdx = headers.findIndex(h => h.includes('تاريخ') || h.includes('date'));
    const openingIdx = headers.findIndex(h => h.includes('فتح') || h.includes('opening'));
    const closingIdx = headers.findIndex(h => h.includes('غلق') || h.includes('close'));
    const zuhrImamIdx = headers.findIndex(h => h.includes('ظهر') && h.includes('امام') || h.includes('zuhr') && h.includes('imam'));
    const zuhrMuezzinIdx = headers.findIndex(h => h.includes('ظهر') && h.includes('اذان') || h.includes('zuhr') && h.includes('muezzin'));
    const asrImamIdx = headers.findIndex(h => h.includes('عصر') && h.includes('امام') || h.includes('asr') && h.includes('imam'));
    const asrMuezzinIdx = headers.findIndex(h => h.includes('عصر') && h.includes('اذان') || h.includes('asr') && h.includes('muezzin'));

    const tableRows: PrayerRow[] = rows.map(row => ({
      day: dayIdx >= 0 ? row[dayIdx]?.trim() || '' : '',
      date: dateIdx >= 0 ? row[dateIdx]?.trim() || '' : '',
      opening: openingIdx >= 0 ? row[openingIdx]?.trim() || '' : '',
      closing: closingIdx >= 0 ? row[closingIdx]?.trim() || '' : '',
      zuhr: {
        imam: zuhrImamIdx >= 0 ? row[zuhrImamIdx]?.trim() || '' : '',
        muezzin: zuhrMuezzinIdx >= 0 ? row[zuhrMuezzinIdx]?.trim() || '' : ''
      },
      asr: {
        imam: asrImamIdx >= 0 ? row[asrImamIdx]?.trim() || '' : '',
        muezzin: asrMuezzinIdx >= 0 ? row[asrMuezzinIdx]?.trim() || '' : ''
      }
    })).filter(row => row.day || row.date || row.opening || row.closing || row.zuhr.imam || row.zuhr.muezzin || row.asr.imam || row.asr.muezzin);

    if (tableRows.length > 0 && this.documentData) {
      this.documentData.tableRows = tableRows;
    }
  }
}

declare global {
  interface Window {
    app: App;
  }
}