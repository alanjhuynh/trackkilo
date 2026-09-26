import Link from 'next/link';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartLine, faGear, faHouse, faPlus, faTrophy, faUserGroup,
} from '@fortawesome/free-solid-svg-icons';
import { useLiftForm } from './LiftFormProvider';
import useFriends from '../lib/useFriends';

export const NAV_ITEMS = {
  log: { href: '/', label: 'Log', icon: faHouse },
  stats: { href: '/stats', label: 'Stats', icon: faChartLine },
  leaderboard: { href: '/leaderboard', label: 'Leaderboard', short: 'Ranks', icon: faTrophy },
  friends: { href: '/friends', label: 'Friends', icon: faUserGroup },
  settings: { href: '/settings', label: 'Settings', icon: faGear },
};

// Count of friend requests waiting on the user
export function useRequestCount() {
  const { incoming } = useFriends();
  return incoming.length;
}

export function RequestBadge({ count }) {
  if (!count) return null;
  return (
    <span className="tk-badge" aria-label={`${count} friend request${count === 1 ? '' : 's'}`}>
      {count > 9 ? '9+' : count}
    </span>
  );
}

// Desktop navigation (the bottom nav takes over on small screens)
function Sidebar() {
  const { pathname } = useRouter();
  const { openNew } = useLiftForm();
  const requests = useRequestCount();

  return (
    <nav className="tk-sidebar" aria-label="Main">
      <button type="button" className="tk-btn tk-btn-primary tk-btn-block" onClick={() => openNew()}>
        <FontAwesomeIcon icon={faPlus} /> Log a workout
      </button>
      <ul className="tk-nav-list">
        {Object.values(NAV_ITEMS).map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`tk-nav-link${active ? ' active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <FontAwesomeIcon icon={item.icon} fixedWidth />
                {item.label}
                {item === NAV_ITEMS.friends && <RequestBadge count={requests} />}
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="tk-sidebar-tip">
        Press <kbd>N</kbd> to log a workout
      </p>
    </nav>
  );
}

export default Sidebar;
