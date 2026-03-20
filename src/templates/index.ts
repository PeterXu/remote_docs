// src/templates/index.ts
import type { PDFTemplate } from '../types';
import { baseTemplate } from './base';
import { githubTemplate } from './github';
import { examTemplate } from './exam';

export const templates: Record<string, PDFTemplate> = {
  base: baseTemplate,
  github: githubTemplate,
  exam: examTemplate,
};

export function getTemplate(id: string): PDFTemplate | null {
  return templates[id] || null;
}

export function getTemplateList(): Array<{ id: string; name: string; description: string }> {
  return Object.values(templates).map(({ id, name, description }) => ({
    id,
    name,
    description,
  }));
}

export { baseTemplate, githubTemplate, examTemplate };
