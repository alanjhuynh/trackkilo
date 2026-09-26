import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';

// Number input with −/+ buttons. Typed values apply on blur or Enter, so
// typing "12" doesn't briefly apply "1".
export default function Stepper({ id, label, value, min = 0, max = 999, onChange }) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const clamp = (number) => Math.min(max, Math.max(min, number));

  const commit = () => {
    const number = parseInt(draft, 10);
    if (Number.isNaN(number)) {
      setDraft(String(value));
      return;
    }
    const next = clamp(number);
    setDraft(String(next));
    if (next !== value) onChange(next);
  };

  return (
    <div className="tk-stepper">
      <button
        type="button"
        className="tk-stepper-btn"
        aria-label={`Fewer ${label}`}
        disabled={value <= min}
        onClick={() => onChange(clamp(value - 1))}
      >
        <FontAwesomeIcon icon={faMinus} />
      </button>
      <input
        id={id}
        className="tk-stepper-input"
        inputMode="numeric"
        autoComplete="off"
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, '').slice(0, 3))}
        onFocus={(e) => e.target.select()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
        }}
      />
      <button
        type="button"
        className="tk-stepper-btn"
        aria-label={`More ${label}`}
        disabled={value >= max}
        onClick={() => onChange(clamp(value + 1))}
      >
        <FontAwesomeIcon icon={faPlus} />
      </button>
    </div>
  );
}
