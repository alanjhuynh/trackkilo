import Head from 'next/head';
import useSWR from 'swr';
import moment from 'moment';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine, faPlus, faTrophy } from '@fortawesome/free-solid-svg-icons';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import KindIcon from '../components/KindIcon';
import { useLiftForm } from '../components/LiftFormProvider';
import { STATS_KEY, fetcher } from '../lib/api';
import { formatWeight } from '../lib/format';
import { cardioKind, formatDistance, formatHours, fromKm } from '../lib/activities';
import { usePreferredUnits } from '../lib/prefs';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

ChartJS.defaults.font.family = "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
ChartJS.defaults.color = '#9aa4af';

const chartColors = {
  primary: 'rgb(59, 113, 159)',
  primaryFaded: 'rgba(59, 113, 159, 0.25)',
  grid: 'rgba(255, 255, 255, 0.06)',
};

const commonChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#262b31',
      borderColor: '#353c45',
      borderWidth: 1,
      padding: 10,
      displayColors: false,
    },
  },
  scales: {
    x: {
      ticks: { maxRotation: 0, autoSkipPadding: 12 },
      grid: { display: false },
    },
    y: {
      grid: { color: chartColors.grid },
      border: { display: false },
      beginAtZero: true,
    },
  },
};

const formatVolume = (vol) => {
  if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
  if (vol >= 1000) return `${(vol / 1000).toFixed(1)}K`;
  return vol.toLocaleString();
};

const weekLabel = (week) => moment(week).format('MMM D');

function StatTile({ label, value }) {
  return (
    <div className="tk-card tk-stat">
      <p className="tk-stat-label">{label}</p>
      <p className="tk-stat-value">{value}</p>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <section className="tk-card tk-panel">
      <h2 className="tk-panel-title">{title}</h2>
      {children}
    </section>
  );
}

function PageHeader() {
  return (
    <header className="tk-page-header">
      <div>
        <p className="tk-eyebrow">Your training at a glance</p>
        <h1 className="tk-page-title">Statistics</h1>
      </div>
    </header>
  );
}

