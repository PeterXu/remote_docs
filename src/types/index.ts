// src/types/index.ts
export interface User {
  id: string;
  email: string;
}

export interface PDFExportRequest {
  markdown: string;
  template?: 'base' | 'github' | 'exam';
  export_id: string;
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
}

export interface PDFExportResponse {
  success: boolean;
  data?: {
    export_id: string;
    storage_path: string;
    status: 'completed';
  };
  error?: {
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
    supabase: 'ok' | 'error';
  };
}
