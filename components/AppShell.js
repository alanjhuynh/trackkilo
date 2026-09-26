import { useRef } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Navbar, { Brand } from './Navbar';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { LiftProvider } from './LiftProvider';
import { LiftFormProvider } from './LiftFormProvider';

// Layout and data providers for every signed-in page
export default function AppShell({ children }) {
  const router = useRouter();
  const redirecting = useRef(false);
  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      if (redirecting.current) return;
      redirecting.current = true;
      router.replace({ pathname: '/login', query: { callbackUrl: router.asPath } });
    },
  });

  if (status !== 'authenticated') {
    return (
      <div className="tk-splash">
        <Brand className="tk-brand-lg" />
        <span className="spinner-border spinner-border-sm" role="status" aria-label="Loading" />
      </div>
    );
  }

  return (
    <LiftProvider>
      <LiftFormProvider>
        <Navbar />
        <div className="tk-shell">
          <Sidebar />
          <main className="tk-main">{children}</main>
        </div>
        <BottomNav />
      </LiftFormProvider>
    </LiftProvider>
  );
}
