import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession, signIn } from 'next-auth/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBolt, faChartLine, faTrophy, faUserGroup } from '@fortawesome/free-solid-svg-icons';
import { Brand } from '../components/Navbar';

// Error codes next-auth appends as ?error=
const ERROR_MESSAGES = {
  OAuthAccountNotLinked: 'That email is already linked to a different sign-in method.',
  AccessDenied: 'Access was denied. Try a different Google account.',
};
const DEFAULT_ERROR = 'Sign-in didn’t go through. Please try again.';
const SILENT_ERRORS = ['SessionRequired']; // just "you need to sign in", not a failure

const FEATURES = [
  { icon: faBolt, title: 'Fast logging', text: 'Common lifts are one tap away, with sets filled in from your last session.' },
  { icon: faTrophy, title: 'Automatic PRs', text: 'New personal records get flagged as you log them.' },
  { icon: faChartLine, title: 'Progress at a glance', text: 'Weekly volume, training frequency and your top lifts.' },
  { icon: faUserGroup, title: 'Friends and leaderboards', text: 'Add friends and see who’s putting in the work.' },
];

const PREVIEW_SETS = [
  { weight: 225, rep: 5, rpe: 7 },
  { weight: 225, rep: 5, rpe: 8 },
  { weight: 225, rep: 5, rpe: 9 },
];
const PREVIEW_BARS = [38, 52, 45, 60, 57, 71, 66, 84];

// Only same-origin paths, so ?callbackUrl can't redirect off-site
function safeCallbackUrl(url) {
  if (typeof url !== 'string') return '/';
  try {
    const target = new URL(url, window.location.origin);
    if (target.origin !== window.location.origin || target.pathname === '/login') return '/';
    return `${target.pathname}${target.search}${target.hash}`;
  } catch (error) {
    return '/';
  }
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

// Decorative preview of the app beside the sign-in copy
function Preview() {
  return (
    <div className="tk-login-preview" aria-hidden="true">
      <div className="tk-card tk-lift-card tk-preview-card">
        <div className="tk-preview-day">Today</div>
        <div className="tk-lift-card-header">
          <div className="tk-lift-card-title">
            <div className="tk-lift-name">Bench Press</div>
            <div className="tk-lift-summary">3 × 5 · 225 lb</div>
          </div>
          <span className="tk-pr-badge"><FontAwesomeIcon icon={faTrophy} /> PR</span>
        </div>
        <ol className="tk-set-list">
          {PREVIEW_SETS.map((set, i) => (
            <li key={i} className="tk-set-item">
              <span className="tk-set-index">{i + 1}</span>
              <span className="tk-set-weight">{set.weight} lb</span>
              <span className="tk-set-reps">× {set.rep}</span>
              <span className="tk-set-rpe">RPE {set.rpe}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="tk-card tk-preview-chart">
        <div className="tk-preview-chart-head">
          <span>Weekly volume</span>
          <strong>+12%</strong>
        </div>
        <div className="tk-preview-bars">
          {PREVIEW_BARS.map((height, i) => (
            <span key={i} style={{ height: `${height}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

const Login = () => {
  const { status } = useSession();
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);
  const { error, callbackUrl } = router.query;

  useEffect(() => {
    if (status === 'authenticated') router.replace(safeCallbackUrl(callbackUrl));
  }, [status, callbackUrl, router]);

  // Re-enable the button if the user comes back from Google with the back button
  useEffect(() => {
    const onPageShow = (e) => { if (e.persisted) setSigningIn(false); };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  const errorMessage = typeof error === 'string' && !SILENT_ERRORS.includes(error)
    ? ERROR_MESSAGES[error] || DEFAULT_ERROR
    : null;

  const onSignIn = () => {
    setSigningIn(true);
    signIn('google', { callbackUrl: safeCallbackUrl(callbackUrl) });
  };

  return (
    <div className="tk-login">
      <Head>
        <title>Sign in · trackkilo</title>
      </Head>
      <div className="tk-login-backdrop" aria-hidden="true" />

      {/* Flat children so the grid can place the preview beside the copy on desktop
          and between the copy and the button on phones */}
      <main className="tk-login-inner">
        <div className="tk-login-brand">
          <Brand className="tk-brand-lg" />
        </div>
        <h1 className="tk-login-title">
          Log every lift.
          <span>Watch the numbers climb.</span>
        </h1>
        <p className="tk-login-lead">
          A simple training log. Pick a lift and your sets, reps and weights fill in from last time.
        </p>

        <ul className="tk-login-features">
          {FEATURES.map((feature) => (
            <li key={feature.title} className="tk-login-feature">
              <span className="tk-login-feature-icon"><FontAwesomeIcon icon={feature.icon} /></span>
              <div>
                <strong>{feature.title}</strong>
                <span>{feature.text}</span>
              </div>
            </li>
          ))}
        </ul>

        <Preview />

        <div className="tk-login-action">
          {errorMessage && <div className="tk-alert" role="alert">{errorMessage}</div>}
          <button type="button" className="tk-google-btn" onClick={onSignIn} disabled={signingIn}>
            {signingIn
              ? <span className="spinner-border spinner-border-sm" role="status" aria-label="Signing in" />
              : <GoogleLogo />}
            <span>Continue with Google</span>
          </button>
          <p className="tk-login-fine">No new password. Just your Google account.</p>
        </div>
      </main>
    </div>
  );
};

Login.public = true;

export default Login;
