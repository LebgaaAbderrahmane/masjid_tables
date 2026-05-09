import type { DocumentType, DocumentData } from '../types';

const TYPE_KEY = 'documentType';
const DATA_KEY_PREFIX = 'document_';

export function getSavedDocumentType(): DocumentType | null {
  const saved = localStorage.getItem(TYPE_KEY);
  if (saved === 'cleaning' || saved === 'prayer') {
    return saved;
  }
  return null;
}

export function saveDocumentType(type: DocumentType): void {
  localStorage.setItem(TYPE_KEY, type);
}

export function getSavedDocumentData(type: DocumentType): DocumentData | null {
  const key = DATA_KEY_PREFIX + type;
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      return JSON.parse(saved) as DocumentData;
    } catch {
      return null;
    }
  }
  return null;
}

export function saveDocumentData(type: DocumentType, data: DocumentData): void {
  const key = DATA_KEY_PREFIX + type;
  localStorage.setItem(key, JSON.stringify(data));
}

export function clearDocumentData(type: DocumentType): void {
  const key = DATA_KEY_PREFIX + type;
  localStorage.removeItem(key);
}