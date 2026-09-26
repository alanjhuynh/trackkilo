import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClockRotateLeft, faPlus, faTrashCan, faXmark } from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';
import CardioFields from './CardioFields';
import KindIcon from './KindIcon';
import LiftNameInput from './LiftNameInput';
import Stepper from './Stepper';
import { useLifts } from './LiftProvider';
import useExercises from '../lib/useExercises';
import { initFormState, liftFormReducer, toPayload, validateForm } from '../lib/liftForm';
import { dayLabel, formatWeight, normalizeName, summarizeSets } from '../lib/format';
import { getPreferredDistanceUnit, getPreferredUnit, setPreferredUnit } from '../lib/prefs';
import { MAX_SETS, METRICS, toKg, topSet } from '../lib/sets';
import { CARDIO_KINDS, cardioKind, isCardio } from '../lib/activities';

const LIFT_KIND = { key: 'lift', label: 'Lift' };

const DECIMAL = /^\d*\.?\d*$/;
const INTEGER = /^\d*$/;
const DELETE_CONFIRM_MS = 4000;

const cx = (...classes) => classes.filter(Boolean).join(' ');

function LastSession({ entry, applied, onApply }) {
  const { last, best } = entry;
  return (
    <div className="tk-last-session">
      <FontAwesomeIcon icon={faClockRotateLeft} className="tk-last-session-icon" />
      <div className="tk-last-session-body">
        <div className="tk-last-session-title">
          {applied ? 'Filled in from last session' : 'Last session'} · {dayLabel(last.date)}
        </div>
        <div className="tk-last-session-detail">
          {summarizeSets(last)}
          {best && <span className="tk-last-session-best"> · Best {formatWeight(best.weight, best.metric)} × {best.rep}</span>}
        </div>
      </div>
      {!applied && (
        <button type="button" className="tk-btn tk-btn-sm tk-btn-soft" onClick={onApply}>Use</button>
      )}
    </div>
  );
}

// Lift / Run / Walk / Ride switch. A saved lift can't become a run, so editing
// only offers the kinds it can switch between.
function KindPicker({ options, value, onChange }) {
  return (
    <div className="tk-segmented tk-kind-picker" role="group" aria-label="Type of workout">
      {options.map((kind) => (
        <button key={kind.key} type="button" aria-pressed={value === kind.key} onClick={() => onChange(kind.key)}>
          <KindIcon kind={kind.key} />
          <span>{kind.label}</span>
        </button>
      ))}
    </div>
  );
}

