/**
 * Explicit-state workflow types (AIA-3).
 *
 * A WorkflowRun row is the persisted checkpoint; WORKFLOW_STAGES[type] is the
 * fixed stage order a run walks through. Each stage is a list of step names
 * run concurrently — a stage with one name is a sequential barrier (e.g.
 * `summary` must finish before anything else starts); a stage with several
 * names runs them in parallel (they don't depend on each other's output).
 * Looked up by name, not encoded as a graph — one workflow type, one array,
 * no generic FSM library.
 */

export type WorkflowType = 'post-lesson';

export type WorkflowStatus = 'running' | 'awaiting_review' | 'done' | 'failed';

export interface WorkflowRun {
  id: string;
  workflowType: WorkflowType;
  lessonId: string;
  status: WorkflowStatus;
  /** Index into WORKFLOW_STAGES[workflowType], stored as text in the DB. */
  currentStep: string;
  stepResults: Record<string, StepResult>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface StepResult {
  success: boolean;
  content?: string;
  error?: string;
}

export const WORKFLOW_STAGES: Record<WorkflowType, string[][]> = {
  // Stage 0 is a barrier: assignment/email don't start until summary lands.
  // Stage 1 runs concurrently — assignment and email don't depend on each
  // other's output, only (partially) on stage 0's.
  'post-lesson': [['summary'], ['assignment', 'email']],
};
