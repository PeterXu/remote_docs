// src/types/index.ts
export interface User {
  id: string;
  email: string;
}

export interface DocumentSection {
  title?: string;
  markdown: string;
}

export interface MultiPDFExportRequest {
  documents: DocumentSection[];
  template?: 'base' | 'github' | 'exam';
  options?: PDFOptions;
}

export interface PDFOptions {
  format?: 'A4' | 'Letter';
  margin?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
  /** CSS variables to override template defaults, e.g. { "font-size-body": "16px" } */
  cssVars?: Record<string, string>;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export interface PDFTemplate {
  id: string;
  name: string;
  description: string;
  css: string;
  header?: string;
  footer?: string;
}

export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  services: {
    gotenberg: 'ok' | 'error';
  };
}
