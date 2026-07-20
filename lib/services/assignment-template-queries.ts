import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { ChecklistSchema, type ChecklistItem } from '@/schemas/AssignmentSchema';

export type AssignmentTemplateRow = {
  id: string;
  title: string;
  description: string | null;
  checklist: ChecklistItem[];
  updatedAt: string;
};

type RawTemplate = {
  id: string;
  title: string;
  description: string | null;
  checklist: unknown;
  updated_at: string;
};

const mapTemplate = (row: RawTemplate): AssignmentTemplateRow => ({
  id: row.id,
  title: row.title,
  description: row.description ?? null,
  checklist: ChecklistSchema.safeParse(row.checklist).data ?? [],
  updatedAt: row.updated_at,
});

const SELECT = 'id, title, description, checklist, updated_at';

/** Templates the caller may see (RLS: teacher-own + admin-all), newest first. */
export async function getAssignmentTemplates(): Promise<AssignmentTemplateRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('assignment_templates')
    .select(SELECT)
    .order('updated_at', { ascending: false });

  if (error) {
    logger.warn('[assignment-template-queries] list error', { error: error.message });
    return [];
  }
  return (data ?? []).map((row) => mapTemplate(row as unknown as RawTemplate));
}

/** A single template (RLS-scoped). Null if hidden/missing. */
export async function getAssignmentTemplate(id: string): Promise<AssignmentTemplateRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('assignment_templates')
    .select(SELECT)
    .eq('id', id)
    .single();

  if (error || !data) {
    if (error && error.code !== 'PGRST116') {
      logger.warn('[assignment-template-queries] detail error', { error: error.message });
    }
    return null;
  }
  return mapTemplate(data as unknown as RawTemplate);
}
