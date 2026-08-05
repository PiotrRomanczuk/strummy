/**
 * Explicit-state workflow engine (AIA-3).
 *
 * Thin sequencer over the existing agent registry: each call to runStep()
 * executes every step in the run's current STAGE concurrently, checkpoints
 * the results, and advances to the next stage. A crash between stages loses
 * nothing — the next runStep() call resumes from whatever stage index was
 * last persisted.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { STEP_EXECUTORS } from './steps';
import { WORKFLOW_STAGES, type StepResult, type WorkflowRun, type WorkflowType } from './types';

interface StartWorkflowArgs {
  workflowType: WorkflowType;
  lessonId: string;
  createdBy: string;
  input: Record<string, unknown>;
}

function toWorkflowRun(row: Record<string, unknown>): WorkflowRun {
  return {
    id: row.id as string,
    workflowType: row.workflow_type as WorkflowType,
    lessonId: row.lesson_id as string,
    status: row.status as WorkflowRun['status'],
    currentStep: row.current_step as string,
    stepResults: row.step_results as WorkflowRun['stepResults'],
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function startWorkflow(
  supabase: SupabaseClient,
  args: StartWorkflowArgs
): Promise<WorkflowRun> {
  const { data, error } = await supabase
    .from('ai_workflow_runs')
    .insert({
      workflow_type: args.workflowType,
      lesson_id: args.lessonId,
      created_by: args.createdBy,
      current_step: '0',
      input: args.input,
    })
    .select()
    .single();

  if (error) throw error;
  return toWorkflowRun(data);
}

async function runStage(
  stageSteps: string[],
  input: Record<string, unknown>,
  priorResults: Record<string, StepResult>
): Promise<Record<string, StepResult>> {
  const entries = await Promise.all(
    stageSteps.map(async (name) => [name, await STEP_EXECUTORS[name](input, priorResults)] as const)
  );
  return Object.fromEntries(entries);
}

/** Executes every step in the run's current stage and advances by one stage. */
export async function runStep(supabase: SupabaseClient, runId: string): Promise<WorkflowRun> {
  const { data: row, error: loadError } = await supabase
    .from('ai_workflow_runs')
    .select()
    .eq('id', runId)
    .single();
  if (loadError) throw loadError;

  const run = toWorkflowRun(row);
  if (run.status !== 'running') return run;

  const stages = WORKFLOW_STAGES[run.workflowType];
  const stageIndex = Number(run.currentStep);
  const stageResults = await runStage(
    stages[stageIndex],
    row.input as Record<string, unknown>,
    run.stepResults
  );
  const stepResults = { ...run.stepResults, ...stageResults };

  // A stage advances as long as at least one of its steps succeeded — a
  // failed `assignment` shouldn't block a successful `email` from reaching
  // review. Only an all-failed stage marks the whole run failed.
  const stageOk = Object.values(stageResults).some((r) => r.success);
  const isLastStage = stageIndex + 1 >= stages.length;
  const status = !stageOk ? 'failed' : isLastStage ? 'awaiting_review' : 'running';
  const currentStep = isLastStage ? run.currentStep : String(stageIndex + 1);

  const { data: updated, error: updateError } = await supabase
    .from('ai_workflow_runs')
    .update({ step_results: stepResults, status, current_step: currentStep })
    .eq('id', runId)
    .select()
    .single();
  if (updateError) throw updateError;

  return toWorkflowRun(updated);
}
