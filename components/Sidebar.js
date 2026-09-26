import Link from 'next/link';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine, faHouse, faPlus } from '@fortawesome/free-solid-svg-icons';
import { useLiftForm } from './LiftFormProvider';

export const NAV_ITEMS = [
  { href: '/', label: 'Log', icon: faHouse },
  { href: '/stats', label: 'Stats', icon: faChartLine },
];

// Desktop navigation (the bottom nav takes over on small screens)
function Sidebar() {
  const { pathname } = useRouter();
  const { openNew } = useLiftForm();

  return (
    <nav className="tk-sidebar" aria-label="Main">
      <button type="button" className="tk-btn tk-btn-primary tk-btn-block" onClick={() => openNew()}>
        <FontAwesomeIcon icon={faPlus} /> Log a lift
      </button>
      <ul className="tk-nav-list">
        {NAV_ITEMS.map((item) => {
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
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="tk-sidebar-tip">
        Press <kbd>N</kbd> to log a lift
      </p>
    </nav>
  );
}

export default Sidebar;
