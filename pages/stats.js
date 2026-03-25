import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import moment from 'moment';
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

const Stats = () => {
  const { data: session, status } = useSession({ required: true });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        if (data.success) {
          setStats(data.data);
        }
      } catch (error) {
        console.log('Failed to fetch stats');
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchStats();
    }
  }, [status]);

  const formatVolume = (vol) => {
    if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(1)}K`;
    return vol.toLocaleString();
  };

  const chartColors = {
    primary: 'rgb(59, 113, 159)',
    primaryFaded: 'rgba(59, 113, 159, 0.3)',
    grid: 'rgba(255, 255, 255, 0.1)',
    text: 'rgba(255, 255, 255, 0.7)',
  };

  const commonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        ticks: { color: chartColors.text, maxRotation: 45 },
        grid: { color: chartColors.grid },
      },
      y: {
        ticks: { color: chartColors.text },
        grid: { color: chartColors.grid },
        beginAtZero: true,
      },
    },
  };

  if (status !== 'authenticated') return null;

  if (loading) {
    return (
      <>
        <div className="d-none d-sm-block col-sm-2 p-0">
          <Sidebar />
        </div>
        <div className="col col-sm-10 p-0 bg-dark-2">
          <div className="flex-center p-5">
            <div className="spinner-grow"></div>
          </div>
        </div>
      </>
    );
  }

  if (!stats || stats.totalLifts === 0) {
    return (
      <>
        <div className="d-none d-sm-block col-sm-2 p-0">
          <Sidebar />
        </div>
        <div className="col col-sm-10 p-0 bg-dark-2">
          <div className="flex-center flex-column p-5">
            <FontAwesomeIcon icon="fa-solid fa-chart-line" size="10x" />
            <h2 className="mt-4">No data yet</h2>
            <p className="text-muted">Log some lifts to see your statistics</p>
          </div>
        </div>
      </>
    );
  }

  // --- Chart data ---
  const exerciseChartData = {
    labels: stats.topExercises.map((e) => e.name),
    datasets: [
      {
        data: stats.topExercises.map((e) => e.count),
        backgroundColor: chartColors.primary,
        borderRadius: 4,
      },
    ],
  };

  const volumeChartData = {
    labels: stats.volumeOverTime.map((w) =>
      moment(w.week).format('MMM D')
    ),
    datasets: [
      {
        data: stats.volumeOverTime.map((w) => w.volume),
        borderColor: chartColors.primary,
        backgroundColor: chartColors.primaryFaded,
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: chartColors.primary,
      },
    ],
  };

  const workoutFreqData = {
    labels: stats.workoutFrequency.map((w) =>
      moment(w.week).format('MMM D')
    ),
    datasets: [
      {
        data: stats.workoutFrequency.map((w) => w.count),
        backgroundColor: chartColors.primary,
        borderRadius: 4,
      },
    ],
  };

  const workoutFreqOptions = {
    ...commonChartOptions,
    scales: {
      ...commonChartOptions.scales,
      y: {
        ...commonChartOptions.scales.y,
        ticks: {
          ...commonChartOptions.scales.y.ticks,
          stepSize: 1,
        },
      },
    },
  };

  return (
    <>
      <div className="d-none d-sm-block col-sm-2 p-0">
        <Sidebar />
      </div>
      <div className="col col-sm-10 p-0 bg-dark-2">
        <div className="my-4 mx-5">
          <h2 className="mb-4">Statistics</h2>

          {/* Summary Cards */}
          <div className="row g-3 mb-4">
            <div className="col-6 col-md-3">
              <div className="stat-card bg-dark rounded p-3 h-100">
                <p className="text-muted mb-1 stat-label">Workouts</p>
                <h3 className="mb-0">{stats.totalWorkouts}</h3>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="stat-card bg-dark rounded p-3 h-100">
                <p className="text-muted mb-1 stat-label">Lifts</p>
                <h3 className="mb-0">{stats.totalLifts}</h3>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="stat-card bg-dark rounded p-3 h-100">
                <p className="text-muted mb-1 stat-label">Sets</p>
                <h3 className="mb-0">{stats.totalSets}</h3>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="stat-card bg-dark rounded p-3 h-100">
                <p className="text-muted mb-1 stat-label">Total Volume</p>
                <h3 className="mb-0">{formatVolume(stats.totalVolume)} lb</h3>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <div className="bg-dark rounded p-3">
                <h5 className="mb-3">Weekly Volume</h5>
                <div style={{ height: '250px' }}>
                  <Line data={volumeChartData} options={commonChartOptions} />
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="bg-dark rounded p-3">
                <h5 className="mb-3">Workouts Per Week</h5>
                <div style={{ height: '250px' }}>
                  <Bar data={workoutFreqData} options={workoutFreqOptions} />
                </div>
              </div>
            </div>
          </div>

          {/* Top Exercises Chart */}
          <div className="row g-3 mb-4">
            <div className="col-12">
              <div className="bg-dark rounded p-3">
                <h5 className="mb-3">Top Exercises</h5>
                <div style={{ height: '250px' }}>
                  <Bar
                    data={exerciseChartData}
                    options={{
                      ...commonChartOptions,
                      indexAxis: 'y',
                      scales: {
                        x: {
                          ticks: { color: chartColors.text, stepSize: 1 },
                          grid: { color: chartColors.grid },
                          beginAtZero: true,
                        },
                        y: {
                          ticks: { color: chartColors.text },
                          grid: { display: false },
                        },
                      },
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Personal Records Table */}
          {stats.personalRecords.length > 0 && (
            <div className="row g-3 mb-4">
              <div className="col-12">
                <div className="bg-dark rounded p-3">
                  <h5 className="mb-3">Personal Records</h5>
                  <div className="table-responsive">
                    <table className="table table-dark table-hover mb-0">
                      <thead>
                        <tr className="text-muted">
                          <th>Exercise</th>
                          <th>Weight</th>
                          <th>Reps</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.personalRecords.map((pr) => (
                          <tr key={pr.name}>
                            <td>{pr.name}</td>
                            <td>{pr.weight} {pr.metric}</td>
                            <td>{pr.reps}</td>
                            <td>{moment(pr.date).format('MMM D, YYYY')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Stats;
