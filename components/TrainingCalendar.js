import { useMemo, useState } from 'react';
import useSWR from 'swr';
import moment from 'moment';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { calendarKey, fetcher } from '../lib/api';
import { dayKey, plural } from '../lib/format';
import { CARDIO_KINDS } from '../lib/activities';

const KIND_ORDER = ['lift', ...CARDIO_KINDS.map((kind) => kind.key)];
const KIND_NAMES = { lift: ['lift', 'lifts'], ...Object.fromEntries(CARDIO_KINDS.map((k) => [k.key, [k.label.toLowerCase(), k.plural]])) };

// "2 lifts, 1 run" for a day's screen-reader label
function describeEntries(day) {
  return KIND_ORDER
    .filter((kind) => day.counts[kind])
    .map((kind) => plural(day.counts[kind], ...KIND_NAMES[kind]))
    .join(', ');
}

/**
 * Month calendar with a dot for each kind of entry logged on a day. Days with
 * entries call `onSelectDay(day)`; empty past days call `onLogDay(day)` so a
 * workout can be logged for them. Days are "YYYY-MM-DD" in local time.
 */
export default function TrainingCalendar({ selected, onSelectDay, onLogDay }) {
  const [month, setMonth] = useState(() => moment().startOf('month'));
  const today = dayKey(new Date());
  const isCurrentMonth = month.isSame(moment(), 'month');

  // The visible grid runs from the week containing the 1st to the week containing the last day
  const gridStart = month.clone().startOf('week');
  const gridEnd = month.clone().endOf('month').endOf('week').add(1, 'day').startOf('day');
  const { data, isLoading } = useSWR(
    calendarKey({ from: gridStart.toISOString(), to: gridEnd.toISOString() }),
    fetcher,
    { keepPreviousData: true, revalidateOnFocus: false },
  );

  // Entries by local calendar day: { kinds: Set, counts: { lift: 2, run: 1 } }
  const byDay = useMemo(() => {
    const days = new Map();
    (data || []).forEach(({ date, kinds, count }) => {
      const key = dayKey(date);
      const day = days.get(key) || { counts: {} };
      // One kind per date group in practice; spread the count across its kinds if not
      kinds.forEach((kind) => { day.counts[kind] = (day.counts[kind] || 0) + (kinds.length === 1 ? count : 1); });
      days.set(key, day);
    });
    return days;
  }, [data]);

  const weeks = [];
  for (let cursor = gridStart.clone(); cursor.isBefore(gridEnd); cursor.add(1, 'week')) {
    weeks.push(Array.from({ length: 7 }, (_, i) => cursor.clone().add(i, 'days')));
  }
  const monthDays = [...byDay.keys()].filter((key) => key.startsWith(month.format('YYYY-MM'))).length;

  return (
    <section className="tk-card tk-calendar" aria-labelledby="calendar-title">
      <header className="tk-calendar-header">
        <button
          type="button"
          className="tk-icon-btn tk-icon-btn-sm"
          aria-label="Previous month"
          onClick={() => setMonth((m) => m.clone().subtract(1, 'month'))}
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <h2 id="calendar-title" className="tk-calendar-title" aria-live="polite">{month.format('MMMM YYYY')}</h2>
        <button
          type="button"
          className="tk-icon-btn tk-icon-btn-sm"
          aria-label="Next month"
          disabled={isCurrentMonth}
          onClick={() => setMonth((m) => m.clone().add(1, 'month'))}
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </header>

      <table className={`tk-calendar-grid${isLoading && !data ? ' is-loading' : ''}`}>
        <thead>
          <tr>
            {weeks[0].map((day) => (
              <th key={day.day()} scope="col" abbr={day.format('dddd')}>{day.format('dd').charAt(0)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0].format('YYYY-MM-DD')}>
              {week.map((day) => {
                const key = day.format('YYYY-MM-DD');
                const entry = byDay.get(key);
                const future = key > today;
                const outside = !day.isSame(month, 'month');
                const classes = [
                  'tk-calendar-day',
                  entry && 'has-entries',
                  outside && 'is-outside',
                  key === today && 'is-today',
                  key === selected && 'is-selected',
                ].filter(Boolean).join(' ');
                const label = `${day.format('dddd, MMMM D')}${entry ? `: ${describeEntries(entry)}` : future ? '' : ': nothing logged'}`;
                return (
                  <td key={key}>
                    <button
                      type="button"
                      className={classes}
                      disabled={future}
                      aria-label={label}
                      aria-pressed={key === selected}
                      onClick={() => (entry ? onSelectDay(key) : onLogDay(key))}
                    >
                      <span className="tk-calendar-number">{day.date()}</span>
                      <span className="tk-calendar-dots" aria-hidden="true">
                        {entry && KIND_ORDER.filter((kind) => entry.counts[kind]).map((kind) => (
                          <span key={kind} className={`tk-calendar-dot tk-kind-${kind}`} />
                        ))}
                      </span>
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <footer className="tk-calendar-footer">
        <span>{plural(monthDays, 'day')} trained in {month.format('MMMM')}</span>
        {!isCurrentMonth && (
          <button type="button" className="tk-link-btn" onClick={() => setMonth(moment().startOf('month'))}>
            This month
          </button>
        )}
      </footer>
      <ul className="tk-calendar-legend" aria-hidden="true">
        {KIND_ORDER.map((kind) => (
          <li key={kind}><span className={`tk-calendar-dot tk-kind-${kind}`} />{KIND_NAMES[kind][1]}</li>
        ))}
      </ul>
    </section>
  );
}
