import Link from 'next/link';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { useLiftForm } from './LiftFormProvider';
import { NAV_ITEMS, RequestBadge, useRequestCount } from './Sidebar';

// Mobile tab bar with the "log a workout" button in the middle. Settings lives in the account menu.
function BottomNav() {
  const { pathname } = useRouter();
  const { openNew } = useLiftForm();
  const requests = useRequestCount();

  const tab = (item, badge = 0) => {
    const active = pathname === item.href;
    return (
      <Link
        href={item.href}
        className={`tk-tab${active ? ' active' : ''}`}
        aria-current={active ? 'page' : undefined}
      >
        <span className="tk-tab-icon">
          <FontAwesomeIcon icon={item.icon} />
          <RequestBadge count={badge} />
        </span>
        <span>{item.short || item.label}</span>
      </Link>
    );
  };

  return (
    <nav className="tk-bottom-nav" aria-label="Main">
      {tab(NAV_ITEMS.log)}
      {tab(NAV_ITEMS.stats)}
      <button type="button" className="tk-fab" onClick={() => openNew()} aria-label="Log a workout">
        <FontAwesomeIcon icon={faPlus} />
      </button>
      {tab(NAV_ITEMS.leaderboard)}
      {tab(NAV_ITEMS.friends, requests)}
    </nav>
  );
}

export default BottomNav;
