import { useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import useSWR from 'swr';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFire, faUserPlus } from '@fortawesome/free-solid-svg-icons';
import Avatar from '../components/Avatar';
import { fetcher, leaderboardKey } from '../lib/api';
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

// value(entry) is what's ranked; format(value, units) returns [number, label]
const METRICS = [
  {
    key: 'workouts',
    label: 'Workouts',
    hint: 'Days with a lift, run, walk or ride.',
    value: (e) => e.workouts,
    format: (v) => [v, v === 1 ? 'workout' : 'workouts'],
  },
  {
    key: 'volume',
    label: 'Volume',
    hint: 'Weight × reps across every set.',
    value: (e) => e.volumeKg,
    format: (v, units) => [compact(fromKg(v, units.weight)), units.weight],
  },
  { key: 'sets', label: 'Sets', value: (e) => e.sets, format: (v) => [v.toLocaleString(), v === 1 ? 'set' : 'sets'] },
  {
    key: 'prs',
    label: 'PRs',
    hint: 'Sessions that beat your previous best weight on a lift.',
    value: (e) => e.prs,
    format: (v) => [v, v === 1 ? 'PR' : 'PRs'],
  },
  {
    key: 'streak',
    label: 'Streak',
    hint: 'Weeks in a row with at least one workout. Not affected by the time range.',
    value: (e) => e.streak,
    format: (v) => [v, v === 1 ? 'week' : 'weeks'],
  },
  ...CARDIO_KINDS.map((kind) => ({
    key: kind.key,
    label: kind.activity,
    hint: `Total ${kind.activity.toLowerCase()} distance.`,
    value: (e) => e.distanceKm?.[kind.key] || 0,
    format: (v, units) => (v ? [distance(fromKm(v, units.distance)), units.distance] : ['–', '']),
  })),
  ...BIG_LIFTS.map((lift) => ({
    key: lift.key,
    label: lift.label,
    hint: `Estimated one-rep max from the best ${lift.label.toLowerCase()} set of 12 reps or fewer.`,
    value: (e) => e.e1rm[lift.key] || 0,
    format: (v, units) => (v ? [Math.round(fromKg(v, units.weight)), `${units.weight} e1RM`] : ['–', '']),
  })),
];

// Standard competition ranking: ties share a rank (1, 1, 3)
function rank(entries, metric) {
  const sorted = entries
    .map((entry) => ({ ...entry, score: metric.value(entry) }))
    .sort((a, b) => b.score - a.score || b.isYou - a.isYou || a.displayName.localeCompare(b.displayName));
  sorted.forEach((entry, i) => {
    entry.rank = i > 0 && entry.score === sorted[i - 1].score ? sorted[i - 1].rank : i + 1;
  });
  return sorted;
}

function SkeletonRows() {
  return Array.from({ length: 3 }, (_, i) => (
    <li key={i} className="tk-rank-row">
      <span className="tk-skeleton" style={{ width: 28, height: 28, borderRadius: 999 }} />
      <span className="tk-skeleton" style={{ width: 40, height: 40, borderRadius: 999 }} />
      <span className="tk-skeleton" style={{ flex: 1, height: 16 }} />
    </li>
  ));
}

const Leaderboard = () => {
  const [period, setPeriod] = useState(PERIODS[0].key);
  const [metricKey, setMetricKey] = useState(METRICS[0].key);
  const units = usePreferredUnits();
  const { data, error, isLoading, mutate } = useSWR(leaderboardKey(period), fetcher, { keepPreviousData: true });

  const metric = METRICS.find((m) => m.key === metricKey);
  const entries = useMemo(() => (data ? rank(data.entries, metric) : []), [data, metric]);
  const soloOnly = data && data.entries.length <= 1;

  return (
    <div className="tk-page tk-page-narrow">
      <Head><title>Leaderboard · trackkilo</title></Head>
      <header className="tk-page-header">
        <div>
          <p className="tk-eyebrow">You and your friends</p>
          <h1 className="tk-page-title">Leaderboard</h1>
        </div>
      </header>

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

      {error && !data ? (
        <div className="tk-feed-status" role="alert">
          <p className="mb-0">Couldn&apos;t load the leaderboard.</p>
          <button type="button" className="tk-btn tk-btn-secondary" onClick={() => mutate()}>Try again</button>
        </div>
      ) : (
        <ol className={`tk-card tk-rank-list${isLoading && data ? ' is-refreshing' : ''}`}>
          {!data && <SkeletonRows />}
          {entries.map((entry) => {
            const [value, label] = metric.format(entry.score, units);
            const medal = entry.score > 0 && entry.rank <= 3 ? entry.rank : null;
            return (
              <li key={entry.username} className={`tk-rank-row${entry.isYou ? ' is-you' : ''}`}>
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
          })}
        </ol>
      )}

      {soloOnly && (
        <div className="tk-callout">
          <div>
            <strong>It&apos;s lonely at the top.</strong>
            <span> Add friends to see how you stack up.</span>
          </div>
          <Link href="/friends" className="tk-btn tk-btn-sm tk-btn-primary">
            <FontAwesomeIcon icon={faUserPlus} /> Find friends
          </Link>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