function LiftForm({ mode, lift, prefill, onClose }) {
  const isNew = mode === 'new';
  const [state, dispatch] = useReducer(
    liftFormReducer,
    { mode, lift, prefill },
    (options) => initFormState(options, { weight: getPreferredUnit(), distance: getPreferredDistanceUnit() }),
  );
  const { createLift, updateLift, deleteLift } = useLifts();
  const { exercises, byName, lastCardio } = useExercises();
  const cardio = isCardio(state);
  const kindLabel = cardio ? cardioKind(state.kind).label.toLowerCase() : 'lift';
  let kindOptions = null;
  if (isNew) kindOptions = [LIFT_KIND, ...CARDIO_KINDS];
  else if (cardio) kindOptions = CARDIO_KINDS;
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const formRef = useRef(null);
  const nameRef = useRef(null);

  const errors = useMemo(() => validateForm(state), [state]);
  const shownErrors = showErrors ? errors : {};
  const liveEntry = byName.get(normalizeName(state.name));
  const committedEntry = byName.get(normalizeName(state.committedName));

  // Start on the name for a blank new lift (runs once; the form remounts per open)
  useEffect(() => {
    if (isNew && !cardio && !prefill?.name) nameRef.current?.focus();
  }, []);

  // Until the user customizes the form, fill it from the chosen lift's last session
  useEffect(() => {
    if (!isNew || cardio || !state.pristine) return;
    if (normalizeName(state.committedName) === state.appliedKey) return;
    if (committedEntry) dispatch({ type: 'applyHistory', entry: committedEntry, auto: true });
    else if (state.appliedKey) dispatch({ type: 'resetDefaults' });
  }, [isNew, cardio, state.pristine, state.committedName, state.appliedKey, committedEntry]);

  useEffect(() => {
    if (!confirmDelete) return undefined;
    const timer = setTimeout(() => setConfirmDelete(false), DELETE_CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [confirmDelete]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving || deleting) return;

    if (Object.keys(errors).length) {
      setShowErrors(true);
      if (cardio) toast.error(errors.date || (errors.cardio?.empty ? 'Enter a distance or a time' : 'Check the highlighted fields'));
      else toast.error(errors.name || errors.date || 'Check the highlighted sets');
      if (errors.name) nameRef.current?.focus();
      return;
    }

    setSaving(true);
    try {
      const payload = toPayload(state);
      let result;
      if (isNew) {
        // liveEntry is the history from before this lift was saved
        const previousBest = !cardio && liveEntry?.best;
        result = await createLift(payload);
        const saved = result.lift;
        const top = topSet(saved.sets);
        if (previousBest && top && toKg(top) > previousBest.kg) {
          toast.success(`New PR on ${saved.name}!`, { icon: '🏆', duration: 5000 });
        } else {
          toast.success(`${saved.name} logged`);
        }
      } else {
        result = await updateLift(lift._id, payload);
        toast.success(cardio ? `${cardioKind(state.kind).label} updated` : 'Lift updated');
      }
      if (result.censored) toast('Some words were censored', { icon: '🤐' });
      onClose();
    } catch (error) {
      toast.error(error.message || 'Could not save lift');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await deleteLift(lift._id);
      toast.success(cardio ? `${cardioKind(state.kind).label} deleted` : 'Lift deleted');
      onClose();
    } catch (error) {
      toast.error(error.message || 'Could not delete lift');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const onRowChange = (index, field, pattern) => (e) => {
    const value = e.target.value.replace(',', '.');
    if (pattern.test(value)) dispatch({ type: 'rowField', index, field, value });
  };

  // Enter in a set field moves to the next one; on the last field it submits
  const onSetKeyDown = (e) => {
    if (e.key !== 'Enter' || e.metaKey || e.ctrlKey) return;
    const inputs = [...formRef.current.querySelectorAll('[data-set-input]')];
    const next = inputs[inputs.indexOf(e.target) + 1];
    if (next) {
      e.preventDefault();
      next.focus();
    }
  };

  const onFormKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e);
  };

  const selectOnFocus = (e) => e.target.select();
  const rowErrors = shownErrors.rows || {};
  const hasRowErrors = Object.keys(rowErrors).length > 0;

  return (
    <form ref={formRef} className="tk-modal-form" onSubmit={handleSubmit} onKeyDown={onFormKeyDown} noValidate>
      <Modal.Header className="tk-modal-header">
        <Modal.Title as="h2" id="lift-form-title" className="tk-modal-title">
          {isNew ? `Log a ${kindLabel}` : `Edit ${kindLabel}`}
        </Modal.Title>
        <button type="button" className="tk-icon-btn" onClick={onClose} aria-label="Close">
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </Modal.Header>

      <Modal.Body className="tk-modal-body">
        {kindOptions && (
          <KindPicker options={kindOptions} value={state.kind} onChange={(value) => dispatch({ type: 'kind', value })} />
        )}

        {cardio ? (
          <CardioFields
            state={state}
            dispatch={dispatch}
            errors={shownErrors}
            last={isNew ? lastCardio.get(state.kind) : null}
          />
        ) : (
          <>
            <div className="tk-field">
              <label className="tk-label" htmlFor="lift-name">Exercise</label>
              <LiftNameInput
                ref={nameRef}
                id="lift-name"
                value={state.name}
                recent={exercises}
                invalid={!!shownErrors.name}
                onChange={(value) => dispatch({ type: 'field', field: 'name', value })}
                onCommit={(value) => dispatch({ type: 'commitName', value })}
              />
              {shownErrors.name && <div className="tk-field-error">{shownErrors.name}</div>}
            </div>

            {isNew && liveEntry && (
              <LastSession
                entry={liveEntry}
                applied={state.appliedKey === normalizeName(state.name)}
                onApply={() => dispatch({ type: 'applyHistory', entry: liveEntry, auto: false })}
              />
            )}

            <div className="tk-field-row">
              <div className="tk-field">
                <label className="tk-label" htmlFor="lift-date">Date</label>
                <input
                  id="lift-date"
                  type="date"
                  className={cx('tk-input', shownErrors.date && 'is-invalid')}
                  value={state.date}
                  onChange={(e) => dispatch({ type: 'field', field: 'date', value: e.target.value })}
                />
              </div>
              <div className="tk-field">
                <span className="tk-label" id="lift-unit-label">Unit</span>
                <div className="tk-segmented" role="group" aria-labelledby="lift-unit-label">
                  {METRICS.map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      aria-pressed={state.unit === unit}
                      onClick={() => {
                        dispatch({ type: 'unit', value: unit });
                        setPreferredUnit(unit);
                      }}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="tk-field-row">
              <div className="tk-field">
                <label className="tk-label" htmlFor="lift-sets">Sets</label>
                <Stepper
                  id="lift-sets"
                  label="sets"
                  value={state.rows.length}
                  min={1}
                  max={MAX_SETS}
                  onChange={(value) => dispatch({ type: 'setCount', value })}
                />
              </div>
              <div className="tk-field">
                <label className="tk-label" htmlFor="lift-reps">Reps</label>
                <Stepper
                  id="lift-reps"
                  label="reps"
                  value={Number(state.rep) || 0}
                  min={1}
                  max={999}
                  onChange={(value) => dispatch({ type: 'targetRep', value })}
                />
              </div>
            </div>

            <div className="tk-set-editor">
              <div className="tk-set-editor-head" aria-hidden="true">
                <span>Set</span>
                <span>Weight</span>
                <span>Reps</span>
                <span>RPE</span>
                <span />
              </div>
              {state.rows.map((row, i) => {
                const errorsForRow = rowErrors[row.id] || {};
                return (
                  <div key={row.id} className="tk-set-editor-row">
                    <span className="tk-set-index">{i + 1}</span>
                    <div className="tk-unit-input">
                      <input
                        data-set-input
                        className={cx('tk-input', errorsForRow.weight && 'is-invalid')}
                        inputMode="decimal"
                        enterKeyHint="next"
                        autoComplete="off"
                        placeholder="BW"
                        aria-label={`Set ${i + 1} weight in ${state.unit}`}
                        value={row.weight}
                        onChange={onRowChange(i, 'weight', DECIMAL)}
                        onFocus={selectOnFocus}
                        onKeyDown={onSetKeyDown}
                      />
                      <span className="tk-unit-suffix" aria-hidden="true">{state.unit}</span>
                    </div>
                    <input
                      data-set-input
                      className={cx('tk-input', errorsForRow.rep && 'is-invalid')}
                      inputMode="numeric"
                      enterKeyHint="next"
                      autoComplete="off"
                      placeholder="0"
                      aria-label={`Set ${i + 1} reps`}
                      value={row.rep}
                      onChange={onRowChange(i, 'rep', INTEGER)}
                      onFocus={selectOnFocus}
                      onKeyDown={onSetKeyDown}
                    />
                    <input
                      data-set-input
                      className={cx('tk-input', errorsForRow.rpe && 'is-invalid')}
                      inputMode="decimal"
                      enterKeyHint="next"
                      autoComplete="off"
                      placeholder="–"
                      aria-label={`Set ${i + 1} RPE`}
                      value={row.rpe}
                      onChange={onRowChange(i, 'rpe', DECIMAL)}
                      onFocus={selectOnFocus}
                      onKeyDown={onSetKeyDown}
                    />
                    <button
                      type="button"
                      className="tk-icon-btn tk-icon-btn-sm"
                      aria-label={`Remove set ${i + 1}`}
                      disabled={state.rows.length === 1}
                      onClick={() => dispatch({ type: 'removeSet', index: i })}
                    >
                      <FontAwesomeIcon icon={faXmark} />
                    </button>
                  </div>
                );
              })}
              {hasRowErrors && (
                <div className="tk-field-error">Every set needs reps. RPE goes from 0 to 10.</div>
              )}
              <button
                type="button"
                className="tk-btn tk-btn-ghost tk-add-set"
                disabled={state.rows.length >= MAX_SETS}
                onClick={() => dispatch({ type: 'setCount', value: state.rows.length + 1 })}
              >
                <FontAwesomeIcon icon={faPlus} /> Add set
              </button>
              <p className="tk-hint">Leave weight blank for bodyweight. Edits carry down to the sets below until you change them.</p>
            </div>
          </>
        )}


        <div className="tk-field">
          <label className="tk-label" htmlFor="lift-note">Notes</label>
          <textarea
            id="lift-note"
            className="tk-input"
            rows={2}
            maxLength={1000}
            placeholder={cardio ? 'Optional: route, weather, how it felt…' : 'Optional: cues, how it felt, equipment…'}
            value={state.note}
            onChange={(e) => dispatch({ type: 'field', field: 'note', value: e.target.value })}
          />
        </div>
      </Modal.Body>

      <Modal.Footer className="tk-modal-footer">
        {!isNew && (
          <button
            type="button"
            className={cx('tk-btn', confirmDelete ? 'tk-btn-danger' : 'tk-btn-ghost-danger')}
            disabled={saving || deleting}
            onClick={handleDelete}
          >
            {deleting ? (
              <span className="spinner-border spinner-border-sm" role="status" aria-label="Deleting" />
            ) : (
              <>
                <FontAwesomeIcon icon={faTrashCan} />
                {confirmDelete ? 'Confirm' : 'Delete'}
              </>
            )}
          </button>
        )}
        <div className="tk-modal-actions">
          <button type="button" className="tk-btn tk-btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="tk-btn tk-btn-primary" disabled={saving || deleting}>
            {saving ? <span className="spinner-border spinner-border-sm" role="status" aria-label="Saving" /> : 'Save'}
          </button>
        </div>
      </Modal.Footer>
    </form>
  );
}

// Full screen on phones, a centered dialog on larger screens
export default function LiftFormModal({ form, show, onHide, onExited }) {
  return (
    <Modal
      show={show}
      onHide={onHide}
      onExited={onExited}
      fullscreen="sm-down"
      centered
      scrollable
      backdrop="static"
      contentClassName="tk-modal"
      aria-labelledby="lift-form-title"
    >
      {form && (
        <LiftForm
          key={form.key}
          mode={form.mode}
          lift={form.lift}
          prefill={form.prefill}
          onClose={onHide}
        />
      )}
    </Modal>
  );
}
