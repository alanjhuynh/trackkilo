import '../css/form.css';
import 'bootstrap/dist/css/bootstrap.css';
import Head from 'next/head';
import Link from 'next/link';
import {SessionProvider} from 'next-auth/react'
import { signOut } from 'next-auth/react';

function App({ Component, pageProps, session }) {
  return (
    <SessionProvider session={session}>
      <Head>
        <title>track kilo</title>
      </Head>

      <div className="d-flex justify-content-between mx-2">
        <h1>track kilo</h1>
        <div>
          <Link href="/" className="mx-2">Home</Link>
          <Link href="/new">Add Lift</Link>
          <a onClick={() => signOut()}>Sign Out</a>
        </div>
      </div>

      <div className="grid wrapper">
        <Component {...pageProps} />
      </div>
    </SessionProvider>
  )
} 

export default App
