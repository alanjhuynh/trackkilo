import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import useSWR, { mutate as mutateKey } from 'swr';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEarthAmericas, faFire, faUserGroup, faUserPlus,
} from '@fortawesome/free-solid-svg-icons';
import Avatar from '../components/Avatar';
import { PROFILE_KEY, fetcher, leaderboardKey, request } from '../lib/api';
import { BIG_LIFTS, PERIODS } from '../lib/leaderboard';
import { usePreferredUnits } from '../lib/prefs';
import { CARDIO_KINDS, fromKm } from '../lib/activities';

const LB_PER_KG = 2.20462262;

const fromKg = (kg, unit) => (unit === 'kg' ? kg : kg * LB_PER_KG);

function compact(number) {
  if (number >= 1000000) return `${(number / 1000000).toFixed(1)}M`;
  if (number >= 10000) return `${Math.round(number / 1000)}K`;
  if (number >= 1000) return `${(number / 1000).toFixed(1)}K`;
  return Math.round(number).toLocaleString();
}

// 3.14 → "3.1", 123.4 → "123"
const distance = (value) => (value >= 100 ? Math.round(value).toLocaleString() : value.toFixed(1));

const SCOPES = [
  { key: 'friends', label: 'Friends', icon: faUserGroup, eyebrow: 'You and your friends' },
  { key: 'public', label: 'Everyone', icon: faEarthAmericas, eyebrow: 'Everyone who’s opted in' },
];

// The server ranks by `key`; format(score, units) returns [number, label]
const METRICS = [
  {
    key: 'workouts',
    label: 'Workouts',
    hint: 'Days with a lift, run, walk or ride.',
    format: (v) => [v, v === 1 ? 'workout' : 'workouts'],
  },
  {
    key: 'volume',
    label: 'Volume',
    hint: 'Weight × reps across every set.',
    format: (v, units) => [compact(fromKg(v, units.weight)), units.weight],
  },
  { key: 'sets', label: 'Sets', format: (v) => [v.toLocaleString(), v === 1 ? 'set' : 'sets'] },
  {
    key: 'prs',
    label: 'PRs',
    hint: 'Sessions that beat your previous best weight on a lift.',
    format: (v) => [v, v === 1 ? 'PR' : 'PRs'],
  },
  {
    key: 'streak',
    label: 'Streak',
    hint: 'Weeks in a row with at least one workout. Not affected by the time range.',
    format: (v) => [v, v === 1 ? 'week' : 'weeks'],
  },
  ...CARDIO_KINDS.map((kind) => ({
    key: kind.key,
    label: kind.activity,
    hint: `Total ${kind.activity.toLowerCase()} distance.`,
    format: (v, units) => (v ? [distance(fromKm(v, units.distance)), units.distance] : ['–', '']),
  })),
  ...BIG_LIFTS.map((lift) => ({
    key: lift.key,
    label: lift.label,
    hint: `Estimated one-rep max from the best ${lift.label.toLowerCase()} set of 12 reps or fewer.`,
    format: (v, units) => (v ? [Math.round(fromKg(v, units.weight)), `${units.weight} e1RM`] : ['–', '']),
  })),
];

function SkeletonRows() {
  return Array.from({ length: 3 }, (_, i) => (
    <li key={i} className="tk-rank-row">
      <span className="tk-skeleton" style={{ width: 28, height: 28, borderRadius: 999 }} />
      <span className="tk-skeleton" style={{ width: 40, height: 40, borderRadius: 999 }} />
      <span className="tk-skeleton" style={{ flex: 1, height: 16 }} />
    </li>
  ));
}

function RankRow({ entry, metric, units }) {
  const [value, label] = metric.format(entry.score, units);
  const medal = entry.score > 0 && entry.rank <= 3 ? entry.rank : null;
  return (
    <li className={`tk-rank-row${entry.isYou ? ' is-you' : ''}`}>
      <span className={`tk-rank${medal ? ` tk-rank-${medal}` : ''}`}>{entry.rank}</span>
      <Avatar user={entry} size={40} />
      <div className="tk-person-text">
        <div className="tk-person-name">
          {entry.displayName}
          {entry.isYou && <span className="tk-you">You</span>}
        </div>
        <div className="tk-person-meta">@{entry.username}</div>
      </div>
      <div className="tk-rank-value">
        <strong>{value}</strong>
        {label && <span>{label}</span>}
      </div>
    </li>
  );
}

