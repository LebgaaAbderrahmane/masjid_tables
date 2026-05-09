/// <reference types="vite/client" />

interface Html2CanvasOptions {
  scale?: number;
  useCORS?: boolean;
  logging?: boolean;
  backgroundColor?: string | null;
}

interface Html2Canvas {
  (element: HTMLElement, options?: Html2CanvasOptions): Promise<HTMLCanvasElement>;
}

declare const html2canvas: Html2Canvas;

interface JsPDFDocument {
  addImage: (imageData: string, format: string, x: number, y: number, width: number, height: number) => void;
  save: (filename: string) => void;
  output: (type: string, options?: unknown) => Blob | string;
  setFont: (fontName: string, fontStyle?: string) => void;
  setFontSize: (size: number) => void;
  setTextColor: (r: number, g?: number, b?: number) => void;
  text: (text: string, x: number, y: number, options?: unknown) => void;
  setDrawColor: (r: number, g?: number, b?: number) => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
  addPage: () => void;
  internal: {
    pageSize: {
      getWidth: () => number;
      getHeight: () => number;
    };
  };
}

interface JsPDF {
  new (orientation?: 'p' | 'l', unit?: 'mm' | 'pt' | 'in', format?: string): JsPDFDocument;
}

interface Window {
  jspdf: {
    jsPDF: JsPDF;
  };
  XLSX: {
    read: (data: string | ArrayBuffer, options: { type: string }) => { SheetNames: string[]; Sheets: Record<string, unknown> };
    utils: {
      sheet_to_json: (sheet: unknown) => Record<string, unknown>[];
    };
  };
  Papa: {
    parse: <T>(file: File, options: { complete: (results: { data: T[][] }) => void; error?: (error: Error) => void }) => void;
  };
  JSZip: new () => {
    file: (name: string, data: Blob | string) => void;
    generateAsync: (options: { type: string }) => Promise<Blob>;
  };
}