export type ProcessRunTriggerType = 'cron' | 'manual';
export type ProcessRunStatus = 'running' | 'completed' | 'failed';

export type ProcessRunResponse = {
  id: number;
  processName: string;
  triggerType: ProcessRunTriggerType;
  status: ProcessRunStatus;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  summary: unknown;
  errorMessage: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type CreateProcessRunRequest = {
  processName: string;
  triggerType?: ProcessRunTriggerType;
};

export type FinishProcessRunRequest = {
  status: Extract<ProcessRunStatus, 'completed' | 'failed'>;
  summary?: unknown;
  errorMessage?: string;
};
