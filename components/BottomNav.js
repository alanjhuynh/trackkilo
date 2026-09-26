import Link from 'next/link';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { useLiftForm } from './LiftFormProvider';
import { NAV_ITEMS } from './Sidebar';

// Mobile tab bar with the "log a lift" button in the middle
function BottomNav() {
  const { pathname } = useRouter();
  const { openNew } = useLiftForm();
  const [first, second] = NAV_ITEMS;

  const tab = (item) => {
    const active = pathname === item.href;
    return (
      <Link
        href={item.href}
        className={`tk-tab${active ? ' active' : ''}`}
        aria-current={active ? 'page' : undefined}
      >
        <FontAwesomeIcon icon={item.icon} />
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <nav className="tk-bottom-nav" aria-label="Main">
      {tab(first)}
      <button type="button" className="tk-fab" onClick={() => openNew()} aria-label="Log a lift">
        <FontAwesomeIcon icon={faPlus} />
      </button>
      {tab(second)}
    </nav>
  );
}

export default BottomNav;
