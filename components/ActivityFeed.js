import { useEffect, useRef } from 'react';
import useSWRInfinite from 'swr/infinite';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPeopleGroup, faUserPlus } from '@fortawesome/free-solid-svg-icons';
import WorkoutCard from './WorkoutCard';
import { fetcher } from '../lib/api';

// Page n continues from the previous page's cursor
const pageKey = (index, previous) => {
  if (previous && !previous.nextCursor) return null;
  return index === 0 ? '/api/feed' : `/api/feed?${new URLSearchParams(previous.nextCursor)}`;
};

function FeedSkeleton() {
  return Array.from({ length: 2 }, (_, i) => (
    <div key={i} className="tk-card tk-workout" aria-hidden="true">
      <div className="tk-workout-header">
        <span className="tk-skeleton" style={{ width: 40, height: 40, borderRadius: 999 }} />
        <span className="tk-skeleton" style={{ width: '45%', height: 16 }} />
      </div>
      <span className="tk-skeleton" style={{ width: '100%', height: 14 }} />
      <span className="tk-skeleton" style={{ width: '80%', height: 14 }} />
    </div>
  ));
}

/**
 * Workouts from you and your friends, newest first, loading more as you scroll.
 * `hasFriends` tailors the empty state; `onFindFriends` opens the Friends tab.
 */
export default function ActivityFeed({ hasFriends, onFindFriends }) {
  const { data, error, size, setSize, isLoading, mutate } = useSWRInfinite(pageKey, fetcher, {
    revalidateOnFocus: false,
  });
  const sentinelRef = useRef(null);

  const items = data ? data.flatMap((page) => page.items) : [];
  const hasMore = Boolean(data?.[data.length - 1]?.nextCursor);
  const loadingMore = Boolean(data) && size > data.length;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || loadingMore) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setSize((current) => current + 1); },
      { rootMargin: '600px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, setSize]);

  if (!data && isLoading) return <div className="tk-feed"><FeedSkeleton /></div>;

  if (error && !data) {
    return (
      <div className="tk-feed-status" role="alert">
        <p className="mb-0">Couldn&apos;t load activity.</p>
        <button type="button" className="tk-btn tk-btn-secondary" onClick={() => mutate()}>Try again</button>
      </div>
    );
  }

  return (
    <div className="tk-feed">
      {!hasFriends && (
        <div className="tk-callout">
          <div>
            <strong>Your workouts show up here.</strong>
            <span> Add friends to see theirs, and to like and comment on each other&apos;s.</span>
          </div>
          <button type="button" className="tk-btn tk-btn-sm tk-btn-primary" onClick={onFindFriends}>
            <FontAwesomeIcon icon={faUserPlus} /> Find friends
          </button>
        </div>
      )}

      {!items.length && (
        <div className="tk-empty">
          <div className="tk-empty-icon"><FontAwesomeIcon icon={faPeopleGroup} /></div>
          <h2 className="tk-empty-title">No activity yet</h2>
          <p className="tk-empty-text">When you or your friends log a workout, it shows up here.</p>
        </div>
      )}

      {items.map((workout) => (
        <WorkoutCard key={`${workout.owner.username}|${workout.date}`} workout={workout} />
      ))}

      {hasMore && (
        <div ref={sentinelRef} className="tk-feed-status">
          {loadingMore && <span className="spinner-border spinner-border-sm" role="status" aria-label="Loading more activity" />}
        </div>
      )}
      {error && data && (
        <div className="tk-feed-status" role="alert">
          <button type="button" className="tk-btn tk-btn-secondary" onClick={() => mutate()}>Try again</button>
        </div>
      )}
    </div>
  );
}
