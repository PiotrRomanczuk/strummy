export interface LessonHistoryRow {
  id: string;
  lesson_id: string;
  changed_by: string | null;
  change_type: string;
  previous_data: Record<string, unknown> | null;
  new_data: Record<string, unknown>;
  changed_at: string;
  notes: string | null;
  created_at: string;
}

export interface AssignmentHistoryRow {
  id: string;
  assignment_id: string;
  changed_by: string | null;
  change_type: string;
  previous_data: Record<string, unknown> | null;
  new_data: Record<string, unknown>;
  changed_at: string;
  notes: string | null;
  created_at: string;
}