const Stats = () => {
  const { data: stats, error, isLoading, mutate } = useSWR(STATS_KEY, fetcher, { revalidateOnFocus: false });
  const { openNew } = useLiftForm();
  const { distance: distanceUnit } = usePreferredUnits();

  if (isLoading) {
    return (
      <div className="tk-page">
        <Head><title>Stats · trackkilo</title></Head>
        <PageHeader />
        <div className="tk-feed-status">
          <span className="spinner-border spinner-border-sm" role="status" aria-label="Loading statistics" />
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="tk-page">
        <Head><title>Stats · trackkilo</title></Head>
        <PageHeader />
        <div className="tk-feed-status" role="alert">
          <p className="mb-0">Couldn&apos;t load your statistics.</p>
          <button type="button" className="tk-btn tk-btn-secondary" onClick={() => mutate()}>Try again</button>
        </div>
      </div>
    );
  }

  if (!stats || !(stats.totalEntries ?? stats.totalLifts)) {
    return (
      <div className="tk-page">
        <Head><title>Stats · trackkilo</title></Head>
        <PageHeader />
        <div className="tk-empty">
          <div className="tk-empty-icon"><FontAwesomeIcon icon={faChartLine} /></div>
          <h2 className="tk-empty-title">No data yet</h2>
          <p className="tk-empty-text">Log some workouts to see your statistics.</p>
          <button type="button" className="tk-btn tk-btn-primary" onClick={() => openNew()}>
            <FontAwesomeIcon icon={faPlus} /> Log a lift
          </button>
        </div>
      </div>
    );
  }

  // Volume, top exercises and PRs only make sense once there are lifts
  const hasLifts = stats.totalLifts > 0;

  // --- Chart data ---
  const exerciseChartData = {
    labels: stats.topExercises.map((e) => e.name),
    datasets: [
      {
        data: stats.topExercises.map((e) => e.count),
        backgroundColor: chartColors.primary,
        borderRadius: 4,
        maxBarThickness: 22,
      },
    ],
  };

  const volumeChartData = {
    labels: stats.volumeOverTime.map((w) => weekLabel(w.week)),
    datasets: [
      {
        data: stats.volumeOverTime.map((w) => w.volume),
        borderColor: chartColors.primary,
        backgroundColor: chartColors.primaryFaded,
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: chartColors.primary,
      },
    ],
  };

  const workoutFreqData = {
    labels: stats.workoutFrequency.map((w) => weekLabel(w.week)),
    datasets: [
      {
        data: stats.workoutFrequency.map((w) => w.count),
        backgroundColor: chartColors.primary,
        borderRadius: 4,
        maxBarThickness: 32,
      },
    ],
  };

  const workoutFreqOptions = {
    ...commonChartOptions,
    scales: {
      ...commonChartOptions.scales,
      y: {
        ...commonChartOptions.scales.y,
        ticks: { stepSize: 1 },
      },
    },
  };

  const exerciseChartOptions = {
    ...commonChartOptions,
    indexAxis: 'y',
    scales: {
      x: {
        ticks: { stepSize: 1 },
        grid: { color: chartColors.grid },
        border: { display: false },
        beginAtZero: true,
      },
      y: {
        grid: { display: false },
      },
    },
  };

  return (
    <div className="tk-page">
      <Head><title>Stats · trackkilo</title></Head>
      <PageHeader />

      <div className="tk-stat-grid">
        <StatTile label="Workouts" value={stats.totalWorkouts.toLocaleString()} />
        <StatTile label="Lifts" value={stats.totalLifts.toLocaleString()} />
        <StatTile label="Sets" value={stats.totalSets.toLocaleString()} />
        <StatTile label="Total volume" value={`${formatVolume(stats.totalVolume)} lb`} />
      </div>

      <div className="tk-panel-grid">
        {hasLifts && (
          <Panel title="Weekly volume">
            <div className="tk-chart">
              <Line data={volumeChartData} options={commonChartOptions} />
            </div>
          </Panel>
        )}
        <Panel title="Workouts per week">
          <div className="tk-chart">
            <Bar data={workoutFreqData} options={workoutFreqOptions} />
          </div>
        </Panel>
      </div>

      {stats.cardio?.length > 0 && (
        <Panel title="Runs, walks and rides">
          <div className="tk-cardio-totals">
            {stats.cardio.map((totals) => {
              const kind = cardioKind(totals.kind);
              return (
                <div key={totals.kind} className={`tk-cardio-total tk-kind-${totals.kind}`}>
                  <div className="tk-cardio-total-head">
                    <span className="tk-kind-badge"><KindIcon kind={totals.kind} /></span>
                    {kind.plural.charAt(0).toUpperCase() + kind.plural.slice(1)}
                  </div>
                  <dl className="tk-cardio-stats">
                    <div><dt>Sessions</dt><dd>{totals.count.toLocaleString()}</dd></div>
                    <div><dt>Distance</dt><dd>{formatDistance(fromKm(totals.distanceKm, distanceUnit), distanceUnit)}</dd></div>
                    <div><dt>Time</dt><dd>{formatHours(totals.duration)}</dd></div>
                    <div><dt>Longest</dt><dd>{formatDistance(fromKm(totals.longestKm, distanceUnit), distanceUnit)}</dd></div>
                  </dl>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {hasLifts && (
        <div className="tk-panel-grid">
          <Panel title="Top exercises">
            <div className="tk-chart" style={{ height: Math.max(160, stats.topExercises.length * 32 + 40) }}>
              <Bar data={exerciseChartData} options={exerciseChartOptions} />
            </div>
          </Panel>

          {stats.personalRecords.length > 0 && (
            <Panel title="Personal records">
              <ul className="tk-pr-list">
                {stats.personalRecords.map((pr) => (
                  <li key={pr.name} className="tk-pr-row">
                    <span className="tk-pr-icon"><FontAwesomeIcon icon={faTrophy} /></span>
                    <div className="tk-pr-name">
                      {pr.name}
                      <span className="tk-pr-date">{moment(pr.date).format('MMM D, YYYY')}</span>
                    </div>
                    <div className="tk-pr-value">
                      {formatWeight(pr.weight, pr.metric)}
                      <span> × {pr.reps}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      )}
    </div>
  );
};

export default Stats;
