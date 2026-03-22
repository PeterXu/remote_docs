// src/types/index.ts
export interface User {
  id: string;
  email: string;
}

/** 文档配置（内容相关） */
export interface PDFConfig {
  /** 主标题（显示在文档开头） */
  caption?: string;
  /** 副标题 */
  subtitle?: string;
  /** 版权信息（页脚显示） */
  copyright?: string;
  /** 作者 */
  author?: string;
  /** 日期（默认 YYYY-MM-DD） */
  date?: string;
}

/** 文档内容项 */
export type DocumentItem = string;

/** 水印配置 */
export interface WatermarkConfig {
  /** 水印文字，如"内部资料""绝密"等 */
  text: string;
  /** 透明度 0-1（默认 0.1） */
  opacity?: number;
  /** 颜色（默认 "#999"） */
  color?: string;
  /** 字号（默认 "48px"） */
  fontSize?: string;
  /** 旋转角度，度数（默认 -30） */
  angle?: number;
  /** 密度（默认 "normal"） */
  density?: 'sparse' | 'normal' | 'dense';
}

/** 页面边距 */
export interface PageMargin {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
}

/** PDF 选项 */
export interface PDFOptions {
  /** 纸张格式 */
  format?: 'A4' | 'Letter';
  /** 页边距 */
  margin?: PageMargin;
  /** 是否显示页码（默认 true） */
  showPageNumber?: boolean;
  /** 页码格式，支持 {page} 和 {total} 占位符（默认 "{page}"） */
  pageNumberFormat?: string;
  /** 水印配置 */
  watermark?: WatermarkConfig;
  /** CSS 变量覆盖，如 { "font-size-body": "16px" } */
  cssVars?: Record<string, string>;
}

export interface MultiPDFExportRequest {
  /** 文档配置 */
  config?: PDFConfig;
  /** 文档内容数组 */
  documents: DocumentItem[];
  /** 模板 ID */
  template?: 'base' | 'github' | 'exam';
  /** PDF 选项 */
  options?: PDFOptions;
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
