import 'bootstrap/dist/css/bootstrap.css';
import '../css/global.css';
import Head from 'next/head';
import Link from 'next/link';
import {SessionProvider} from 'next-auth/react'
import { signOut } from 'next-auth/react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { useEffect } from "react";

function App({ Component, pageProps, session }) {
  useEffect(() => {
    import("bootstrap/dist/js/bootstrap");
  }, []);

  return (
    <SessionProvider session={session}>
      

      <Navbar></Navbar>
      <div class="main row mx-0">
        <div class="col-2 p-0">
          <Sidebar></Sidebar>
        </div>
        <div class="col-10 p-0 bg-dark-2">
          <Component {...pageProps} />
        </div>
      </div>
    
    </SessionProvider>
  )
} 

export default App
