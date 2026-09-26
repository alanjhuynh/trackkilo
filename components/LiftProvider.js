import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { mutate } from 'swr';
import { EXERCISES_KEY, STATS_KEY, request } from '../lib/api';

const PAGE_SIZE = 20;

const LiftContext = createContext(null);

// Log order: newest date first, ties broken by id (matches the API)
const isAfterCursor = (lift, cursor) =>
  lift.date < cursor.date || (lift.date === cursor.date && lift._id < cursor._id);

// Stats and exercise summaries cover every lift, so refresh them after any change
const revalidateSummaries = () => {
  mutate(EXERCISES_KEY);
  mutate(STATS_KEY);
};

/**
 * The lifts loaded into the log, shared across pages so navigating away and
 * back doesn't refetch. Pages are fetched with a cursor (the last lift of the
 * previous page) and merged by id.
 */
function LiftProvider({ children }) {
  const [lifts, setLifts] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [status, setStatus] = useState('idle'); // idle | loading | error
  const [initialized, setInitialized] = useState(false);
  const cursor = useRef(null);
  const moreRef = useRef(true);
  const inFlight = useRef(false);

  // Add or replace a lift. Lifts older than everything loaded so far are
  // skipped; they'll arrive in order with a later page.
  const upsert = useCallback((lift) => {
    setLifts((current) => {
      const rest = current.filter((l) => l._id !== lift._id);
      if (moreRef.current && cursor.current && isAfterCursor(lift, cursor.current)) return rest;
      return [...rest, lift];
    });
  }, []);

  const loadMore = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setStatus('loading');

    try {
      const params = new URLSearchParams({ limit: PAGE_SIZE });
      if (cursor.current) {
        params.set('before', cursor.current.date);
        params.set('beforeId', cursor.current._id);
      }
      const { data, hasMore: more } = await request(`/api/lifts?${params}`);

      if (data.length) cursor.current = data[data.length - 1];
      moreRef.current = more;
      setLifts((current) => {
        const byId = new Map(current.map((lift) => [lift._id, lift]));
        data.forEach((lift) => byId.set(lift._id, lift));
        return [...byId.values()];
      });
      setHasMore(more);
      setStatus('idle');
    } catch (error) {
      setStatus('error');
    } finally {
      inFlight.current = false;
      setInitialized(true);
    }
  }, []);

  const createLift = useCallback(async (payload) => {
    const { data } = await request('/api/lifts', { method: 'POST', body: payload });
    upsert(data);
    revalidateSummaries();
    return data;
  }, [upsert]);

  const updateLift = useCallback(async (id, payload) => {
    const { data } = await request(`/api/lifts/${id}`, { method: 'PUT', body: payload });
    upsert(data);
    revalidateSummaries();
    return data;
  }, [upsert]);

  const deleteLift = useCallback(async (id) => {
    await request(`/api/lifts/${id}`, { method: 'DELETE' });
    setLifts((current) => current.filter((lift) => lift._id !== id));
    revalidateSummaries();
  }, []);

  const value = useMemo(() => ({
    lifts, hasMore, status, initialized, loadMore, createLift, updateLift, deleteLift,
  }), [lifts, hasMore, status, initialized, loadMore, createLift, updateLift, deleteLift]);

  return <LiftContext.Provider value={value}>{children}</LiftContext.Provider>;
}

const useLifts = () => useContext(LiftContext);

export { LiftProvider, useLifts };
