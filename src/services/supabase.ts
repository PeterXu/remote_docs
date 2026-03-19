// src/services/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseInstance;
}

export async function uploadPDF(
  userId: string,
  exportId: string,
  pdfBuffer: Buffer
): Promise<string> {
  const client = getSupabase();
  const path = `${userId}/${exportId}.pdf`;

  const { error } = await client.storage
    .from('pdf-exports')
    .upload(path, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  return path;
}

export async function updateExportStatus(
  exportId: string,
  status: 'completed' | 'failed',
  storagePath?: string,
  errorMessage?: string
): Promise<void> {
  const client = getSupabase();

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'completed' && storagePath) {
    updateData.storage_path = storagePath;
    updateData.completed_at = new Date().toISOString();
  }

  if (status === 'failed' && errorMessage) {
    updateData.error_message = errorMessage;
  }

  const { error } = await client
    .from('pdf_export')
    .update(updateData)
    .eq('id', exportId);

  if (error) {
    throw new Error(`Database update failed: ${error.message}`);
  }
}

export async function checkSupabaseHealth(): Promise<boolean> {
  try {
    const client = getSupabase();
    const { error } = await client.from('pdf_export').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}
