import { useState } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEllipsisVertical, faPenToSquare, faRotateRight, faTrashCan, faTrophy,
} from '@fortawesome/free-solid-svg-icons';
import ConfirmModal from './ConfirmModal';
import KindIcon from './KindIcon';
import { useLifts } from './LiftProvider';
import { useLiftForm } from './LiftFormProvider';
import { formatWeight, plural, summarizeSets } from '../lib/format';
import {
  cardioKind, formatDistance, formatDuration, formatPace, isCardio,
} from '../lib/activities';

// Longer lifts collapse to this many rows plus a "show more" link
const COLLAPSED_SETS = 5;

// Distance, time and pace (or speed) for a run, walk or ride
function CardioStats({ entry }) {
  const pace = formatPace(entry);
  const stats = [
    entry.distance ? ['Distance', formatDistance(entry.distance, entry.distanceUnit)] : null,
    entry.duration ? ['Time', formatDuration(entry.duration)] : null,
    pace ? [entry.kind === 'ride' ? 'Speed' : 'Pace', pace] : null,
  ].filter(Boolean);
  return (
    <dl className="tk-cardio-stats">
      {stats.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function LiftCard({ lift, isPR }) {
  const { openEdit, openRepeat } = useLiftForm();
  const { deleteLift } = useLifts();
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { sets } = lift;
  const cardio = isCardio(lift);
  const noun = cardio ? cardioKind(lift.kind).label : 'Lift';
  const collapsed = !expanded && sets.length > COLLAPSED_SETS;
  const visibleSets = collapsed ? sets.slice(0, COLLAPSED_SETS - 1) : sets;

  const onDelete = async () => {
    setDeleting(true);
    try {
      await deleteLift(lift._id);
      toast.success(`${noun} deleted`);
    } catch (error) {
      toast.error(error.message || 'Could not delete');
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <>
      {/* Clicking anywhere on the card edits it; the menu offers the same for keyboard users */}
      <article className={`tk-card tk-lift-card${cardio ? ` tk-cardio-card tk-kind-${lift.kind}` : ''}`} onClick={() => openEdit(lift)}>
        <header className="tk-lift-card-header">
          {cardio && <span className="tk-kind-badge"><KindIcon kind={lift.kind} /></span>}
          <div className="tk-lift-card-title">
            <h3 className="tk-lift-name">{lift.name}</h3>
            {/* Untitled runs are already named "Run" */}
            {(!cardio || lift.name !== noun) && (
              <div className="tk-lift-summary">{cardio ? noun : summarizeSets(lift)}</div>
            )}
          </div>
          {isPR && (
            <span className="tk-pr-badge" title="Personal record">
              <FontAwesomeIcon icon={faTrophy} /> PR
            </span>
          )}
          <Dropdown align="end" onClick={(e) => e.stopPropagation()}>
            <Dropdown.Toggle as="button" type="button" bsPrefix="tk-icon-btn tk-icon-btn-sm" aria-label={`Actions for ${lift.name}`}>
              <FontAwesomeIcon icon={faEllipsisVertical} />
            </Dropdown.Toggle>
            <Dropdown.Menu className="tk-menu">
              <Dropdown.Item as="button" onClick={() => openEdit(lift)}>
                <FontAwesomeIcon icon={faPenToSquare} /> Edit
              </Dropdown.Item>
              <Dropdown.Item as="button" onClick={() => openRepeat(lift)}>
                <FontAwesomeIcon icon={faRotateRight} /> Log again today
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item as="button" className="tk-danger" onClick={() => setConfirming(true)}>
                <FontAwesomeIcon icon={faTrashCan} /> Delete
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </header>

        {cardio && <CardioStats entry={lift} />}

        {sets.length > 0 && (
          <ol className="tk-set-list">
            {visibleSets.map((set) => (
              <li key={set._id || set.index} className="tk-set-item">
                <span className="tk-set-index">{set.index}</span>
                <span className="tk-set-weight">{formatWeight(set.weight, set.metric)}</span>
                <span className="tk-set-reps">× {set.rep}</span>
                <span className="tk-set-rpe">{set.rpe !== null && set.rpe !== undefined ? `RPE ${set.rpe}` : ''}</span>
              </li>
            ))}
          </ol>
        )}

        {collapsed && (
          <button
            type="button"
            className="tk-link-btn"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(true);
            }}
          >
            Show {plural(sets.length - visibleSets.length, 'more set')}
          </button>
        )}

        {lift.note && <p className="tk-lift-note">{lift.note}</p>}
      </article>

      {/* Outside the card so clicks in the dialog don't bubble up to it */}
      <ConfirmModal
        show={confirming}
        title={`Delete ${lift.name}?`}
        confirmLabel="Delete"
        busy={deleting}
        onConfirm={onDelete}
        onHide={() => setConfirming(false)}
      >
        {cardio
          ? <>This removes the {noun.toLowerCase()} from your log. It can&apos;t be undone.</>
          : <>This removes the lift and its {plural(sets.length, 'set')}. It can&apos;t be undone.</>}
      </ConfirmModal>
    </>
  );
}
