import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import COMMON_LIFTS from '../lib/commonLifts';
import { formatWeight, normalizeName } from '../lib/format';
import { topSet } from '../lib/sets';

const MAX_RECENT = 6;
const MAX_RECENT_MATCHES = 10;

// Lowercase with punctuation and spaces removed, so "pull up" matches "Pull-Up"
const compact = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, '');

function recentMeta(exercise) {
  const top = topSet(exercise.last.sets);
  return top ? `${formatWeight(top.weight, top.metric)} × ${top.rep}` : null;
}

// Option groups for the query: the user's own lifts first, then common lifts
function buildGroups(query, recent) {
  const q = compact(query);
  const matches = (name, aliases = []) =>
    !q || compact(name).includes(q) || aliases.some((alias) => compact(alias).includes(q));

  const groups = [];
  const seen = new Set();

  const own = recent
    .filter((exercise) => matches(exercise.name))
    .slice(0, q ? MAX_RECENT_MATCHES : MAX_RECENT)
    .map((exercise) => ({ name: exercise.name, meta: recentMeta(exercise) }));
  own.forEach((option) => seen.add(normalizeName(option.name)));
  if (own.length) groups.push({ label: 'Your lifts', options: own });

  COMMON_LIFTS.forEach((group) => {
    const options = group.lifts
      .filter((lift) => !seen.has(normalizeName(lift.name)) && matches(lift.name, lift.aliases))
      .map((lift) => ({ name: lift.name }));
    if (options.length) groups.push({ label: group.label, options });
  });

  let index = 0;
  groups.forEach((group) => group.options.forEach((option) => { option.index = index++; }));
  return groups;
}

// Bolds the part of the name that matches what was typed
function Highlight({ text, query }) {
  const q = query.trim().toLowerCase();
  const start = q ? text.toLowerCase().indexOf(q) : -1;
  if (start < 0) return text;
  return (
    <>
      {text.slice(0, start)}
      <mark>{text.slice(start, start + q.length)}</mark>
      {text.slice(start + q.length)}
    </>
  );
}

/**
 * Lift name field with a dropdown of the user's recent lifts and common lifts.
 * Any name can be typed. `onCommit` fires when a name is picked or the field
 * loses focus.
 */
const LiftNameInput = forwardRef(function LiftNameInput(
  { id, value, onChange, onCommit, recent, invalid },
  ref,
) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const listId = `${id}-options`;

  const groups = useMemo(() => buildGroups(value, recent), [value, recent]);
  const options = useMemo(() => groups.flatMap((group) => group.options), [groups]);
  const showList = open && options.length > 0;

  const setRefs = (node) => {
    inputRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  useEffect(() => {
    if (active < 0) return;
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const select = (name) => {
    onChange(name);
    onCommit(name);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setOpen(true);
        setActive((i) => Math.min(i + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        if (showList && options[active]) {
          e.preventDefault();
          select(options[active].name);
        } else {
          onCommit(value);
        }
        break;
      case 'Escape':
        if (showList) {
          // Close the list without closing the modal around it
          e.preventDefault();
          e.stopPropagation();
          setOpen(false);
        }
        break;
      default:
        break;
    }
  };

  return (
    <div className="tk-combobox">
      <div className="tk-combobox-field">
        <input
          ref={setRefs}
          id={id}
          className={`tk-input${invalid ? ' is-invalid' : ''}`}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${id}-option-${active}` : undefined}
          autoComplete="off"
          autoCapitalize="words"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          placeholder="Search or type a lift"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setOpen(false);
            onCommit(value);
          }}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          className="tk-combobox-toggle"
          tabIndex={-1}
          aria-label={showList ? 'Hide lifts' : 'Show lifts'}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setOpen((o) => !o);
            inputRef.current?.focus();
          }}
        >
          <FontAwesomeIcon icon={faChevronDown} />
        </button>
      </div>

      {showList && (
        // Keep focus in the input while tapping or scrolling the list
        <ul id={listId} ref={listRef} role="listbox" className="tk-combobox-list" onMouseDown={(e) => e.preventDefault()}>
          {groups.map((group) => (
            <li key={group.label} role="presentation">
              <div className="tk-combobox-group" aria-hidden="true">{group.label}</div>
              <ul role="group" aria-label={group.label}>
                {group.options.map((option) => (
                  <li
                    key={option.name}
                    id={`${id}-option-${option.index}`}
                    role="option"
                    aria-selected={option.index === active}
                    data-index={option.index}
                    className={`tk-combobox-option${option.index === active ? ' active' : ''}`}
                    onClick={() => select(option.name)}
                    onMouseEnter={() => setActive(option.index)}
                  >
                    <span className="tk-combobox-name"><Highlight text={option.name} query={value} /></span>
                    {option.meta && <span className="tk-combobox-meta">{option.meta}</span>}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

export default LiftNameInput;
