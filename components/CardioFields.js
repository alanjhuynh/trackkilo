import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClockRotateLeft } from '@fortawesome/free-solid-svg-icons';
import {
  DISTANCE_UNITS, cardioKind, formatPace, summarizeCardio,
} from '../lib/activities';
import { dayLabel } from '../lib/format';
import { durationSeconds } from '../lib/liftForm';
import { setPreferredDistanceUnit } from '../lib/prefs';

const DECIMAL = /^\d*\.?\d*$/;
const INTEGER = /^\d*$/;

const cx = (...classes) => classes.filter(Boolean).join(' ');

function partOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  if (hour < 21) return 'Evening';
  return 'Night';
}

function LastCardio({ entry, onApply }) {
  const kind = cardioKind(entry.kind);
  const pace = formatPace(entry);
  return (
    <div className="tk-last-session">
      <FontAwesomeIcon icon={faClockRotateLeft} className="tk-last-session-icon" />
      <div className="tk-last-session-body">
        <div className="tk-last-session-title">Last {kind.label.toLowerCase()} · {dayLabel(entry.date)}</div>
        <div className="tk-last-session-detail">
          {summarizeCardio(entry)}
          {pace && <span className="tk-last-session-best"> · {pace}</span>}
        </div>
      </div>
      <button type="button" className="tk-btn tk-btn-sm tk-btn-soft" onClick={onApply}>Use</button>
    </div>
  );
}

/**
 * Title, date, distance and time for a run, walk or ride. `last` is the
 * previous entry of this kind, offered as a one-tap fill.
 */
export default function CardioFields({ state, dispatch, errors, last }) {
  const kind = cardioKind(state.kind);
  const fieldErrors = errors.cardio || {};
  const pace = formatPace({
    kind: state.kind,
    distance: Number(state.distance) || 0,
    distanceUnit: state.distanceUnit,
    duration: durationSeconds(state),
  });

  const onChange = (field, pattern) => (e) => {
    const value = e.target.value.replace(',', '.');
    if (!pattern || pattern.test(value)) dispatch({ type: 'field', field, value });
  };
  const selectOnFocus = (e) => e.target.select();

  const timeInput = (field, label, placeholder) => (
    <input
      className={cx('tk-duration-input', fieldErrors[field] && 'is-invalid')}
      inputMode="numeric"
      autoComplete="off"
      maxLength={field === 'hours' ? 3 : 2}
      placeholder={placeholder}
      aria-label={label}
      value={state[field]}
      onChange={onChange(field, INTEGER)}
      onFocus={selectOnFocus}
    />
  );

  return (
    <>
      <div className="tk-field">
        <label className="tk-label" htmlFor="cardio-title">Title</label>
        <input
          id="cardio-title"
          className="tk-input"
          maxLength={100}
          placeholder={`${partOfDay()} ${kind.label.toLowerCase()}`}
          value={state.title}
          onChange={onChange('title')}
        />
      </div>

      {last && <LastCardio entry={last} onApply={() => dispatch({ type: 'applyCardio', entry: last })} />}

      <div className="tk-field-row">
        <div className="tk-field">
          <label className="tk-label" htmlFor="lift-date">Date</label>
          <input
            id="lift-date"
            type="date"
            className={cx('tk-input', errors.date && 'is-invalid')}
            value={state.date}
            onChange={onChange('date')}
          />
        </div>
        <div className="tk-field">
          <span className="tk-label" id="distance-unit-label">Unit</span>
          <div className="tk-segmented" role="group" aria-labelledby="distance-unit-label">
            {DISTANCE_UNITS.map((unit) => (
              <button
                key={unit}
                type="button"
                aria-pressed={state.distanceUnit === unit}
                onClick={() => {
                  dispatch({ type: 'field', field: 'distanceUnit', value: unit });
                  setPreferredDistanceUnit(unit);
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
          <label className="tk-label" htmlFor="cardio-distance">Distance</label>
          <div className="tk-unit-input">
            <input
              id="cardio-distance"
              className={cx('tk-input', fieldErrors.distance && 'is-invalid')}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={state.distance}
              onChange={onChange('distance', DECIMAL)}
              onFocus={selectOnFocus}
            />
            <span className="tk-unit-suffix" aria-hidden="true">{state.distanceUnit}</span>
          </div>
        </div>
        <div className="tk-field">
          <span className="tk-label" id="cardio-time-label">Time</span>
          <div
            className={cx('tk-duration', (fieldErrors.hours || fieldErrors.minutes || fieldErrors.seconds) && 'is-invalid')}
            role="group"
            aria-labelledby="cardio-time-label"
          >
            {timeInput('hours', 'Hours', 'h')}
            <span aria-hidden="true">:</span>
            {timeInput('minutes', 'Minutes', 'min')}
            <span aria-hidden="true">:</span>
            {timeInput('seconds', 'Seconds', 'sec')}
          </div>
        </div>
      </div>

      <div className="tk-pace-readout" aria-live="polite">
        <span>{state.kind === 'ride' ? 'Speed' : 'Pace'}</span>
        <strong>{pace || '–'}</strong>
      </div>

      {fieldErrors.empty && <div className="tk-field-error">Enter a distance or a time.</div>}
      {(fieldErrors.minutes || fieldErrors.seconds) && (
        <div className="tk-field-error">Minutes and seconds go up to 59.</div>
      )}
    </>
  );
}
