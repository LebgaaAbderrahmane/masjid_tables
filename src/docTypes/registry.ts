import type {
  CircleCell,
  CircleColumn,
  CircleRow,
  CirclesDocument,
  CleaningDocument,
  CleaningRow,
  DocumentData,
  DocumentType,
  PlanningMode,
  PrayerDocument,
  PrayerRow,
  TableRow
} from '../types';
import { FRIDAY, WEEKDAYS_ALL, WEEKDAYS_NO_FRIDAY } from '../constants/days';

/** Sidebar/preview capabilities. Anything not enabled is never rendered. */
export interface DocFeatures {
  /** Members panel + per-person preview. */
  members: boolean;
  /** Excel/CSV import button. */
  import: boolean;
  /** Per-person ZIP export button. */
  individualExport: boolean;
}

export interface DocTypeConfig {
  id: DocumentType;
  /** Document title, used as the type-card heading and the default header title. */
  label: string;
  /** Sidebar heading, e.g. "محرر برنامج النظافة". */
  editorTitle: string;
  /** Class applied to the A4 page wrapper so each program is visually distinct. */
  pageClass: string;
  features: DocFeatures;
  /** Weekdays offered as checkboxes in weekly mode. */
  weekdays: readonly string[];
  /** `Date.getDay()` indices skipped by the date-range generator. */
  excludedWeekdays: readonly number[];
  makeDefaultDocument(): DocumentData;
  /** An empty table row shaped for this document type. */
  makeEmptyRow(doc: DocumentData): TableRow;
  /** Whether a row holds real content (used before destructive deletes). */
  rowHasContent(row: TableRow): boolean;
}

export const DEFAULT_CIRCLE_COLUMN_TITLES: readonly string[] = [
  'درس قبل الظهر بـ 15 دقيقة',
  'حلقة بعد العصر 40 دقيقة',
  'محاضرات عن بُعد (بعد العشاء)'
];

export function createColumnId(): string {
  return `col_${Math.random().toString(36).slice(2, 9)}`;
}

export function createCell(): CircleCell {
  return { lesson: '', person: '' };
}

export function createCells(columns: readonly CircleColumn[]): Record<string, CircleCell> {
  return Object.fromEntries(columns.map(column => [column.id, createCell()]));
}

export function createDefaultColumns(): CircleColumn[] {
  return DEFAULT_CIRCLE_COLUMN_TITLES.map(title => ({ id: createColumnId(), title }));
}

/**
 * Aligns a row with the current column set: adds missing cells and drops cells
 * whose column no longer exists, so stale ids never resurface in the preview.
 */
export function syncRowCells(row: CircleRow, columns: readonly CircleColumn[]): void {
  if (!row.cells || typeof row.cells !== 'object') {
    row.cells = {};
  }

  const liveIds = new Set(columns.map(column => column.id));

  for (const id of Object.keys(row.cells)) {
    if (!liveIds.has(id)) {
      delete row.cells[id];
    }
  }

  for (const column of columns) {
    if (!row.cells[column.id]) {
      row.cells[column.id] = createCell();
    }
  }
}

function cellHasContent(row: CircleRow, columnIds: readonly string[]): boolean {
  return columnIds.some(id => {
    const cell = row.cells?.[id];
    return Boolean(cell && (cell.lesson.trim() || cell.person.trim()));
  });
}

export function isCircleRow(row: TableRow): row is CircleRow {
  return typeof (row as CircleRow).cells === 'object' && (row as CircleRow).cells !== null;
}

const cleaningConfig: DocTypeConfig = {
  id: 'cleaning',
  label: 'برنامج النظافة',
  editorTitle: 'محرر برنامج النظافة',
  pageClass: 'cleaning-page',
  features: { members: true, import: true, individualExport: true },
  weekdays: WEEKDAYS_NO_FRIDAY,
  excludedWeekdays: [FRIDAY],
  makeDefaultDocument(): CleaningDocument {
    return {
      type: 'cleaning',
      header: {
        title: 'برنامج النظافة',
        subtitle: 'جدول توزيع مهام النظافة اليومية',
        version: '1.0'
      },
      infoBox: {
        title: 'جدول توزيع مهام النظافة',
        period: '',
        responsible: 'إدارة المسجد'
      },
      tableRows: [
        {
          day: 'السبت',
          date: '',
          personnel: [],
          tasks: []
        } satisfies CleaningRow
      ],
      footerNotes: [
        {
          title: 'ملاحظة مهمة',
          content:
            'يرجى من جميع المعنيين الالتزام بالمهام الموكلة إليهم لضمان نظافة المصلى. في حال التعذر، يرجى التنسيق المسبق.',
          isVerse: false
        }
      ],
      planningMode: 'period' satisfies PlanningMode
    };
  },
  makeEmptyRow(): CleaningRow {
    return { day: '', date: '', personnel: [], tasks: [] };
  },
  rowHasContent(row): boolean {
    const cleaning = row as CleaningRow;
    return cleaning.personnel.length > 0 || cleaning.tasks.length > 0;
  }
};

