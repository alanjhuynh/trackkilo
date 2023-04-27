import 'bootstrap/dist/css/bootstrap.css';
import '../css/global.css';
import Head from 'next/head';
import Link from 'next/link';
import {SessionProvider} from 'next-auth/react'
import { LiftProvider } from '../components/LiftProvider';
import { signOut } from 'next-auth/react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { useEffect } from "react";
const { library } = require('@fortawesome/fontawesome-svg-core'); // require fixes hydration error
import { faPenToSquare, faFloppyDisk, faCalendar } from '@fortawesome/free-regular-svg-icons';
import { faX, faHouse, faChartLine, faDumbbell, faRocket, faExpand } from '@fortawesome/free-solid-svg-icons';

library.add(faPenToSquare, faFloppyDisk, faCalendar, faX, faHouse, faChartLine, faDumbbell, faRocket, faExpand);

function App({ Component, pageProps, session }) {
  useEffect(() => {
    import("bootstrap/dist/js/bootstrap");
  }, []);

  return (
    <SessionProvider session={session}>
      <Head>
        <title>trackkilo</title>
        <meta name="google" content="notranslate"></meta>
      </Head>
      
      <Navbar></Navbar>
      <div id="main" className="main row mx-0 bg-dark-2 overflow-auto">
        <LiftProvider>
          <Component {...pageProps} />
        </LiftProvider>
      </div>
    
    </SessionProvider>
  )
} 

export default App
