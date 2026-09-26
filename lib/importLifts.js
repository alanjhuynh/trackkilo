import { request } from './api';
import { IMPORT_BATCH_SIZE, toImportPayload } from './dataTransfer';

/**
 * Sends parsed lifts to /api/import in batches. `onProgress(done, total)` is
 * called after each batch. Resolves to totals across all batches.
 */
export async function importLifts(lifts, onProgress = () => {}) {
  const payload = toImportPayload(lifts);
  const totals = { imported: 0, duplicates: 0, failed: 0, censored: false };

  for (let i = 0; i < payload.length; i += IMPORT_BATCH_SIZE) {
    const batch = payload.slice(i, i + IMPORT_BATCH_SIZE);
    const { data } = await request('/api/import', { method: 'POST', body: { lifts: batch } });
    totals.imported += data.imported;
    totals.duplicates += data.duplicates;
    totals.failed += data.failed.length;
    totals.censored ||= data.censored;
    onProgress(Math.min(i + batch.length, payload.length), payload.length);
  }
  return totals;
}
