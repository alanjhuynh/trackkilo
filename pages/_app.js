import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-svg-core/styles.css';
import '../css/global.css';
import Head from 'next/head';
import { SessionProvider } from 'next-auth/react';
import { config } from '@fortawesome/fontawesome-svg-core';
import { Toaster } from 'react-hot-toast';
import AppShell from '../components/AppShell';

// Icon CSS is imported above; don't let Font Awesome inject it at runtime (avoids huge icons on first paint)
config.autoAddCss = false;

const toastOptions = {
  style: {
    background: '#262b31',
    color: '#eef1f4',
    border: '1px solid #353c45',
    borderRadius: '12px',
    fontSize: '15px',
  },
  success: { iconTheme: { primary: '#46a778', secondary: '#0e1013' } },
  error: { iconTheme: { primary: '#e5484d', secondary: '#0e1013' } },
};

// Pages set `Page.public = true` to render without sign-in and the app shell
function App({ Component, pageProps: { session, ...pageProps } }) {
  const page = <Component {...pageProps} />;

  return (
    <SessionProvider session={session}>
      <Head>
        <title>trackkilo</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="google" content="notranslate" />
      </Head>
      {Component.public ? page : <AppShell>{page}</AppShell>}
      <Toaster
        position="top-center"
        toastOptions={toastOptions}
        containerStyle={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      />
    </SessionProvider>
  );
}

export default App;
