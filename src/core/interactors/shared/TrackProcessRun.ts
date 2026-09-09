import { Injectable, Logger } from '@nestjs/common';
import { ProcessRunsRepository } from 'src/core/drivers/repositories/internal-soled/process-runs/ProcessRunsRepository';
import type { ProcessRunTriggerType } from 'src/core/entitis/internal-soled/process-runs/ProcessRun';

// Envuelve la ejecucion de un proceso (cron o disparo manual) para dejar un
// registro en process_runs (internal-soled): abre la corrida antes, la
// cierra con el resumen o el error despues. Si el registro en si falla (ej.
// la tabla todavia no existe, o internal-soled no responde) no debe frenar
// el proceso real: solo se loguea, nunca se propaga desde aca.
@Injectable()
export class TrackProcessRun {
  private readonly logger = new Logger(TrackProcessRun.name);

  constructor(private readonly processRuns: ProcessRunsRepository) {}

  async run<T>(
    processName: string,
    triggerType: ProcessRunTriggerType,
    fn: () => Promise<T>,
  ): Promise<T> {
    const runId = await this.openRun(processName, triggerType);

    try {
      const result = await fn();
      await this.closeRun(runId, { status: 'completed', summary: result });
      return result;
    } catch (error) {
      await this.closeRun(runId, {
        status: 'failed',
        errorMessage: this.getErrorMessage(error),
      });
      throw error;
    }
  }

  private async openRun(
    processName: string,
    triggerType: ProcessRunTriggerType,
  ): Promise<number | null> {
    try {
      const run = await this.processRuns.create({ processName, triggerType });
      return run.id;
    } catch (error) {
      this.logger.warn(
        `[PROCESS-RUNS] No se pudo registrar el inicio | process=${processName} error=${this.getErrorMessage(error)}`,
      );
      return null;
    }
  }

  private async closeRun(
    runId: number | null,
    input: {
      status: 'completed' | 'failed';
      summary?: unknown;
      errorMessage?: string;
    },
  ): Promise<void> {
    if (runId === null) {
      return;
    }

    try {
      await this.processRuns.finish(runId, input);
    } catch (error) {
      this.logger.warn(
        `[PROCESS-RUNS] No se pudo cerrar la corrida | runId=${runId} error=${this.getErrorMessage(error)}`,
      );
    }
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
