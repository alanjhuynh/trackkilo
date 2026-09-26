import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { useSession, signOut } from 'next-auth/react';
import toast from 'react-hot-toast';
import moment from 'moment';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileArrowDown, faFileArrowUp, faRightFromBracket,
} from '@fortawesome/free-solid-svg-icons';
import Avatar from '../components/Avatar';
import ImportModal from '../components/ImportModal';
import useProfile from '../lib/useProfile';
import { request } from '../lib/api';
import { downloadFile, liftsToCsv, liftsToJson, parseImportFile } from '../lib/dataTransfer';
import {
  getPreferredDistanceUnit, getPreferredUnit, setPreferredDistanceUnit, setPreferredUnit,
} from '../lib/prefs';
import { METRICS } from '../lib/sets';
import { DISTANCE_UNITS } from '../lib/activities';

const USERNAME_MAX = 20;

const Spinner = () => <span className="spinner-border spinner-border-sm" role="status" aria-label="Working" />;

function ProfileSection() {
  const { data: session } = useSession();
  const { profile, mutate } = useProfile();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setUsername(profile.username);
    }
  }, [profile]);

  const dirty = profile && (displayName !== profile.displayName || username !== profile.username);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const { data, censored } = await request('/api/profile', { method: 'PUT', body: { displayName, username } });
      mutate(data, { revalidate: false });
      toast.success('Profile saved');
      if (censored) toast('Some words in your display name were censored', { icon: '🤐' });
    } catch (error) {
      setErrors({ [error.field || 'form']: error.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="tk-card tk-section" aria-labelledby="profile-title">
      <h2 id="profile-title" className="tk-section-title">Profile</h2>
      <div className="tk-profile-row">
        <Avatar user={{ displayName, image: session?.user?.image }} size={52} />
        <div className="tk-person-text">
          <div className="tk-person-name">{displayName || ' '}</div>
          <div className="tk-person-meta">Signed in as {session?.user?.email}</div>
        </div>
      </div>
      <form onSubmit={save} noValidate>
        <div className="tk-field">
          <label className="tk-label" htmlFor="display-name">Display name</label>
          <input
            id="display-name"
            className={`tk-input${errors.displayName ? ' is-invalid' : ''}`}
            maxLength={40}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          {errors.displayName && <div className="tk-field-error">{errors.displayName}</div>}
        </div>
        <div className="tk-field">
          <label className="tk-label" htmlFor="username">Username</label>
          <div className="tk-prefixed">
            <span aria-hidden="true">@</span>
            <input
              id="username"
              className={`tk-input${errors.username ? ' is-invalid' : ''}`}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={USERNAME_MAX}
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            />
          </div>
          {errors.username
            ? <div className="tk-field-error">{errors.username}</div>
            : <p className="tk-hint">Friends find you by this. Letters, numbers and underscores.</p>}
        </div>
        {errors.form && <div className="tk-field-error">{errors.form}</div>}
        <button type="submit" className="tk-btn tk-btn-primary" disabled={!dirty || saving}>
          {saving ? <Spinner /> : 'Save profile'}
        </button>
      </form>
    </section>
  );
}

function UnitSetting({ id, name, hint, options, value, onChange }) {
  return (
    <div className="tk-setting-row">
      <div>
        <div className="tk-setting-name" id={id}>{name}</div>
        <p className="tk-hint mt-1">{hint}</p>
      </div>
      <div className="tk-segmented tk-segmented-sm" role="group" aria-labelledby={id}>
        {options.map((option) => (
          <button key={option} type="button" aria-pressed={value === option} onClick={() => onChange(option)}>
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function PreferencesSection() {
  const [unit, setUnit] = useState('lb');
  const [distanceUnit, setDistanceUnit] = useState('mi');
  useEffect(() => {
    setUnit(getPreferredUnit());
    setDistanceUnit(getPreferredDistanceUnit());
  }, []);

  return (
    <section className="tk-card tk-section" aria-labelledby="prefs-title">
      <h2 id="prefs-title" className="tk-section-title">Preferences</h2>
      <UnitSetting
        id="unit-label"
        name="Weight unit"
        hint="Used for new lifts and leaderboard totals on this device."
        options={METRICS}
        value={unit}
        onChange={(option) => {
          setUnit(option);
          setPreferredUnit(option);
        }}
      />
      <UnitSetting
        id="distance-unit-label"
        name="Distance unit"
        hint="Used for new runs, walks and rides, and distance totals."
        options={DISTANCE_UNITS}
        value={distanceUnit}
        onChange={(option) => {
          setDistanceUnit(option);
          setPreferredDistanceUnit(option);
        }}
      />
    </section>
  );
}

function DataSection() {
  const [exporting, setExporting] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [fileName, setFileName] = useState('');
  const fileInput = useRef(null);

  const exportAs = async (format) => {
    setExporting(format);
    try {
      const { data } = await request('/api/export');
      if (!data.length) {
        toast('Nothing to export yet', { icon: 'ℹ️' });
        return;
      }
      const stamp = moment().format('YYYY-MM-DD');
      if (format === 'csv') downloadFile(`trackkilo-${stamp}.csv`, liftsToCsv(data), 'text/csv;charset=utf-8');
      else downloadFile(`trackkilo-${stamp}.json`, liftsToJson(data), 'application/json');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setExporting(null);
    }
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow choosing the same file again
    if (!file) return;
    const result = parseImportFile(file.name, await file.text(), {
      weight: getPreferredUnit(),
      distance: getPreferredDistanceUnit(),
    });
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setFileName(file.name);
    setParsed(result);
  };

  return (
    <section className="tk-card tk-section" aria-labelledby="data-title">
      <h2 id="data-title" className="tk-section-title">Import &amp; export</h2>
      <div className="tk-setting-row">
        <div>
          <div className="tk-setting-name">Export your log</div>
          <p className="tk-hint mt-1">Every lift, run, walk and ride, as a spreadsheet (CSV) or JSON.</p>
        </div>
        <div className="tk-button-row">
          <button type="button" className="tk-btn tk-btn-sm tk-btn-secondary" disabled={Boolean(exporting)} onClick={() => exportAs('csv')}>
            {exporting === 'csv' ? <Spinner /> : <><FontAwesomeIcon icon={faFileArrowDown} /> CSV</>}
          </button>
          <button type="button" className="tk-btn tk-btn-sm tk-btn-secondary" disabled={Boolean(exporting)} onClick={() => exportAs('json')}>
            {exporting === 'json' ? <Spinner /> : <><FontAwesomeIcon icon={faFileArrowDown} /> JSON</>}
          </button>
        </div>
      </div>
      <div className="tk-setting-row">
        <div>
          <div className="tk-setting-name">Import lifts</div>
          <p className="tk-hint mt-1">
            A trackkilo export, or a CSV from another app with one row per set and date, exercise and reps columns.
            You’ll see a preview first.
          </p>
        </div>
        <button type="button" className="tk-btn tk-btn-sm tk-btn-secondary" onClick={() => fileInput.current?.click()}>
          <FontAwesomeIcon icon={faFileArrowUp} /> Choose file
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".csv,.json,text/csv,application/json"
          className="d-none"
          aria-label="Import file"
          onChange={onFile}
        />
      </div>
      <ImportModal fileName={fileName} result={parsed} onHide={() => setParsed(null)} />
    </section>
  );
}

const Settings = () => (
  <div className="tk-page tk-page-narrow">
    <Head><title>Settings · trackkilo</title></Head>
    <header className="tk-page-header">
      <div>
        <p className="tk-eyebrow">Profile, preferences and data</p>
        <h1 className="tk-page-title">Settings</h1>
      </div>
    </header>

    <ProfileSection />
    <PreferencesSection />
    <DataSection />

    <button type="button" className="tk-btn tk-btn-ghost tk-signout" onClick={() => signOut({ callbackUrl: '/login' })}>
      <FontAwesomeIcon icon={faRightFromBracket} /> Sign out
    </button>
  </div>
);

export default Settings;
