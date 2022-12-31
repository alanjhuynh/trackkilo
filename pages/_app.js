import '../css/style.css';
import '../css/form.css';
import 'bootstrap/dist/css/bootstrap.css';
import Head from 'next/head';
import Link from 'next/link';

function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>track kilo</title>
      </Head>

      <div className="d-flex justify-content-between mx-2">
        <h1>track kilo</h1>
        <div>
          <Link href="/" className="mx-2">Home</Link>
          <Link href="/new">Add Lift</Link>
        </div>
      </div>

      <div className="grid wrapper">
        <Component {...pageProps} />
      </div>
    </>
  )
} 

export default App
