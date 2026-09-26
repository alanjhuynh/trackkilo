import { useEffect, useMemo, useRef } from 'react';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBolt, faDumbbell, faPlus } from '@fortawesome/free-solid-svg-icons';
import LiftCard from '../components/LiftCard';
import { useLifts } from '../components/LiftProvider';
import { useLiftForm } from '../components/LiftFormProvider';
import useExercises from '../lib/useExercises';
import { dayKey, describeDay, plural } from '../lib/format';

const QUICK_LOG_COUNT = 8;
const SKELETON_CARDS = 3;

function greeting(name) {
  const hour = new Date().getHours();
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const first = name?.split(' ')[0];
  return first ? `${part}, ${first}` : part;
}

// Within a day, show lifts in the order they were logged
const byCreation = (a, b) =>
  new Date(a.createdAt || 0) - new Date(b.createdAt || 0) || a._id.localeCompare(b._id);

function groupByDay(lifts) {
  const days = new Map();
  lifts.forEach((lift) => {
    const key = dayKey(lift.date);
    if (!days.has(key)) days.set(key, []);
    days.get(key).push(lift);
  });

  return [...days.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, dayLifts]) => ({
      key,
      lifts: dayLifts.sort(byCreation),
      setCount: dayLifts.reduce((sum, lift) => sum + (lift.sets.length || lift.set || 0), 0),
    }));
}

function DaySection({ day, prLiftIds }) {
  const { label, detail } = describeDay(day.key);
  return (
    <section className="tk-day" aria-labelledby={`day-${day.key}`}>
      <header className="tk-day-header">
        <h2 id={`day-${day.key}`} className="tk-day-title">
          {label}
          {detail && <span className="tk-day-date">{detail}</span>}
        </h2>
        <span className="tk-day-meta">
          {plural(day.lifts.length, 'lift')} · {plural(day.setCount, 'set')}
        </span>
      </header>
      <div className="tk-lift-grid">
        {day.lifts.map((lift) => (
          <LiftCard key={lift._id} lift={lift} isPR={prLiftIds.has(lift._id)} />
        ))}
      </div>
    </section>
  );
}

function FeedSkeleton() {
  return (
    <div className="tk-day" aria-busy="true" aria-label="Loading lifts">
      <div className="tk-day-header">
        <span className="tk-skeleton" style={{ width: 120, height: 20 }} />
      </div>
      <div className="tk-lift-grid">
        {Array.from({ length: SKELETON_CARDS }, (_, i) => (
          <div key={i} className="tk-card tk-lift-card tk-lift-card-skeleton">
            <span className="tk-skeleton" style={{ width: '55%', height: 18 }} />
            <span className="tk-skeleton" style={{ width: '35%', height: 14 }} />
            <span className="tk-skeleton" style={{ width: '100%', height: 14 }} />
            <span className="tk-skeleton" style={{ width: '100%', height: 14 }} />
            <span className="tk-skeleton" style={{ width: '100%', height: 14 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="tk-empty">
      <div className="tk-empty-icon"><FontAwesomeIcon icon={faDumbbell} /></div>
      <h2 className="tk-empty-title">No lifts yet</h2>
      <p className="tk-empty-text">Log your first lift and it will show up here, grouped by day.</p>
      <button type="button" className="tk-btn tk-btn-primary" onClick={onAdd}>
        <FontAwesomeIcon icon={faPlus} /> Log a lift
      </button>
    </div>
  );
}

const Index = () => {
  const { data: session } = useSession();
  const { lifts, hasMore, status, initialized, loadMore } = useLifts();
  const { exercises, prLiftIds } = useExercises();
  const { openNew } = useLiftForm();
  const sentinelRef = useRef(null);

  const days = useMemo(() => groupByDay(lifts), [lifts]);

  useEffect(() => {
    if (!initialized) loadMore();
  }, [initialized, loadMore]);

  // Load the next page as the end of the list comes into view. Re-observing
  // after each load keeps loading while the list is shorter than the screen.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !initialized || !hasMore || status !== 'idle') return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { rootMargin: '800px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [initialized, hasMore, status, loadMore]);

  const isEmpty = initialized && lifts.length === 0 && !hasMore;

  return (
    <div className="tk-page">
      <Head>
        <title>Log · trackkilo</title>
      </Head>

      <header className="tk-page-header">
        <div>
          <p className="tk-eyebrow">{greeting(session?.user?.name)}</p>
          <h1 className="tk-page-title">Training log</h1>
        </div>
      </header>

      {exercises.length > 0 && (
        <section className="tk-quick-log" aria-labelledby="quick-log-title">
          <h2 id="quick-log-title" className="tk-section-label">
            <FontAwesomeIcon icon={faBolt} /> Quick log
          </h2>
          <div className="tk-chip-row">
            {exercises.slice(0, QUICK_LOG_COUNT).map((exercise) => (
              <button
                key={exercise.name}
                type="button"
                className="tk-chip"
                onClick={() => openNew({ name: exercise.name })}
              >
                <FontAwesomeIcon icon={faPlus} className="tk-chip-icon" />
                {exercise.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {!initialized && <FeedSkeleton />}
      {isEmpty && <EmptyState onAdd={() => openNew()} />}
      {days.map((day) => (
        <DaySection key={day.key} day={day} prLiftIds={prLiftIds} />
      ))}

      {initialized && hasMore && status !== 'error' && (
        <div ref={sentinelRef} className="tk-feed-status">
          {status === 'loading' && (
            <span className="spinner-border spinner-border-sm" role="status" aria-label="Loading more lifts" />
          )}
        </div>
      )}
      {status === 'error' && (
        <div className="tk-feed-status" role="alert">
          <p className="mb-0">Couldn&apos;t load your lifts.</p>
          <button type="button" className="tk-btn tk-btn-secondary" onClick={loadMore}>Try again</button>
        </div>
      )}
      {initialized && !hasMore && lifts.length > 0 && (
        <p className="tk-feed-end">That&apos;s everything. You&apos;ve reached your first lift.</p>
      )}
    </div>
  );
};

export default Index;
