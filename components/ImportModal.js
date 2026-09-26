import { useMemo, useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import toast from 'react-hot-toast';
import moment from 'moment';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleInfo, faXmark } from '@fortawesome/free-solid-svg-icons';
import { useLifts } from './LiftProvider';
import { importLifts } from '../lib/importLifts';
import { plural, summarizeSets } from '../lib/format';
import useLatest from '../lib/useLatest';
import { cardioKind, isCardio, summarizeCardio } from '../lib/activities';

const PREVIEW_COUNT = 6;

// "lift"/"lifts" for lifts only, "entry"/"entries" once runs, walks or rides are included
const nounFor = (lifts) => (lifts.some(isCardio) ? ['entry', 'entries'] : ['lift', 'lifts']);

// Toasts summarizing an import
export function announceImport(totals, [one, many] = ['lift', 'lifts']) {
  const count = (n) => plural(n, one, many);
  const skipped = totals.duplicates ? ` (${count(totals.duplicates)} already in your log)` : '';
  if (totals.imported || !totals.duplicates) toast.success(`Imported ${count(totals.imported)}${skipped}`);
  else toast(`Nothing new to import${skipped}`, { icon: 'ℹ️' });
  if (totals.failed) toast.error(`${count(totals.failed)} couldn’t be imported`);
  if (totals.censored) toast('Some words were censored', { icon: '🤐' });
}

export function ImportProgress({ progress }) {
  if (!progress) return null;
  const percent = Math.round((progress.done / progress.total) * 100);
  return (
    <div className="tk-progress" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${percent}%` }} />
    </div>
  );
}

/**
 * Preview of lifts parsed from a file, with a button to import them.
 * `result` is the output of parseImportFile: { lifts, skipped }.
 */
export default function ImportModal({ fileName, result: current, onHide }) {
  const [progress, setProgress] = useState(null);
  const { reset } = useLifts();
  const result = useLatest(current);
  const lifts = result?.lifts || [];

  const noun = nounFor(lifts);

  const summary = useMemo(() => {
    if (!lifts.length) return null;
    const days = lifts.map((lift) => lift.date).sort();
    const strength = lifts.filter((lift) => !isCardio(lift));
    return {
      lifts: strength.length,
      sets: strength.reduce((sum, lift) => sum + lift.sets.length, 0),
      exercises: new Set(strength.map((lift) => lift.name.toLowerCase())).size,
      cardio: lifts.length - strength.length,
      from: moment(days[0]).format('MMM D, YYYY'),
      to: moment(days[days.length - 1]).format('MMM D, YYYY'),
      preview: [...lifts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, PREVIEW_COUNT),
    };
  }, [lifts]);

  const run = async () => {
    setProgress({ done: 0, total: lifts.length });
    try {
      const totals = await importLifts(lifts, (done, total) => setProgress({ done, total }));
      announceImport(totals, noun);
      onHide();
    } catch (error) {
      toast.error(`Import stopped: ${error.message}. Run it again to pick up the rest; lifts already imported are skipped.`);
    } finally {
      reset();
      setProgress(null);
    }
  };

  const busy = Boolean(progress);

  return (
    <Modal show={Boolean(current)} onHide={busy ? undefined : onHide} centered scrollable fullscreen="sm-down" contentClassName="tk-modal">
      <Modal.Header className="tk-modal-header">
        <Modal.Title as="h2" className="tk-modal-title">Import lifts</Modal.Title>
        <button type="button" className="tk-icon-btn" onClick={onHide} disabled={busy} aria-label="Close">
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </Modal.Header>
      <Modal.Body className="tk-modal-body">
        {summary && (
          <>
            <p className="tk-import-file">{fileName}</p>
            <div className="tk-import-stats">
              <div><strong>{summary.lifts.toLocaleString()}</strong><span>lifts</span></div>
              <div><strong>{summary.sets.toLocaleString()}</strong><span>sets</span></div>
              {summary.cardio > 0
                ? <div><strong>{summary.cardio.toLocaleString()}</strong><span>runs, walks &amp; rides</span></div>
                : <div><strong>{summary.exercises}</strong><span>exercises</span></div>}
            </div>
            <p className="tk-hint">
              {summary.from === summary.to ? summary.from : `${summary.from} to ${summary.to}`}
            </p>
            {result.skipped > 0 && (
              <p className="tk-note">
                <FontAwesomeIcon icon={faCircleInfo} /> {plural(result.skipped, 'row')} skipped (missing a date, exercise or reps).
              </p>
            )}
            <h3 className="tk-subheading">Most recent</h3>
            <ul className="tk-import-list">
              {summary.preview.map((lift, i) => (
                <li key={i}>
                  <span className="tk-import-date">{moment(lift.date).format('MMM D')}</span>
                  <span className="tk-import-name">{lift.name || cardioKind(lift.kind)?.label}</span>
                  <span className="tk-import-sets">
                    {isCardio(lift) ? summarizeCardio(lift) : summarizeSets({ sets: lift.sets })}
                  </span>
                </li>
              ))}
            </ul>
            <p className="tk-hint">Anything already in your log is skipped, so importing the same file twice is safe.</p>
          </>
        )}
        <ImportProgress progress={progress} />
      </Modal.Body>
      <Modal.Footer className="tk-modal-footer">
        <div className="tk-modal-actions">
          <button type="button" className="tk-btn tk-btn-secondary" onClick={onHide} disabled={busy}>Cancel</button>
          <button type="button" className="tk-btn tk-btn-primary" onClick={run} disabled={busy || !lifts.length}>
            {busy ? `Importing ${progress.done}/${progress.total}…` : `Import ${plural(lifts.length, ...noun)}`}
          </button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