// Shown on the public board to people who haven't opted in
function JoinPublic({ onJoined }) {
  const [joining, setJoining] = useState(false);

  const join = async () => {
    setJoining(true);
    try {
      const { data } = await request('/api/profile', { method: 'PUT', body: { publicLeaderboard: true } });
      mutateKey(PROFILE_KEY, data, { revalidate: false });
      toast.success('You’re on the public leaderboard');
      onJoined();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="tk-callout tk-callout-public">
      <div>
        <strong>You&apos;re not on the public leaderboard.</strong>
        <span> Join to show your name, photo and training totals here. Your workouts stay visible to friends only.</span>
      </div>
      <button type="button" className="tk-btn tk-btn-sm tk-btn-primary" onClick={join} disabled={joining}>
        {joining ? <span className="spinner-border spinner-border-sm" role="status" aria-label="Joining" /> : 'Join'}
      </button>
    </div>
  );
}

const Leaderboard = () => {
  const [scopeKey, setScopeKey] = useState(SCOPES[0].key);
  const [period, setPeriod] = useState(PERIODS[0].key);
  const [metricKey, setMetricKey] = useState(METRICS[0].key);
  const units = usePreferredUnits();
  const { data, error, isLoading, mutate } = useSWR(
    leaderboardKey({ scope: scopeKey, period, metric: metricKey }),
    fetcher,
    { keepPreviousData: true },
  );

  const scope = SCOPES.find((s) => s.key === scopeKey);
  const metric = METRICS.find((m) => m.key === metricKey);
  // Keep showing the previous board's rows (dimmed) while switching
  const shownMetric = METRICS.find((m) => m.key === data?.metric) || metric;
  const isPublic = data?.scope === 'public';
  const entries = data?.entries || [];

  return (
    <div className="tk-page tk-page-narrow">
      <Head><title>Leaderboard · trackkilo</title></Head>
      <header className="tk-page-header">
        <div>
          <p className="tk-eyebrow">{scope.eyebrow}</p>
          <h1 className="tk-page-title">Leaderboard</h1>
        </div>
      </header>

      <div className="tk-segmented tk-scope" role="group" aria-label="Leaderboard">
        {SCOPES.map((s) => (
          <button key={s.key} type="button" aria-pressed={scopeKey === s.key} onClick={() => setScopeKey(s.key)}>
            <FontAwesomeIcon icon={s.icon} /> {s.label}
          </button>
        ))}
      </div>

      <div className="tk-segmented tk-period" role="group" aria-label="Time range">
        {PERIODS.map((p) => (
          <button key={p.key} type="button" aria-pressed={period === p.key} onClick={() => setPeriod(p.key)}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="tk-chip-row tk-metric-row" role="group" aria-label="Rank by">
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            className={`tk-chip${m.key === metricKey ? ' active' : ''}`}
            aria-pressed={m.key === metricKey}
            onClick={() => setMetricKey(m.key)}
          >
            {m.key === 'streak' && <FontAwesomeIcon icon={faFire} className="tk-chip-icon" />}
            {m.label}
          </button>
        ))}
      </div>
      {metric.hint && <p className="tk-hint tk-metric-hint">{metric.hint}</p>}

      {isPublic && !data.joined && <JoinPublic onJoined={() => mutate()} />}

      {error && !data ? (
        <div className="tk-feed-status" role="alert">
          <p className="mb-0">Couldn&apos;t load the leaderboard.</p>
          <button type="button" className="tk-btn tk-btn-secondary" onClick={() => mutate()}>Try again</button>
        </div>
      ) : (
        <ol className={`tk-card tk-rank-list${isLoading && data ? ' is-refreshing' : ''}`}>
          {!data && <SkeletonRows />}
          {entries.map((entry) => (
            <RankRow key={entry.username} entry={entry} metric={shownMetric} units={units} />
          ))}
          {data?.you && (
            <>
              <li className="tk-rank-gap" aria-hidden="true">…</li>
              <RankRow entry={data.you} metric={shownMetric} units={units} />
            </>
          )}
          {data && !entries.length && (
            <li className="tk-empty-inline">
              {isPublic ? 'No one on the public leaderboard has logged this yet.' : 'Nothing logged yet.'}
            </li>
          )}
        </ol>
      )}

      {isPublic && data.joined && (
        <p className="tk-hint tk-board-note">
          You&apos;re on the public leaderboard. You can leave it in <Link href="/settings">Settings</Link>.
        </p>
      )}

      {data?.scope === 'friends' && entries.length <= 1 && (
        <div className="tk-callout">
          <div>
            <strong>It&apos;s lonely at the top.</strong>
            <span> Add friends to see how you stack up.</span>
          </div>
          <Link href="/friends?tab=friends" className="tk-btn tk-btn-sm tk-btn-primary">
            <FontAwesomeIcon icon={faUserPlus} /> Find friends
          </Link>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
