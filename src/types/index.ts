export type DocumentType = 'cleaning' | 'prayer';
export type CleaningMode = 'period' | 'weekly';

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

export type InfoBoxData = CleaningInfoBox | PrayerInfoBox;

export interface CleaningRow {
  day: string;
  date: string;
  personnel: string[];
  tasks: string[];
}

export interface PersonnelTask {
  day: string;
  date: string;
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

export type TableRow = CleaningRow | PrayerRow;

export interface FooterNote {
  title: string;
  content: string;
  isVerse: boolean;
}

export interface DocumentData {
  header: HeaderData;
  infoBox: InfoBoxData;
  tableRows: TableRow[];
  footerNotes: FooterNote[];
  cleaningMode?: CleaningMode;
}

export interface NoteTemplate {
  title: string;
  content: string;
  isVerse: boolean;
}