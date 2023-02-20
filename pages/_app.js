import 'bootstrap/dist/css/bootstrap.css';
import '../css/global.css';
import Head from 'next/head';
import Link from 'next/link';
import {SessionProvider} from 'next-auth/react'
import { signOut } from 'next-auth/react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { useEffect } from "react";
import { library } from '@fortawesome/fontawesome-svg-core';
import { faPenToSquare, faFloppyDisk } from '@fortawesome/free-regular-svg-icons';
import { faX } from '@fortawesome/free-solid-svg-icons';

library.add(faPenToSquare, faFloppyDisk, faX);

function App({ Component, pageProps, session }) {
  useEffect(() => {
    import("bootstrap/dist/js/bootstrap");
  }, []);

  return (
    <SessionProvider session={session}>
      

      <Navbar></Navbar>
      <div className="main row mx-0">
        <div className="col-2 p-0">
          <Sidebar></Sidebar>
        </div>
        <div className="col-10 p-0 bg-dark-2">
          <Component {...pageProps} />
        </div>
      </div>
    
    </SessionProvider>
  )
} 

export default App
