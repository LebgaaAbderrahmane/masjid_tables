export type DocumentType = 'cleaning' | 'prayer' | 'circles';
export type PlanningMode = 'period' | 'weekly';

export interface HeaderData {
  title: string;
  subtitle: string;
  version: string;
}

export interface CleaningInfoBox {
  title: string;
  period: string;
  responsible: string;
}

export interface PrayerInfoBox {
  title: string;
  zuhr: string;
  asr: string;
  maghrib: string;
}

export interface CirclesInfoBox {
  title: string;
  supervisor: string;
  location: string;
}

export type InfoBoxData = CleaningInfoBox | PrayerInfoBox | CirclesInfoBox;

export interface CleaningRow {
  day: string;
  date: string;
  personnel: string[];
  tasks: string[];
}

export interface PrayerTimeSlot {
  imam: string;
  muezzin: string;
}

export interface PrayerRow {
  day: string;
  date: string;
  opening: string;
  zuhr: PrayerTimeSlot;
  asr: PrayerTimeSlot;
  closing: string;
}

/** A user-defined column of the circles table (a session slot). */
export interface CircleColumn {
  id: string;
  title: string;
}

/** The contents of one session slot: what is taught, and by whom. */
export interface CircleCell {
  lesson: string;
  person: string;
}

export interface CircleRow {
  day: string;
  date: string;
  /** Keyed by {@link CircleColumn.id} so reordering/deleting columns never shuffles data. */
  cells: Record<string, CircleCell>;
}

export type TableRow = CleaningRow | PrayerRow | CircleRow;

export interface FooterNote {
  title: string;
  content: string;
  isVerse: boolean;
}

export interface NoteTemplate {
  title: string;
  content: string;
  isVerse: boolean;
}

interface DocumentBase {
  header: HeaderData;
  footerNotes: FooterNote[];
  planningMode?: PlanningMode;
}

export interface CleaningDocument extends DocumentBase {
  type: 'cleaning';
  infoBox: CleaningInfoBox;
  tableRows: CleaningRow[];
}

export interface PrayerDocument extends DocumentBase {
  type: 'prayer';
  infoBox: PrayerInfoBox;
  tableRows: PrayerRow[];
}

export interface CirclesDocument extends DocumentBase {
  type: 'circles';
  infoBox: CirclesInfoBox;
  tableRows: CircleRow[];
  columns: CircleColumn[];
}

export type DocumentData = CleaningDocument | PrayerDocument | CirclesDocument;