const prayerConfig: DocTypeConfig = {
  id: 'prayer',
  label: 'برنامج الصلاة',
  editorTitle: 'محرر برنامج الصلاة',
  pageClass: 'prayer-page',
  features: { members: true, import: true, individualExport: true },
  weekdays: WEEKDAYS_NO_FRIDAY,
  excludedWeekdays: [FRIDAY],
  makeDefaultDocument(): PrayerDocument {
    return {
      type: 'prayer',
      header: {
        title: 'برنامج الصلاة',
        subtitle: 'جدول توزيع المهام اليومية',
        version: '1.0'
      },
      infoBox: {
        title: 'أوقات الإقامة',
        zuhr: 'مباشرة',
        asr: '5 دقائق',
        maghrib: ''
      },
      tableRows: [
        {
          day: 'الأحد',
          date: '',
          opening: '',
          zuhr: { imam: '', muezzin: '' },
          asr: { imam: '', muezzin: '' },
          maghrib: { imam: '', muezzin: '' },
          closing: ''
        } satisfies PrayerRow
      ],
      showMaghrib: false,
      footerNotes: [
        {
          title: 'ملاحظة مهمة',
          content:
            'يرجى الالتزام بالتواجد قبل وقت الصلاة ب 10 دقائق على الأقل. في حالة عدم القدرة على الحضور، يرجى التواصل مع المسؤول لتحديد بديل.',
          isVerse: false
        }
      ],
      planningMode: 'period' satisfies PlanningMode
    };
  },
  makeEmptyRow(): PrayerRow {
    return {
      day: '',
      date: '',
      opening: '',
      zuhr: { imam: '', muezzin: '' },
      asr: { imam: '', muezzin: '' },
      maghrib: { imam: '', muezzin: '' },
      closing: ''
    };
  },
  rowHasContent(row): boolean {
    const prayer = row as PrayerRow;
    return Boolean(
      prayer.opening ||
        prayer.closing ||
        prayer.zuhr?.imam ||
        prayer.zuhr?.muezzin ||
        prayer.asr?.imam ||
        prayer.asr?.muezzin ||
        prayer.maghrib?.imam ||
        prayer.maghrib?.muezzin
    );
  }
};

const circlesConfig: DocTypeConfig = {
  id: 'circles',
  label: 'الحلقات العلمية',
  editorTitle: 'محرر الحلقات العلمية',
  pageClass: 'circles-page',
  features: { members: false, import: false, individualExport: false },
  weekdays: WEEKDAYS_ALL,
  excludedWeekdays: [],
  makeDefaultDocument(): CirclesDocument {
    const columns = createDefaultColumns();
    return {
      type: 'circles',
      header: {
        title: 'برنامج الحلقات العلمية',
        subtitle: 'جدول توزيع الحصص والدروس',
        version: '1.0'
      },
      infoBox: {
        title: 'الحلقات العلمية',
        supervisor: '',
        location: ''
      },
      columns,
      tableRows: [
        {
          day: 'الأحد',
          date: '',
          cells: createCells(columns)
        } satisfies CircleRow
      ],
      footerNotes: [
        {
          title: 'ملاحظة مهمة',
          content:
            'يُرجى من المحاضرين الحضور قبل بداية الحصة بوقت كافٍ، وفي حال التعذر يُرجى التنسيق المسبق مع المشرف.',
          isVerse: false
        }
      ],
      planningMode: 'period' satisfies PlanningMode
    };
  },
  makeEmptyRow(doc): CircleRow {
    const columns = (doc as CirclesDocument).columns ?? [];
    return { day: '', date: '', cells: createCells(columns) };
  },
  rowHasContent(row): boolean {
    const circle = row as CircleRow;
    const ids = Object.keys(circle.cells ?? {});
    return cellHasContent(circle, ids);
  }
};

const REGISTRY: Record<DocumentType, DocTypeConfig> = {
  cleaning: cleaningConfig,
  prayer: prayerConfig,
  circles: circlesConfig
};

export function getDocTypeConfig(type: DocumentType): DocTypeConfig {
  return REGISTRY[type];
}

export function isDocType(value: string): value is DocumentType {
  return value in REGISTRY;
}
