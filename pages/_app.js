import 'bootstrap/dist/css/bootstrap.css';
import '../css/global.css';
import Head from 'next/head';
import Link from 'next/link';
import {SessionProvider} from 'next-auth/react'
import { signOut } from 'next-auth/react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { useEffect } from "react";
const { library } = require('@fortawesome/fontawesome-svg-core'); // require fixes hydration error
import { faPenToSquare, faFloppyDisk, faCalendar } from '@fortawesome/free-regular-svg-icons';
import { faX, faHouse, faChartLine, faDumbbell, faRocket } from '@fortawesome/free-solid-svg-icons';

library.add(faPenToSquare, faFloppyDisk, faCalendar, faX, faHouse, faChartLine, faDumbbell, faRocket);

function App({ Component, pageProps, session }) {
  useEffect(() => {
    import("bootstrap/dist/js/bootstrap");
  }, []);

  return (
    <SessionProvider session={session}>
      
      {/* TODO: move inside index */}
      <Navbar></Navbar>
      <div className="main row mx-0">
        <div className="d-none d-sm-block col-sm-2 p-0">
          <Sidebar></Sidebar>
        </div>
        <div className="col col-sm-10 p-0 bg-dark-2">
          <Component {...pageProps} />
        </div>
      </div>
    
    </SessionProvider>
  )
} 

export default App
