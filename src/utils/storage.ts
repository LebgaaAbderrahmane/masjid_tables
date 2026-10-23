import type { CircleRow, CirclesDocument, DocumentData, DocumentType, PlanningMode } from '../types';
import { createDefaultColumns, isDocType, syncRowCells } from '../docTypes/registry';

const TYPE_KEY = 'documentType';
const DATA_KEY_PREFIX = 'document_';

export function getSavedDocumentType(): DocumentType | null {
  const saved = localStorage.getItem(TYPE_KEY);
  return saved !== null && isDocType(saved) ? saved : null;
}

export function saveDocumentType(type: DocumentType): void {
  localStorage.setItem(TYPE_KEY, type);
}

export function getSavedDocumentData(type: DocumentType): DocumentData | null {
  const saved = localStorage.getItem(DATA_KEY_PREFIX + type);
  if (!saved) return null;
  try {
    return migrate(JSON.parse(saved) as DocumentData, type);
  } catch {
    return null;
  }
}

export function saveDocumentData(type: DocumentType, data: DocumentData): void {
  localStorage.setItem(DATA_KEY_PREFIX + type, JSON.stringify(data));
}

export function clearDocumentData(type: DocumentType): void {
  localStorage.removeItem(DATA_KEY_PREFIX + type);
}

/**
 * Brings persisted data up to the current shape.
 *
 * Documents saved before the `type` discriminant existed have no such field, so
 * it is stamped from the requested type here — this is also the single place
 * that fills in defaults for data written by older versions.
 */
function migrate(parsed: DocumentData, type: DocumentType): DocumentData {
  const doc = { ...parsed, type } as DocumentData & { planningMode?: PlanningMode };

  doc.planningMode ??= 'period';

  if (!Array.isArray(doc.tableRows)) doc.tableRows = [];

  // Very old payloads predate some fields the renderers assume are present and
  // are strings, so fill them in here rather than guarding every call site.
  doc.header = normaliseHeader(doc.header);
  doc.footerNotes = normaliseFooterNotes(doc.footerNotes);
  doc.infoBox = normaliseInfoBox(doc.infoBox, type);

  if (type === 'circles') {
    const circles = doc as unknown as CirclesDocument;
    if (!Array.isArray(circles.columns) || circles.columns.length === 0) {
      circles.columns = createDefaultColumns();
    }
    for (const row of circles.tableRows as CircleRow[]) {
      syncRowCells(row, circles.columns);
    }
  }

  return doc;
}

/**
 * Very old payloads predate some fields the renderers assume are present and
 * are strings, so coerce them here rather than guarding every call site.
 */
function normaliseHeader(header: DocumentData['header']): DocumentData['header'] {
  const h = (header && typeof header === 'object' ? header : {}) as Record<string, unknown>;
  const str = (key: string): string => (typeof h[key] === 'string' ? (h[key] as string) : '');
  return { title: str('title'), subtitle: str('subtitle'), version: str('version') };
}

function normaliseFooterNotes(notes: DocumentData['footerNotes']): DocumentData['footerNotes'] {
  if (!Array.isArray(notes)) return [];
  return notes.map(note => {
    const n = (note && typeof note === 'object' ? note : {}) as Record<string, unknown>;
    const str = (key: string): string => (typeof n[key] === 'string' ? (n[key] as string) : '');
    return { title: str('title'), content: str('content'), isVerse: n.isVerse === true };
  });
}

/**
 * Each program type has its own info-box shape, so the missing fields are
 * filled in per type rather than guessed from whatever keys happen to be there.
 */
function normaliseInfoBox(
  infoBox: DocumentData['infoBox'],
  type: DocumentType
): DocumentData['infoBox'] {
  const raw = (infoBox && typeof infoBox === 'object' ? infoBox : {}) as Record<string, unknown>;
  const title = typeof raw.title === 'string' ? raw.title : '';
  const str = (key: string): string => (typeof raw[key] === 'string' ? (raw[key] as string) : '');

  switch (type) {
    case 'cleaning':
      return { title, period: str('period'), responsible: str('responsible') };
    case 'prayer':
      return { title, zuhr: str('zuhr'), asr: str('asr'), maghrib: str('maghrib') };
    case 'circles':
      return { title, supervisor: str('supervisor'), location: str('location') };
  }
}
