export const PUBLISHER_RUNS_QUEUE = 'publisher-runs';
export const PUBLISHER_RUN_JOB_NAME = 'publisher-run';

export const MELI_WEBHOOK_EVENTS_QUEUE = 'meli-webhook-events';
export const MELI_WEBHOOK_EVENT_JOB_NAME = 'process-meli-webhook-event';

export const MARKETPLACE_CHANGE_ACTIONS_QUEUE = 'marketplace-change-actions';
export const MARKETPLACE_CHANGE_ACTION_JOB_NAME =
  'process-marketplace-change-action';

export const MARKETPLACE_PUBLICATIONS_SYNC_QUEUE =
  'marketplace-publications-sync';
export const MARKETPLACE_PUBLICATIONS_SYNC_JOB_NAME =
  'sync-marketplace-publications';
export const MARKETPLACE_PUBLICATIONS_SYNC_REPEAT_JOB_ID =
  'marketplace-publications-sync-cron';
// Cada 2 horas, en punto.
export const MARKETPLACE_PUBLICATIONS_SYNC_CRON_PATTERN = '0 */2 * * *';

export const MELI_RECONCILIATION_QUEUE = 'meli-status-reconciliation';
export const MELI_RECONCILIATION_JOB_NAME = 'reconcile-meli-status';
export const MELI_RECONCILIATION_REPEAT_JOB_ID =
  'meli-status-reconciliation-cron';
// Cada 6 horas, en punto. Es un respaldo del guard reactivo del webhook,
// no hace falta que corra tan seguido como el sync de catalogo.
export const MELI_RECONCILIATION_CRON_PATTERN = '0 */6 * * *';
